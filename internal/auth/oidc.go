package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fleetlog/internal/apiutil"
	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/jackc/pgx/v5"
	"golang.org/x/oauth2"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type OIDCConfig struct {
	Issuer, DiscoveryURL, ClientID, ClientSecret, CallbackPath string
	Scopes                                                     []string
	LocalEnabled                                               bool
}
type OIDCService struct {
	OAuth                oauth2.Config
	Verifier             *oidc.IDTokenVerifier
	Issuer, CallbackPath string
	Client               *http.Client
}

func validOIDCURL(value string) bool {
	u, err := url.Parse(value)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return false
	}
	if u.Scheme == "https" {
		return true
	}
	ip := net.ParseIP(u.Hostname())
	return u.Scheme == "http" && (u.Hostname() == "localhost" || ip != nil && ip.IsLoopback())
}

type discoveryTransport struct {
	base               http.RoundTripper
	standard, override string
}

func (t discoveryTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	if t.override != "" && r.URL.String() == t.standard {
		r = r.Clone(r.Context())
		r.URL, _ = url.Parse(t.override)
		r.Host = r.URL.Host
	}
	return t.base.RoundTrip(r)
}
func (s *Service) ConfigureOIDC(ctx context.Context, cfg OIDCConfig) error {
	if cfg.Issuer == "" {
		if cfg.ClientID != "" || cfg.ClientSecret != "" || cfg.DiscoveryURL != "" {
			return errors.New("OIDC issuer required with client configuration")
		}
		if !cfg.LocalEnabled {
			return errors.New("local login cannot be disabled without OIDC")
		}
		s.LocalDisabled = false
		return nil
	}
	if !validOIDCURL(cfg.Issuer) || cfg.ClientID == "" || cfg.DiscoveryURL != "" && !validOIDCURL(cfg.DiscoveryURL) {
		return errors.New("valid OIDC issuer/discovery and client ID required")
	}
	if cfg.CallbackPath == "" {
		cfg.CallbackPath = "/api/auth/oidc/callback"
	}
	p, err := url.Parse(cfg.CallbackPath)
	if err != nil || p.RawQuery != "" || p.Fragment != "" || p.RawPath != "" || p.Path != cfg.CallbackPath || !(cfg.CallbackPath == "/api/auth/oidc/callback" || strings.HasPrefix(cfg.CallbackPath, "/api/auth/oidc/callback/")) || strings.Contains(cfg.CallbackPath, "..") {
		return errors.New("invalid OIDC callback path")
	}
	client := &http.Client{Timeout: 10 * time.Second, Transport: discoveryTransport{http.DefaultTransport, strings.TrimSuffix(cfg.Issuer, "/") + "/.well-known/openid-configuration", cfg.DiscoveryURL}, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	ctx = oidc.ClientContext(ctx, client)
	provider, err := oidc.NewProvider(ctx, cfg.Issuer)
	if err != nil {
		return errors.New("OIDC discovery failed")
	}
	var discovery struct {
		JWKSURI string `json:"jwks_uri"`
	}
	if provider.Claims(&discovery) != nil || !validOIDCURL(discovery.JWKSURI) {
		return errors.New("invalid OIDC signing key endpoint")
	}
	endpoint := provider.Endpoint()
	if !validOIDCURL(endpoint.AuthURL) || !validOIDCURL(endpoint.TokenURL) {
		return errors.New("invalid OIDC provider endpoints")
	}
	scopes := []string{oidc.ScopeOpenID}
	for _, scope := range cfg.Scopes {
		if scope != "" && scope != oidc.ScopeOpenID {
			scopes = append(scopes, scope)
		}
	}
	if cfg.ClientSecret == "" {
		endpoint.AuthStyle = oauth2.AuthStyleInParams
	}
	s.OIDC = &OIDCService{OAuth: oauth2.Config{ClientID: cfg.ClientID, ClientSecret: cfg.ClientSecret, Endpoint: endpoint, RedirectURL: s.Origin + cfg.CallbackPath, Scopes: scopes}, Verifier: provider.VerifierContext(ctx, &oidc.Config{ClientID: cfg.ClientID}), Issuer: cfg.Issuer, CallbackPath: cfg.CallbackPath, Client: client}
	s.LocalDisabled = !cfg.LocalEnabled
	return nil
}
func (s *Service) ConfigureOIDCFromEnv(ctx context.Context) error {
	local := true
	if value := os.Getenv("AUTH_LOCAL_ENABLED"); value != "" {
		parsed, e := strconv.ParseBool(value)
		if e != nil {
			return errors.New("invalid AUTH_LOCAL_ENABLED")
		}
		local = parsed
	}
	scopes := strings.Fields(os.Getenv("OIDC_SCOPES"))
	if len(scopes) == 0 {
		scopes = []string{"openid", "profile"}
	}
	return s.ConfigureOIDC(ctx, OIDCConfig{Issuer: os.Getenv("OIDC_ISSUER"), DiscoveryURL: os.Getenv("OIDC_DISCOVERY_URL"), ClientID: os.Getenv("OIDC_CLIENT_ID"), ClientSecret: os.Getenv("OIDC_CLIENT_SECRET"), CallbackPath: os.Getenv("OIDC_CALLBACK_PATH"), Scopes: scopes, LocalEnabled: local})
}
func (s *Service) oidcRoutes(m *http.ServeMux) {
	m.HandleFunc("GET /api/auth/options", func(w http.ResponseWriter, r *http.Request) {
		reply(w, 200, map[string]bool{"oidcEnabled": s.OIDC != nil, "localEnabled": !s.LocalDisabled})
	})
	m.HandleFunc("GET /api/auth/oidc/status", s.RequireUser(func(w http.ResponseWriter, r *http.Request) {
		if s.OIDC == nil {
			reply(w, 200, map[string]bool{"enabled": false, "linked": false})
			return
		}
		user, _ := UserFromContext(r.Context())
		var linked bool
		if err := s.DB.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM external_identities WHERE user_id=$1 AND issuer=$2)`, user.ID, s.OIDC.Issuer).Scan(&linked); err != nil {
			reply(w, 503, map[string]string{"error": "identity unavailable"})
			return
		}
		reply(w, 200, map[string]any{"enabled": true, "linked": linked, "issuer": s.OIDC.Issuer})
	}))
	m.HandleFunc("POST /api/auth/oidc/start", s.write(s.startOIDC))
	path := "/api/auth/oidc/callback"
	if s.OIDC != nil {
		path = s.OIDC.CallbackPath
	}
	m.HandleFunc("GET "+path, s.callbackOIDC)
}
func randomToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	return hex.EncodeToString(b), err
}
func (s *Service) flowCookie(w http.ResponseWriter, value string, age int) {
	http.SetCookie(w, &http.Cookie{Name: "fleetlog_oidc", Value: value, Path: s.OIDC.CallbackPath, HttpOnly: true, Secure: s.Secure, SameSite: http.SameSiteLaxMode, MaxAge: age})
}
func (s *Service) startOIDC(w http.ResponseWriter, r *http.Request) {
	if s.OIDC == nil {
		reply(w, 503, map[string]string{"error": "OIDC not configured"})
		return
	}
	var input struct {
		Link bool `json:"link"`
	}
	if !apiutil.Decode(w, r, &input) {
		return
	}
	if input.Link {
		s.RequireUser(func(w http.ResponseWriter, r *http.Request) { s.beginOIDC(w, r, true) })(w, r)
	} else {
		s.beginOIDC(w, r, false)
	}
}
func (s *Service) beginOIDC(w http.ResponseWriter, r *http.Request, link bool) {
	s.mu.Lock()
	if time.Since(s.oidcWindow) >= time.Minute {
		s.oidcWindow = time.Now()
		s.oidcAttempts = 0
	}
	s.oidcAttempts++
	limited := s.oidcAttempts > 30
	s.mu.Unlock()
	if limited {
		reply(w, 429, map[string]string{"error": "too many OIDC attempts"})
		return
	}

	state, e := randomToken()
	if e != nil {
		reply(w, 503, map[string]string{"error": "OIDC unavailable"})
		return
	}
	browser, e := randomToken()
	if e != nil {
		reply(w, 503, map[string]string{"error": "OIDC unavailable"})
		return
	}
	nonce, e := randomToken()
	if e != nil {
		reply(w, 503, map[string]string{"error": "OIDC unavailable"})
		return
	}
	verifier := oauth2.GenerateVerifier()
	var userID *int64
	var sessionHash *string
	if old, e := r.Cookie("fleetlog_session"); e == nil {
		hash := digest(old.Value)
		sessionHash = &hash
	}
	if link {
		user, _ := UserFromContext(r.Context())
		userID = &user.ID
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		reply(w, 503, map[string]string{"error": "OIDC unavailable"})
		return
	}
	defer tx.Rollback(r.Context())
	if _, e = tx.Exec(r.Context(), `DELETE FROM oidc_flows WHERE expires_at<=now()`); e != nil {
		reply(w, 503, map[string]string{"error": "OIDC unavailable"})
		return
	}
	if old, e := r.Cookie("fleetlog_oidc"); e == nil {
		if _, e = tx.Exec(r.Context(), `DELETE FROM oidc_flows WHERE browser_hash=$1`, digest(old.Value)); e != nil {
			reply(w, 503, map[string]string{"error": "OIDC unavailable"})
			return
		}
	}
	if _, e = tx.Exec(r.Context(), `INSERT INTO oidc_flows(state_hash,browser_hash,nonce,verifier,link_user_id,session_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')`, digest(state), digest(browser), nonce, verifier, userID, sessionHash); e != nil {
		reply(w, 503, map[string]string{"error": "OIDC unavailable"})
		return
	}
	if e = tx.Commit(r.Context()); e != nil {
		reply(w, 503, map[string]string{"error": "OIDC unavailable"})
		return
	}
	s.flowCookie(w, browser, 600)
	reply(w, 200, map[string]string{"url": s.OIDC.OAuth.AuthCodeURL(state, oidc.Nonce(nonce), oauth2.S256ChallengeOption(verifier))})
}
func (s *Service) oidcRedirect(w http.ResponseWriter, r *http.Request, result string) {
	w.Header().Set("Cache-Control", "no-store")
	http.Redirect(w, r, s.Origin+"/?oidc="+result, http.StatusSeeOther)
}
func (s *Service) callbackOIDC(w http.ResponseWriter, r *http.Request) {
	if s.OIDC == nil {
		reply(w, 503, map[string]string{"error": "OIDC not configured"})
		return
	}
	cookie, err := r.Cookie("fleetlog_oidc")
	if err != nil || r.URL.Query().Get("state") == "" {
		s.oidcRedirect(w, r, "invalid")
		return
	}
	var nonce, verifier string
	var linkID *int64
	var sessionHash *string
	err = s.DB.QueryRow(r.Context(), `DELETE FROM oidc_flows WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>now() RETURNING nonce,verifier,link_user_id,session_hash`, digest(r.URL.Query().Get("state")), digest(cookie.Value)).Scan(&nonce, &verifier, &linkID, &sessionHash)
	if err != nil {
		s.oidcRedirect(w, r, "invalid")
		return
	}
	s.flowCookie(w, "", -1)
	if r.URL.Query().Get("error") != "" || r.URL.Query().Get("code") == "" {
		s.oidcRedirect(w, r, "invalid")
		return
	}
	ctx := context.WithValue(r.Context(), oauth2.HTTPClient, s.OIDC.Client)
	tokens, err := s.OIDC.OAuth.Exchange(ctx, r.URL.Query().Get("code"), oauth2.VerifierOption(verifier))
	if err != nil {
		s.oidcRedirect(w, r, "invalid")
		return
	}
	raw, ok := tokens.Extra("id_token").(string)
	if !ok {
		s.oidcRedirect(w, r, "invalid")
		return
	}
	idToken, err := s.OIDC.Verifier.Verify(ctx, raw)
	if err != nil || idToken.Subject == "" || len(idToken.Subject) > 512 || subtle.ConstantTimeCompare([]byte(idToken.Nonce), []byte(nonce)) != 1 {
		s.oidcRedirect(w, r, "invalid")
		return
	}
	var claims struct {
		AuthorizedParty string `json:"azp"`
	}
	if idToken.Claims(&claims) != nil || len(idToken.Audience) > 1 && claims.AuthorizedParty != s.OIDC.OAuth.ClientID || claims.AuthorizedParty != "" && claims.AuthorizedParty != s.OIDC.OAuth.ClientID || idToken.AccessTokenHash != "" && idToken.VerifyAccessToken(tokens.AccessToken) != nil {
		s.oidcRedirect(w, r, "invalid")
		return
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		s.oidcRedirect(w, r, "unavailable")
		return
	}
	defer tx.Rollback(ctx)
	var userID int64
	if linkID != nil {
		// The initiating local session must remain active; changing/logging out of it cancels linking.
		if sessionHash == nil || tx.QueryRow(ctx, `SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>now() FOR UPDATE`, sessionHash).Scan(&userID) != nil || userID != *linkID {
			s.oidcRedirect(w, r, "invalid")
			return
		}
		var boundID int64
		err = tx.QueryRow(ctx, `INSERT INTO external_identities(issuer,subject,user_id) VALUES($1,$2,$3) ON CONFLICT(issuer,subject) DO UPDATE SET subject=excluded.subject RETURNING user_id`, s.OIDC.Issuer, idToken.Subject, userID).Scan(&boundID)
		if err != nil {
			s.oidcRedirect(w, r, "unavailable")
			return
		}
		if boundID != userID {
			s.oidcRedirect(w, r, "conflict")
			return
		}
	} else {
		err = tx.QueryRow(ctx, `SELECT user_id FROM external_identities WHERE issuer=$1 AND subject=$2`, s.OIDC.Issuer, idToken.Subject).Scan(&userID)
		if errors.Is(err, pgx.ErrNoRows) {
			s.oidcRedirect(w, r, "unlinked")
			return
		}
		if err != nil {
			s.oidcRedirect(w, r, "unavailable")
			return
		}
	}
	session, err := randomToken()
	if err != nil {
		s.oidcRedirect(w, r, "unavailable")
		return
	}
	if sessionHash != nil {
		if _, err = tx.Exec(ctx, `DELETE FROM sessions WHERE token_hash=$1`, sessionHash); err != nil {
			s.oidcRedirect(w, r, "unavailable")
			return
		}
	}
	if _, err = tx.Exec(ctx, `DELETE FROM sessions WHERE expires_at<=now()`); err != nil {
		s.oidcRedirect(w, r, "unavailable")
		return
	}
	if _, err = tx.Exec(ctx, `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '24 hours')`, digest(session), userID); err != nil {
		s.oidcRedirect(w, r, "unavailable")
		return
	}
	if err = tx.Commit(ctx); err != nil {
		s.oidcRedirect(w, r, "unavailable")
		return
	}
	s.cookie(w, session, 86400)
	if linkID != nil {
		s.oidcRedirect(w, r, "linked")
	} else {
		s.oidcRedirect(w, r, "login")
	}
}
