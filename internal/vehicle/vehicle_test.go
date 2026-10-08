package vehicle

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"fleetlog/internal/auth"
	"fleetlog/internal/garage"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestVehicleValidation(t *testing.T) {
	for _, body := range []string{`{}`, `{"name":"  ","initialKm":0}`, `{"name":"Car","initialKm":-1}`, `{"name":"Car","initialKm":1.0001}`, `{"name":"Car","initialKm":1000000000}`, `{"name":"Car","initialKm":0,"year":0}`, `{"name":"Car","initialKm":0,"unknown":1}`, `{"name":"Car","initialKm":0} {}`, `{"name":"Car","initialKm":null}`} {
		req := httptest.NewRequest("POST", "/", strings.NewReader(body))
		_, fields := readInput(httptest.NewRecorder(), req, true)
		if len(fields) == 0 {
			t.Errorf("accepted %s", body)
		}
	}
	input, fields := readInput(httptest.NewRecorder(), httptest.NewRequest("POST", "/", strings.NewReader(`{"name":" Car ","initialKm":0,"renavam":"00001234"}`)), true)
	if len(fields) != 0 || input.Name != "Car" || input.Renavam != "00001234" {
		t.Fatal("valid zero odometer or identifier lost")
	}
	_, fields = readInput(httptest.NewRecorder(), httptest.NewRequest("PUT", "/", strings.NewReader(`{"name":"Car","initialKm":1}`)), false)
	if fields["initialKm"] == "" {
		t.Fatal("initial odometer edit accepted")
	}
}

func TestVehiclesIntegration(t *testing.T) {
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
	schema := fmt.Sprintf("vehicle_test_%d", time.Now().UnixNano())
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE")
	u, _ := url.Parse(base)
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	s, err := auth.Open(ctx, u.String(), "https://fleetlog.test", "creator", "test-password-12345")
	if err != nil {
		t.Fatal(err)
	}
	defer s.DB.Close()
	var userID, garageID int64
	if err = s.DB.QueryRow(ctx, `SELECT user_id,garage_id FROM garage_members`).Scan(&userID, &garageID); err != nil {
		t.Fatal(err)
	}
	token := "test-session"
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	if _, err = s.DB.Exec(ctx, `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')`, hash, userID); err != nil {
		t.Fatal(err)
	}
	g := &garage.Service{Auth: s}
	mux := http.NewServeMux()
	(&Service{Garage: g}).Routes(mux)
	call := func(method, path, body, session, origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", origin)
		if session != "" {
			req.AddCookie(&http.Cookie{Name: "fleetlog_session", Value: session})
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		return w
	}
	path := fmt.Sprintf("/api/garages/%d/vehicles", garageID)
	body := `{"name":"Civic","plate":"ABC1D23","brand":"Honda","year":2020,"chassis":"000CHASSIS","renavam":"00001234","initialKm":12345.678}`
	if call("POST", path, body, "", s.Origin).Code != 401 {
		t.Fatal("anonymous write accepted")
	}
	if call("POST", path, body, token, "https://attacker.test").Code != 403 {
		t.Fatal("cross-origin write accepted")
	}
	created := call("POST", path, body, token, s.Origin)
	if created.Code != 201 {
		t.Fatalf("create %d %s", created.Code, created.Body.String())
	}
	var v Vehicle
	if err = json.Unmarshal(created.Body.Bytes(), &v); err != nil {
		t.Fatal(err)
	}
	if v.InitialKM != "12345.678" || v.Renavam != "00001234" || v.Chassis != "000CHASSIS" {
		t.Fatal("precision or identifier lost")
	}
	item := fmt.Sprintf("%s/%d", path, v.ID)
	for _, p := range []string{path, item} {
		w := call("GET", p, "", token, s.Origin)
		if w.Code != 200 || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("read failed or cacheable")
		}
	}
	update := `{"name":"Civic atualizado","plate":"XYZ9A99","chassis":"000CHASSIS2","renavam":"00000009"}`
	edited := call("PUT", item, update, token, s.Origin)
	if edited.Code != 200 {
		t.Fatalf("update %d %s", edited.Code, edited.Body.String())
	}
	json.Unmarshal(edited.Body.Bytes(), &v)
	if v.InitialKM != "12345.678" || v.Name != "Civic atualizado" || v.Renavam != "00000009" {
		t.Fatal("edit failed or initial km changed")
	}
	if call("PUT", item, `{"name":"Bad","initialKm":1}`, token, s.Origin).Code != 400 {
		t.Fatal("initial km edit accepted")
	}
	restarted, err := auth.Open(ctx, u.String(), s.Origin, "", "")
	if err != nil {
		t.Fatal(err)
	}
	defer restarted.DB.Close()
	var saved string
	if err = restarted.DB.QueryRow(ctx, `SELECT name FROM vehicles WHERE id=$1`, v.ID).Scan(&saved); err != nil || saved != v.Name {
		t.Fatal("vehicle not persisted")
	}
	var otherID, otherGarage int64
	if err = s.DB.QueryRow(ctx, `INSERT INTO users(username) VALUES('other') RETURNING id`).Scan(&otherID); err != nil {
		t.Fatal(err)
	}
	if err = s.DB.QueryRow(ctx, `INSERT INTO garages(name,created_by) VALUES('Other',$1) RETURNING id`, otherID).Scan(&otherGarage); err != nil {
		t.Fatal(err)
	}
	if _, err = s.DB.Exec(ctx, `INSERT INTO garage_members(garage_id,user_id) VALUES($1,$2),($3,$2)`, garageID, otherID, otherGarage); err != nil {
		t.Fatal(err)
	}
	otherToken := "other-session"
	otherHash := fmt.Sprintf("%x", sha256.Sum256([]byte(otherToken)))
	if _, err = s.DB.Exec(ctx, `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')`, otherHash, otherID); err != nil {
		t.Fatal(err)
	}
	if call("GET", item, "", otherToken, s.Origin).Code != 200 {
		t.Fatal("shared member cannot read")
	}
	if call("PUT", item, update, otherToken, s.Origin).Code != 403 || call("POST", path, body, otherToken, s.Origin).Code != 403 {
		t.Fatal("member was granted unapproved write access")
	}
	wrongPath := fmt.Sprintf("/api/garages/%d/vehicles/%d", otherGarage, v.ID)
	if call("GET", wrongPath, "", otherToken, s.Origin).Code != 404 || call("PUT", wrongPath, update, otherToken, s.Origin).Code != 404 {
		t.Fatal("vehicle leaked across garages")
	}
	if _, err = s.DB.Exec(ctx, `DELETE FROM garage_members WHERE garage_id=$1 AND user_id=$2`, garageID, otherID); err != nil {
		t.Fatal(err)
	}
	if call("GET", item, "", otherToken, s.Origin).Code != 404 {
		t.Fatal("revoked member still accesses vehicle")
	}
}
