package garage_test

import (
	"context"
	"encoding/json"
	"fleetlog/internal/testutil"
	"fleetlog/internal/vehicle"
	"fmt"
	"testing"
)

func TestMembersIntegration(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	url := fmt.Sprintf("/api/garages/%d/members", a.GarageID)
	w := a.Request("POST", url, `{"username":"family","password":"family-password-12345"}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var id int64
	if err := a.Auth.DB.QueryRow(context.Background(), `SELECT id FROM users WHERE username='family'`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	owner := a.Cookie
	a.Cookie = nil
	login := a.Request("POST", "/api/auth/login", `{"username":"family","password":"family-password-12345"}`)
	if login.Code != 200 {
		t.Fatal(login.Code, login.Body.String())
	}
	member := login.Result().Cookies()[0]
	a.Cookie = member
	if w = a.Request("GET", url, ""); w.Code != 403 {
		t.Fatal("member manages access", w.Code)
	}
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	w = a.Request("POST", base, `{"name":"Shared","initialKm":0}`)
	if w.Code != 201 {
		t.Fatal("member write denied", w.Code, w.Body.String())
	}
	var v vehicle.Vehicle
	json.Unmarshal(w.Body.Bytes(), &v)
	a.Cookie = owner
	if w = a.Request("DELETE", url+"/1", `{}`); w.Code != 409 {
		t.Fatal("creator removal accepted", w.Code)
	}
	if w = a.Request("DELETE", fmt.Sprintf("%s/%d", url, id), `{}`); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	a.Cookie = member
	if w = a.Request("GET", base, ""); w.Code != 404 {
		t.Fatal("revoked member sees garage", w.Code)
	}
	a.Cookie = owner
	w = a.Request("GET", fmt.Sprintf("%s/%d", base, v.ID), "")
	if w.Code != 200 {
		t.Fatal("history lost after removal", w.Code)
	}
	if w = a.Request("POST", url, `{"username":"family","existing":true}`); w.Code != 200 {
		t.Fatal("existing identity cannot rejoin", w.Code, w.Body.String())
	}
	a.Cookie = member
	if w = a.Request("GET", base, ""); w.Code != 200 {
		t.Fatal("existing session not reused", w.Code)
	}
}
