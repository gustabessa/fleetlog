package auth_test

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fleetlog/internal/auth"
	"fleetlog/internal/testutil"
	"fmt"
	"github.com/go-jose/go-jose/v4"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"
)

type providerFixture struct {
	server                                       *httptest.Server
	nonce, challenge                             string
	mu                                           sync.Mutex
	badNonce, badAudience, expired, badSignature bool
}

func fakeProvider(t *testing.T) *providerFixture {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	p := &providerFixture{}
	var handler http.HandlerFunc
	handler = func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/.well-known/openid-configuration", "/discovery":
			json.NewEncoder(w).Encode(map[string]any{"issuer": p.server.URL, "authorization_endpoint": p.server.URL + "/authorize", "token_endpoint": p.server.URL + "/token", "jwks_uri": p.server.URL + "/keys", "id_token_signing_alg_values_supported": []string{"RS256"}})
		case "/keys":
			json.NewEncoder(w).Encode(jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{Key: &key.PublicKey, KeyID: "test", Use: "sig", Algorithm: "RS256"}}})
		case "/authorize":
			p.mu.Lock()
			p.nonce = r.URL.Query().Get("nonce")
			p.challenge = r.URL.Query().Get("code_challenge")
			p.mu.Unlock()
			if r.URL.Query().Get("code_challenge_method") != "S256" {
				t.Error("PKCE missing")
			}
			callback := r.URL.Query().Get("redirect_uri") + "?state=" + url.QueryEscape(r.URL.Query().Get("state")) + "&code=fixture"
			http.Redirect(w, r, callback, 302)
		case "/token":
			r.ParseForm()
			p.mu.Lock()
			defer p.mu.Unlock()
			hash := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
			if base64.RawURLEncoding.EncodeToString(hash[:]) != p.challenge {
				w.WriteHeader(400)
				json.NewEncoder(w).Encode(map[string]string{"error": "invalid_grant"})
				return
			}
			nonce := p.nonce
			if p.badNonce {
				nonce = "wrong"
			}
			aud := "test-client"
			if p.badAudience {
				aud = "other"
			}
			exp := time.Now().Add(time.Hour).Unix()
			if p.expired {
				exp = time.Now().Add(-time.Hour).Unix()
			}
			claims, _ := json.Marshal(map[string]any{"iss": p.server.URL, "sub": "external-subject", "aud": aud, "exp": exp, "iat": time.Now().Unix(), "nonce": nonce, "email": "tester@example.com"})
			signer, _ := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: jose.JSONWebKey{Key: key, KeyID: "test"}}, nil)
			signed, _ := signer.Sign(claims)
			token, _ := signed.CompactSerialize()
			if p.badSignature {
				parts := strings.Split(token, ".")
				parts[2] = base64.RawURLEncoding.EncodeToString(make([]byte, 256))
				token = strings.Join(parts, ".")
			}
			json.NewEncoder(w).Encode(map[string]any{"access_token": "test", "token_type": "Bearer", "id_token": token})
		default:
			w.WriteHeader(404)
		}
	}
	p.server = httptest.NewServer(handler)
	t.Cleanup(p.server.Close)
	return p
}
func TestOIDCIntegration(t *testing.T) {
	a := testutil.New(t)
	p := fakeProvider(t)
	cfg := auth.OIDCConfig{Issuer: p.server.URL, DiscoveryURL: p.server.URL + "/discovery", ClientID: "test-client", ClientSecret: "test-secret", Scopes: []string{"openid", "profile"}, LocalEnabled: true}
	if err := a.Auth.ConfigureOIDC(context.Background(), cfg); err != nil {
		t.Fatal(err)
	}
	noRedirect := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	start := func(link bool) (string, *http.Cookie) {
		t.Helper()
		w := a.Request("POST", "/api/auth/oidc/start", fmt.Sprintf(`{"link":%t}`, link))
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
		var b map[string]string
		json.Unmarshal(w.Body.Bytes(), &b)
		response, err := noRedirect.Get(b["url"])
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		return response.Header.Get("Location"), w.Result().Cookies()[0]
	}
	callback := func(location string, cookie *http.Cookie) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", location, nil)
		if cookie != nil {
			r.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		a.Mux.ServeHTTP(w, r)
		return w
	}
	location, browser := start(false)
	w := callback(location, browser)
	if !strings.Contains(w.Header().Get("Location"), "unlinked") {
		t.Fatal("email auto-link or public registration", w.Header())
	}
	location, browser = start(true)
	w = callback(location, &http.Cookie{Name: browser.Name, Value: "wrong"})
	if !strings.Contains(w.Header().Get("Location"), "invalid") {
		t.Fatal("browser binding ignored")
	}
	w = callback(location, browser)
	if !strings.Contains(w.Header().Get("Location"), "linked") {
		t.Fatal("link failed", w.Header())
	}
	for _, c := range w.Result().Cookies() {
		if c.Name == "fleetlog_session" {
			a.Cookie = c
		}
	}
	w = callback(location, browser)
	if !strings.Contains(w.Header().Get("Location"), "invalid") {
		t.Fatal("replayed flow accepted")
	}
	a.Cookie = nil
	location, browser = start(false)
	w = callback(location, browser)
	if !strings.Contains(w.Header().Get("Location"), "login") {
		t.Fatal("bound login failed", w.Header())
	}
	for _, c := range w.Result().Cookies() {
		if c.Name == "fleetlog_session" {
			a.Cookie = c
		}
	}
	if a.Request("GET", "/api/auth/me", "").Code != 200 {
		t.Fatal("internal session missing")
	}
	for _, scenario := range []string{"nonce", "audience", "expired", "signature"} {
		p.mu.Lock()
		p.badNonce = scenario == "nonce"
		p.badAudience = scenario == "audience"
		p.expired = scenario == "expired"
		p.badSignature = scenario == "signature"
		p.mu.Unlock()
		location, browser = start(false)
		w = callback(location, browser)
		if !strings.Contains(w.Header().Get("Location"), "invalid") {
			t.Fatal("invalid ID token accepted", scenario, w.Header())
		}
	}
	p.mu.Lock()
	p.badNonce = false
	p.badAudience = false
	p.expired = false
	p.badSignature = false
	p.mu.Unlock()
	location, browser = start(true)
	a.Request("POST", "/api/auth/logout", `{}`)
	w = callback(location, browser)
	if !strings.Contains(w.Header().Get("Location"), "invalid") {
		t.Fatal("link survived logout")
	}
	a.Cookie = nil
	login := a.Request("POST", "/api/auth/login", `{"username":"tester","password":"test-password-12345"}`)
	a.Cookie = login.Result().Cookies()[0]
	location, browser = start(false)
	a.Auth.DB.Exec(context.Background(), `UPDATE oidc_flows SET expires_at=now()-interval '1 second'`)
	w = callback(location, browser)
	if !strings.Contains(w.Header().Get("Location"), "invalid") {
		t.Fatal("expired flow accepted")
	}
	// A new internal user cannot steal an existing issuer+subject association.
	var second int64
	if err := a.Auth.DB.QueryRow(context.Background(), `INSERT INTO users(username) VALUES('second') RETURNING id`).Scan(&second); err != nil {
		t.Fatal(err)
	}
	raw := "second-session"
	hash := sha256.Sum256([]byte(raw))
	a.Auth.DB.Exec(context.Background(), `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')`, fmt.Sprintf("%x", hash), second)
	a.Cookie = &http.Cookie{Name: "fleetlog_session", Value: raw}
	location, browser = start(true)
	w = callback(location, browser)
	if !strings.Contains(w.Header().Get("Location"), "conflict") {
		t.Fatal("identity taken over", w.Header())
	}
	secondProvider := fakeProvider(t)
	cfg.Issuer = secondProvider.server.URL
	cfg.DiscoveryURL = ""
	if err := a.Auth.ConfigureOIDC(context.Background(), cfg); err != nil {
		t.Fatal(err)
	}
	a.Cookie = nil
	location, browser = start(false)
	w = callback(location, browser)
	if !strings.Contains(w.Header().Get("Location"), "unlinked") {
		t.Fatal("issuer change associated subject", w.Header())
	}
	cfg.LocalEnabled = false
	if err := a.Auth.ConfigureOIDC(context.Background(), cfg); err != nil {
		t.Fatal(err)
	}
	if a.Request("POST", "/api/auth/login", `{"username":"tester","password":"test-password-12345"}`).Code != 403 {
		t.Fatal("local login not disabled")
	}
}
