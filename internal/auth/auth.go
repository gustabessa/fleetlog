package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"fleetlog/internal/database"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	OIDC          *OIDCService
	LocalDisabled bool
	oidcAttempts  int
	oidcWindow    time.Time
	DB            *pgxpool.Pool
	Origin        string
	Secure        bool
	mu            sync.Mutex
	attempts      int
	window        time.Time
}

func Open(ctx context.Context, dsn, publicURL, username, password string) (*Service, error) {
	u, err := url.Parse(publicURL)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.Path != "" && u.Path != "/" || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
		return nil, errors.New("PUBLIC_URL must be an HTTP(S) origin")
	}
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, errors.New("invalid database configuration")
	}
	config.MaxConns = 4
	db, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, errors.New("invalid database configuration")
	}
	var tx pgx.Tx
	fail := func(e error) (*Service, error) {
		if tx != nil {
			tx.Rollback(ctx)
		}
		db.Close()
		return nil, e
	}
	if err = db.Ping(ctx); err != nil {
		return fail(errors.New("database connection failed"))
	}
	// Transactional migration and bootstrap serialize across concurrent replicas.
	tx, err = db.Begin(ctx)
	if err != nil {
		return fail(err)
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(73194201)`); err != nil {
		return fail(err)
	}
	if err = database.Migrate(ctx, tx); err != nil {
		return fail(err)
	}
	var count int
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&count); err != nil {
		return fail(err)
	}
	if count == 0 {
		username = strings.TrimSpace(username)
		if username == "" || len(username) > 64 || len(password) < 12 || len(password) > 72 {
			return fail(errors.New("first startup requires BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD (12 to 72 bytes)"))
		}
		hash, e := bcrypt.GenerateFromPassword([]byte(password), 12)
		if e != nil {
			return fail(e)
		}
		var userID int64
		if err = tx.QueryRow(ctx, `INSERT INTO users(username,password_hash) VALUES($1,$2) RETURNING id`, username, string(hash)).Scan(&userID); err != nil {
			return fail(err)
		}
		if err = database.CreateInitialGarage(ctx, tx, userID); err != nil {
			return fail(err)
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return fail(err)
	}
	return &Service{DB: db, Origin: u.Scheme + "://" + u.Host, Secure: u.Scheme == "https"}, nil
}

func (s *Service) Routes(mux *http.ServeMux) {
	s.oidcRoutes(mux)
	mux.HandleFunc("POST /api/auth/login", s.write(s.login))
	mux.HandleFunc("POST /api/auth/logout", s.write(s.logout))
	mux.HandleFunc("GET /api/auth/me", s.RequireUser(s.me))
	mux.HandleFunc("PUT /api/profile", s.RequireWrite(s.updateProfile))
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if s.DB.Ping(ctx) != nil {
			reply(w, 503, map[string]string{"status": "unavailable"})
			return
		}
		reply(w, 200, map[string]string{"status": "ok"})
	})
}
func (s *Service) write(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") != s.Origin || r.Header.Get("Sec-Fetch-Site") == "cross-site" {
			reply(w, 403, map[string]string{"error": "origin not allowed"})
			return
		}
		if strings.Split(r.Header.Get("Content-Type"), ";")[0] != "application/json" {
			reply(w, 415, map[string]string{"error": "JSON required"})
			return
		}
		next(w, r)
	}
}
func (s *Service) login(w http.ResponseWriter, r *http.Request) {
	if s.LocalDisabled {
		reply(w, 403, map[string]string{"error": "local login disabled"})
		return
	}
	s.mu.Lock()
	if time.Since(s.window) >= time.Minute {
		s.attempts = 0
		s.window = time.Now()
	}
	s.attempts++
	blocked := s.attempts > 20
	s.mu.Unlock()
	if blocked {
		w.Header().Set("Retry-After", "60")
		reply(w, 429, map[string]string{"error": "too many attempts"})
		return
	}

	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if d.Decode(&input) != nil || d.Decode(new(any)) != io.EOF || len(input.Password) > 72 || len(input.Username) > 64 {
		reply(w, 400, map[string]string{"error": "invalid request"})
		return
	}
	var id int64
	var hash string
	err := s.DB.QueryRow(r.Context(), `SELECT id,password_hash FROM users WHERE username=$1 AND password_hash IS NOT NULL`, strings.TrimSpace(input.Username)).Scan(&id, &hash)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		reply(w, 503, map[string]string{"error": "login unavailable"})
		return
	}
	if err != nil {
		hash = dummyHash
	}
	check := bcrypt.CompareHashAndPassword([]byte(hash), []byte(input.Password))
	if err != nil || check != nil {
		reply(w, 401, map[string]string{"error": "invalid credentials"})
		return
	}
	token := make([]byte, 32)
	if _, err = rand.Read(token); err != nil {
		reply(w, 500, map[string]string{"error": "login failed"})
		return
	}
	raw := hex.EncodeToString(token)
	expiry := time.Now().Add(24 * time.Hour)
	tx, err := s.DB.Begin(r.Context())
	if err != nil {
		reply(w, 503, map[string]string{"error": "login unavailable"})
		return
	}
	defer tx.Rollback(r.Context())
	if _, err = tx.Exec(r.Context(), `DELETE FROM sessions WHERE expires_at <= now()`); err != nil {
		reply(w, 503, map[string]string{"error": "login unavailable"})
		return
	}
	if old, e := r.Cookie("fleetlog_session"); e == nil {
		if _, err = tx.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash=$1`, digest(old.Value)); err != nil {
			reply(w, 503, map[string]string{"error": "login unavailable"})
			return
		}
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)`, digest(raw), id, expiry); err != nil {
		reply(w, 503, map[string]string{"error": "login unavailable"})
		return
	}
	if tx.Commit(r.Context()) != nil {
		reply(w, 503, map[string]string{"error": "login unavailable"})
		return
	}
	s.mu.Lock()
	if s.attempts > 0 {
		s.attempts--
	}
	s.mu.Unlock()
	s.cookie(w, raw, 86400)
	s.RequireUser(s.me)(w, requestWithCookie(r, raw))
}
func requestWithCookie(r *http.Request, token string) *http.Request {
	c := r.Clone(r.Context())
	c.Header.Del("Cookie")
	c.AddCookie(&http.Cookie{Name: "fleetlog_session", Value: token})
	return c
}
func (s *Service) me(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())
	reply(w, 200, user)
}
func (s *Service) logout(w http.ResponseWriter, r *http.Request) {
	if c, e := r.Cookie("fleetlog_session"); e == nil {
		if _, e = s.DB.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash=$1`, digest(c.Value)); e != nil {
			reply(w, 503, map[string]string{"error": "logout unavailable"})
			return
		}
	}
	s.cookie(w, "", -1)
	reply(w, 200, map[string]string{"status": "ok"})
}
func (s *Service) cookie(w http.ResponseWriter, value string, age int) {
	http.SetCookie(w, &http.Cookie{Name: "fleetlog_session", Value: value, Path: "/", HttpOnly: true, Secure: s.Secure, SameSite: http.SameSiteStrictMode, MaxAge: age})
}
func digest(value string) string { h := sha256.Sum256([]byte(value)); return fmt.Sprintf("%x", h) }
func reply(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}

var dummyHash = func() string {
	h, _ := bcrypt.GenerateFromPassword([]byte("unusable-dummy-password"), 12)
	return string(h)
}()
