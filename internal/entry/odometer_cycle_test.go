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

func TestFuelDeleteRecreateChronology(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	(&entry.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	r := a.Request("POST", base, `{"name":"Fuel cycle","initialKm":100}`)
	var v vehicle.Vehicle
	json.Unmarshal(r.Body.Bytes(), &v)
	url := fmt.Sprintf("%s/%d", base, v.ID)
	create := func(km string) int64 {
		t.Helper()
		r := a.Request("POST", url+"/fuel", fmt.Sprintf(`{"date":"2026-10-08","km":"%s","currency":"BRL","amount":"10","fuel":{"liters":"2","fuel":"Gasolina","full":true,"incomplete":false}}`, km))
		if r.Code != 200 {
			t.Fatal(r.Code, r.Body.String())
		}
		var e entry.Entry
		json.Unmarshal(r.Body.Bytes(), &e)
		return e.ID
	}
	high := create("300")
	low := create("200")
	mid := create("250")
	stats := a.Request("GET", url+"/consumption", "")
	var consumption []entry.Consumption
	json.Unmarshal(stats.Body.Bytes(), &consumption)
	if len(consumption) != 3 || consumption[0].EntryID != low || consumption[1].EntryID != mid || consumption[2].EntryID != high {
		t.Fatal("fuel consumption follows insertion order", stats.Body.String())
	}
	for _, id := range []int64{mid, low, high} {
		r := a.Request("DELETE", fmt.Sprintf("%s/fuel/%d", url, id), "")
		if r.Code != 200 {
			t.Fatal(r.Body.String())
		}
	}
	var count int
	a.Auth.DB.QueryRow(context.Background(), `SELECT count(*) FROM odometer_readings WHERE vehicle_id=$1`, v.ID).Scan(&count)
	if count != 0 {
		t.Fatal("orphaned source readings", count)
	}
	for n := 0; n < 3; n++ {
		id := create("180")
		r := a.Request("DELETE", fmt.Sprintf("%s/fuel/%d", url, id), "")
		if r.Code != 200 {
			t.Fatal(r.Body.String())
		}
	}
	r = a.Request("GET", url, "")
	json.Unmarshal(r.Body.Bytes(), &v)
	if v.CurrentKM != "100.000" {
		t.Fatal("baseline not restored", v.CurrentKM)
	}
}
