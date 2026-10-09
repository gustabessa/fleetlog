// Package testutil provides isolated PostgreSQL schemas for product integration tests.
package testutil

import (
	"context"
	"fleetlog/internal/auth"
	"fleetlog/internal/garage"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

type App struct {
	Auth     *auth.Service
	Garage   *garage.Service
	Mux      *http.ServeMux
	Cookie   *http.Cookie
	GarageID int64
}

func New(t *testing.T) *App {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	schema := fmt.Sprintf("product_%d", time.Now().UnixNano())
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE"); admin.Close() })
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	a, err := auth.Open(ctx, u.String(), "http://fleetlog.test", "tester", "test-password-12345")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(a.DB.Close)
	app := &App{Auth: a, Garage: &garage.Service{Auth: a}, Mux: http.NewServeMux()}
	a.Routes(app.Mux)
	app.Garage.Routes(app.Mux)
	login := app.Request("POST", "/api/auth/login", `{"username":"tester","password":"test-password-12345"}`)
	if login.Code != 200 {
		t.Fatal(login.Body.String())
	}
	app.Cookie = login.Result().Cookies()[0]
	if err = a.DB.QueryRow(ctx, `SELECT id FROM garages LIMIT 1`).Scan(&app.GarageID); err != nil {
		t.Fatal(err)
	}
	return app
}
func (a *App) Request(method, path, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Header.Set("Origin", a.Auth.Origin)
	r.Header.Set("Content-Type", "application/json")
	if a.Cookie != nil {
		r.AddCookie(a.Cookie)
	}
	w := httptest.NewRecorder()
	a.Mux.ServeHTTP(w, r)
	return w
}
