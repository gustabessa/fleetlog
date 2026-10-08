package garage

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"
	"time"

	"fleetlog/internal/auth"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func TestGarageUpgradeAndIsolation(t *testing.T) {
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Skip("set TEST_DATABASE_URL to a disposable database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	admin, err := pgxpool.New(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	deadline := time.Now().Add(15 * time.Second)
	for admin.Ping(ctx) != nil {
		if time.Now().After(deadline) {
			t.Fatal("database not ready")
		}
		time.Sleep(100 * time.Millisecond)
	}
	schema := fmt.Sprintf("garage_test_%d", time.Now().UnixNano())
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE")
	u, err := url.Parse(base)
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	dsn := u.String()
	old, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer old.Close()
	firstSQL, err := os.ReadFile("../database/migrations/001_auth.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = old.Exec(ctx, `CREATE TABLE schema_migrations(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());`+string(firstSQL)); err != nil {
		t.Fatal(err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("legacy-password-12345"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatal(err)
	}
	var firstUser int64
	if err = old.QueryRow(ctx, `INSERT INTO users(username,password_hash) VALUES('legacy',$1) RETURNING id`, string(hash)).Scan(&firstUser); err != nil {
		t.Fatal(err)
	}
	token := "legacy-session-token"
	digest := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	if _, err = old.Exec(ctx, `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')`, digest, firstUser); err != nil {
		t.Fatal(err)
	}
	s, err := auth.Open(ctx, dsn, "https://fleetlog.test", "", "")
	if err != nil {
		t.Fatal(err)
	}
	defer s.DB.Close()
	var firstGarage int64
	if err = s.DB.QueryRow(ctx, `SELECT garage_id FROM garage_members WHERE user_id=$1`, firstUser).Scan(&firstGarage); err != nil {
		t.Fatal(err)
	}
	var unchanged string
	if err = s.DB.QueryRow(ctx, `SELECT password_hash FROM users WHERE id=$1`, firstUser).Scan(&unchanged); err != nil || unchanged != string(hash) {
		t.Fatal("upgrade changed existing password")
	}
	service := &Service{Auth: s}
	mux := http.NewServeMux()
	s.Routes(mux)
	service.Routes(mux)
	// Exercise the same middleware future vehicle APIs will use.
	mux.HandleFunc("GET /api/garages/{garageID}/protected", service.RequireMember(func(w http.ResponseWriter, r *http.Request) {
		g, ok := FromContext(r.Context())
		if !ok || g.ID != firstGarage {
			t.Fatal("missing garage context")
		}
		user, ok := auth.UserFromContext(r.Context())
		if !ok || user.ID != firstUser {
			t.Fatal("missing user context")
		}
		w.WriteHeader(204)
	}))
	get := func(path, session string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("GET", path, nil)
		if session != "" {
			req.AddCookie(&http.Cookie{Name: "fleetlog_session", Value: session})
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		return w
	}
	own := fmt.Sprintf("/api/garages/%d", firstGarage)
	for _, path := range []string{"/api/garages", own, own + "/protected"} {
		if get(path, "").Code != 401 {
			t.Fatal("anonymous access accepted")
		}
	}
	if get("/api/auth/me", token).Code != 200 {
		t.Fatal("legacy session lost during upgrade")
	}
	list := get("/api/garages", token)
	if list.Code != 200 {
		t.Fatal("legacy user cannot list garages")
	}
	var garages []Garage
	if err = json.Unmarshal(list.Body.Bytes(), &garages); err != nil || len(garages) != 1 || garages[0].ID != firstGarage {
		t.Fatalf("unexpected garages: %s", list.Body.String())
	}
	if list.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("private garage data cacheable")
	}
	if get(own, token).Code != 200 || get(own+"/protected", token).Code != 204 {
		t.Fatal("member denied")
	}
	var otherUser, otherGarage int64
	if err = s.DB.QueryRow(ctx, `INSERT INTO users(username) VALUES('other') RETURNING id`).Scan(&otherUser); err != nil {
		t.Fatal(err)
	}
	if err = s.DB.QueryRow(ctx, `INSERT INTO garages(name,created_by) VALUES('Private garage',$1) RETURNING id`, otherUser).Scan(&otherGarage); err != nil {
		t.Fatal(err)
	}
	if _, err = s.DB.Exec(ctx, `INSERT INTO garage_members(garage_id,user_id) VALUES($1,$2)`, otherGarage, otherUser); err != nil {
		t.Fatal(err)
	}
	otherToken := "other-session"
	otherDigest := fmt.Sprintf("%x", sha256.Sum256([]byte(otherToken)))
	if _, err = s.DB.Exec(ctx, `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')`, otherDigest, otherUser); err != nil {
		t.Fatal(err)
	}
	unknown := get("/api/garages/999999999", token)
	denied := get(fmt.Sprintf("/api/garages/%d", otherGarage), token)
	if denied.Code != 404 || unknown.Code != 404 || denied.Body.String() != unknown.Body.String() {
		t.Fatal("foreign garage disclosed")
	}
	if get(own, otherToken).Code != 404 {
		t.Fatal("other user's session can access garage")
	}
	for _, path := range []string{"/api/garages/0", "/api/garages/not-an-id", "/api/garages/9223372036854775808"} {
		if get(path, token).Code != 404 {
			t.Fatal("invalid garage ID accepted")
		}
	}
	if _, err = s.DB.Exec(ctx, `INSERT INTO garage_members(garage_id,user_id) VALUES($1,$2)`, firstGarage, otherUser); err != nil {
		t.Fatal(err)
	}
	if get(own, otherToken).Code != 200 {
		t.Fatal("shared garage member denied")
	}
	if _, err = s.DB.Exec(ctx, `DELETE FROM garage_members WHERE garage_id=$1 AND user_id=$2`, firstGarage, otherUser); err != nil {
		t.Fatal(err)
	}
	if get(own, otherToken).Code != 404 {
		t.Fatal("revoked membership still valid")
	}
	if get(own, "invalid-session").Code != 401 {
		t.Fatal("invalid session accepted")
	}
	if _, err = s.DB.Exec(ctx, `UPDATE sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1`, otherDigest); err != nil {
		t.Fatal(err)
	}
	if get(own, otherToken).Code != 401 {
		t.Fatal("expired session accepted")
	}
	// Restart must neither duplicate initial garages nor auto-enroll new accounts.
	if _, err = s.DB.Exec(ctx, `INSERT INTO users(username) VALUES('unassigned')`); err != nil {
		t.Fatal(err)
	}
	restarted, err := auth.Open(ctx, dsn, "https://fleetlog.test", "", "")
	if err != nil {
		t.Fatal(err)
	}
	restarted.DB.Close()
	var count int
	if err = s.DB.QueryRow(ctx, `SELECT count(*) FROM garages`).Scan(&count); err != nil || count != 2 {
		t.Fatalf("restart changed garage count: %d, %v", count, err)
	}
	if err = s.DB.QueryRow(ctx, `SELECT count(*) FROM garage_members m JOIN users u ON u.id=m.user_id WHERE u.username='unassigned'`).Scan(&count); err != nil || count != 0 {
		t.Fatal("restart auto-enrolled account")
	}
}
