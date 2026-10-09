package odometer_test

import (
	"context"
	"encoding/json"
	"fleetlog/internal/odometer"
	"fleetlog/internal/testutil"
	"fleetlog/internal/vehicle"
	"fmt"
	"strings"
	"testing"
)

func TestChronologyIntegration(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	(&odometer.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	w := a.Request("POST", base, `{"name":"Car","initialKm":100}`)
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body.String())
	}
	var v vehicle.Vehicle
	json.Unmarshal(w.Body.Bytes(), &v)
	readings := fmt.Sprintf("%s/%d/readings", base, v.ID)
	for _, body := range []string{`{"date":"2026-10-08","km":"300"}`, `{"date":"2026-10-01","km":"200"}`} {
		if w = a.Request("POST", readings, body); w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
	}
	for _, body := range []string{`{"date":"2026-10-02","km":"400"}`, `{"date":"2026-09-01","km":"90"}`} {
		if w = a.Request("POST", readings, body); w.Code != 409 {
			t.Fatal("inconsistent reading accepted", w.Code, w.Body.String())
		}
	}
	w = a.Request("GET", base+fmt.Sprintf("/%d", v.ID), "")
	json.Unmarshal(w.Body.Bytes(), &v)
	if v.CurrentKM != "300.000" || v.InitialKM != "100.000" {
		t.Fatal(v)
	}
	w = a.Request("GET", readings, "")
	var rs []odometer.Reading
	json.Unmarshal(w.Body.Bytes(), &rs)
	if len(rs) != 3 || rs[2].Origin != "registration" || rs[2].Author != "tester" || rs[2].KM != "100.000" {
		t.Fatal("registration trace missing", w.Body.String())
	}
	if w = a.Request("PUT", fmt.Sprintf("%s/%d", readings, rs[0].ID), `{"date":"2026-10-08","km":"150"}`); w.Code != 409 {
		t.Fatal("bad edit accepted", w.Code)
	}
	if w = a.Request("DELETE", fmt.Sprintf("%s/%d", readings, rs[0].ID), `{}`); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = a.Request("GET", base+fmt.Sprintf("/%d", v.ID), "")
	json.Unmarshal(w.Body.Bytes(), &v)
	if v.CurrentKM != "200.000" {
		t.Fatal(v)
	}
	var audits int
	if err := a.Auth.DB.QueryRow(context.Background(), `SELECT count(*) FROM odometer_audit`).Scan(&audits); err != nil || audits != 3 {
		t.Fatal(audits, err)
	}
	if w = a.Request("GET", readings+"/audit", ""); w.Code != 200 || !strings.Contains(w.Body.String(), "tester") {
		t.Fatal(w.Body.String())
	}
	if _, err := a.Auth.DB.Exec(context.Background(), `DELETE FROM garage_members`); err != nil {
		t.Fatal(err)
	}
	if w = a.Request("GET", readings, ""); w.Code != 404 {
		t.Fatal("revoked membership still reads", w.Code)
	}
}
