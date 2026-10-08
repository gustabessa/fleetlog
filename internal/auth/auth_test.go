package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func TestOriginProtection(t *testing.T) {
	s := &Service{Origin: "https://fleetlog.test"}
	for _, origin := range []string{"", "https://attacker.test", "https://fleetlog.test.evil"} {
		req := httptest.NewRequest("POST", "/api/auth/login", strings.NewReader(`{}`))
		req.Header.Set("Origin", origin)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		s.write(func(http.ResponseWriter, *http.Request) { t.Fatal("cross-origin request accepted") })(w, req)
		if w.Code != 403 {
			t.Fatalf("status %d", w.Code)
		}
	}
}

func TestAuthIntegration(t *testing.T) {
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Skip("set TEST_DATABASE_URL to a disposable PostgreSQL database")
	}
	ctx := context.Background()
	admin, e := pgxpool.New(ctx, base)
	if e != nil {
		t.Fatal(e)
	}
	defer admin.Close()
	deadline := time.Now().Add(15 * time.Second)
	for admin.Ping(ctx) != nil {
		if time.Now().After(deadline) {
			t.Fatal("test database not ready")
		}
		time.Sleep(100 * time.Millisecond)
	}
	schema := fmt.Sprintf("auth_test_%d", time.Now().UnixNano())
	if _, e = admin.Exec(ctx, "CREATE SCHEMA "+schema); e != nil {
		t.Fatal(e)
	}
	defer admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE")
	u, e := url.Parse(base)
	if e != nil {
		t.Fatal(e)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	dsn := u.String()
	if s, e := Open(ctx, dsn, "https://fleetlog.test", "", "short"); e == nil {
		s.DB.Close()
		t.Fatal("weak bootstrap accepted")
	}
	s, e := Open(ctx, dsn, "https://fleetlog.test", "tester", "test-password-12345")
	if e != nil {
		t.Fatal(e)
	}
	defer s.DB.Close()
	s2, e := Open(ctx, dsn, "https://fleetlog.test", "ignored", "ignored")
	if e != nil {
		t.Fatal(e)
	}
	s2.DB.Close()
	var count int
	var hash string
	if e = s.DB.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&count); e != nil || count != 1 {
		t.Fatalf("bootstrap count %d err %v", count, e)
	}
	if e = s.DB.QueryRow(ctx, `SELECT count(*) FROM garage_members m JOIN users u ON u.id=m.user_id WHERE u.username='tester'`).Scan(&count); e != nil || count != 1 {
		t.Fatalf("bootstrap garage membership count %d err %v", count, e)
	}
	if e = s.DB.QueryRow(ctx, `SELECT password_hash FROM users WHERE username='tester'`).Scan(&hash); e != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte("test-password-12345")) != nil {
		t.Fatal("invalid password hash")
	}
	mux := http.NewServeMux()
	s.Routes(mux)
	request := func(method, path, body string, cookie *http.Cookie) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Origin", s.Origin)
		req.Header.Set("Content-Type", "application/json")
		if cookie != nil {
			req.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		return w
	}
	if w := request("GET", "/api/auth/me", "", nil); w.Code != 401 {
		t.Fatal("anonymous access accepted")
	}
	if w := request("POST", "/api/auth/login", `{"username":"tester","password":"wrong"}`, nil); w.Code != 401 {
		t.Fatal("invalid credentials accepted")
	}
	body := `{"username":"tester","password":"test-password-12345"}`
	login := request("POST", "/api/auth/login", body, nil)
	if login.Code != 200 {
		t.Fatalf("login %d %s", login.Code, login.Body.String())
	}
	cookie := login.Result().Cookies()[0]
	if !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteStrictMode {
		t.Fatal("insecure session cookie")
	}
	var stored string
	if e = s.DB.QueryRow(ctx, `SELECT token_hash FROM sessions`).Scan(&stored); e != nil || stored == cookie.Value || stored != digest(cookie.Value) {
		t.Fatal("session token not hashed")
	}
	me := request("GET", "/api/auth/me", "", cookie)
	if me.Code != 200 {
		t.Fatal("session not authenticated")
	}
	var user map[string]any
	json.Unmarshal(me.Body.Bytes(), &user)
	if user["username"] != "tester" || user["currency"] != "BRL" {
		t.Fatal("bad profile")
	}
	if me.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("private response cacheable")
	}
	rotated := request("POST", "/api/auth/login", body, cookie)
	if rotated.Code != 200 {
		t.Fatal("session rotation failed")
	}
	if request("GET", "/api/auth/me", "", cookie).Code != 401 {
		t.Fatal("old session still valid")
	}
	cookie = rotated.Result().Cookies()[0]
	if request("POST", "/api/auth/logout", `{}`, cookie).Code != 200 {
		t.Fatal("logout failed")
	}
	if request("GET", "/api/auth/me", "", cookie).Code != 401 {
		t.Fatal("logout did not revoke session")
	}
	expired := request("POST", "/api/auth/login", body, nil).Result().Cookies()[0]
	if _, e = s.DB.Exec(ctx, `UPDATE sessions SET expires_at=now()-interval '1 second'`); e != nil {
		t.Fatal(e)
	}
	if request("GET", "/api/auth/me", "", expired).Code != 401 {
		t.Fatal("expired session accepted")
	}
	s.mu.Lock()
	s.attempts = 20
	s.window = time.Now()
	s.mu.Unlock()
	if request("POST", "/api/auth/login", body, nil).Code != 429 {
		t.Fatal("rate limit failed")
	}
	// Same subject from different issuers must remain distinct.
	if _, e = s.DB.Exec(ctx, `INSERT INTO external_identities(issuer,subject,user_id) SELECT 'https://issuer-a','same',id FROM users; INSERT INTO external_identities(issuer,subject,user_id) SELECT 'https://issuer-b','same',id FROM users`); e != nil {
		t.Fatal(e)
	}
}
