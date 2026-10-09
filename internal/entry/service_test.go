package entry_test

import (
	"context"
	"encoding/json"
	"fleetlog/internal/entry"
	"fleetlog/internal/testutil"
	"fleetlog/internal/vehicle"
	"fmt"
	"testing"
)

func TestServiceIntegration(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	(&entry.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	w := a.Request("POST", base, `{"name":"Car","initialKm":100}`)
	var v vehicle.Vehicle
	json.Unmarshal(w.Body.Bytes(), &v)
	url := fmt.Sprintf("%s/%d/service", base, v.ID)
	w = a.Request("POST", url, `{"date":"2026-10-08","title":"Óleo","amount":"150.005","currency":"BRL","km":"200"}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var e entry.Entry
	json.Unmarshal(w.Body.Bytes(), &e)
	if e.Amount != "150.010000" {
		t.Fatal(e)
	}
	w = a.Request("PUT", fmt.Sprintf("%s/%d", url, e.ID), `{"date":"2026-10-08","title":"Óleo corrigido","amount":"20","currency":"USD"}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var count int
	if err := a.Auth.DB.QueryRow(context.Background(), `SELECT count(*) FROM odometer_readings`).Scan(&count); err != nil || count != 0 {
		t.Fatal("removed optional km still has reading", count, err)
	}
	w = a.Request("DELETE", fmt.Sprintf("%s/%d", url, e.ID), `{}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = a.Request("GET", url, "")
	if w.Body.String() != "[]\n" {
		t.Fatal(w.Body.String())
	}
}
