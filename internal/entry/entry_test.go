package entry_test

import (
	"encoding/json"
	"fleetlog/internal/entry"
	"fleetlog/internal/testutil"
	"fleetlog/internal/vehicle"
	"fmt"
	"testing"
)

func TestFuelIntegration(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	(&entry.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	w := a.Request("POST", base, `{"name":"Car","initialKm":100}`)
	var v vehicle.Vehicle
	json.Unmarshal(w.Body.Bytes(), &v)
	url := fmt.Sprintf("%s/%d/fuel", base, v.ID)
	var ids []int64
	for _, tc := range []struct {
		date, km, liters, price string
		full                    bool
	}{{"2026-10-01", "100", "10", "6.2", true}, {"2026-10-02", "200", "5", "6.2", false}, {"2026-10-03", "300", "15", "6.2", true}} {
		body := fmt.Sprintf(`{"date":%q,"currency":"BRL","km":%q,"fuel":{"fuel":"Gasolina","liters":%q,"unitPrice":%q,"full":%t}}`, tc.date, tc.km, tc.liters, tc.price, tc.full)
		w = a.Request("POST", url, body)
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
		var e entry.Entry
		json.Unmarshal(w.Body.Bytes(), &e)
		ids = append(ids, e.ID)
	}
	w = a.Request("GET", fmt.Sprintf("%s/%d/consumption", base, v.ID), "")
	var c []entry.Consumption
	json.Unmarshal(w.Body.Bytes(), &c)
	if len(c) != 3 || c[2].KML == nil || *c[2].KML != "10.000" {
		t.Fatal(w.Body.String())
	}
	w = a.Request("PUT", fmt.Sprintf("%s/%d", url, ids[1]), `{"date":"2026-10-02","amount":"30","currency":"USD","km":"400","fuel":{"fuel":"Gasolina","liters":"5"}}`)
	if w.Code != 409 {
		t.Fatal("inconsistent edit accepted", w.Code, w.Body.String())
	}
	w = a.Request("GET", fmt.Sprintf("%s/%d", url, ids[1]), "")
	var e entry.Entry
	json.Unmarshal(w.Body.Bytes(), &e)
	if e.Currency != "BRL" || e.Amount != "31.000000" || *e.KM != "200.000" {
		t.Fatal("failed edit did not rollback", w.Body.String())
	}
	w = a.Request("DELETE", fmt.Sprintf("%s/%d", url, ids[1]), `{}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = a.Request("GET", fmt.Sprintf("%s/%d/consumption", base, v.ID), "")
	json.Unmarshal(w.Body.Bytes(), &c)
	if c[1].Status != "incomplete" || c[1].KML != nil {
		t.Fatal("deleted fuel produced metric", w.Body.String())
	}
	w = a.Request("GET", fmt.Sprintf("/api/garages/%d/vehicles/%d/fuel", a.GarageID+100, v.ID), "")
	if w.Code != 404 {
		t.Fatal("garage isolation failed", w.Code)
	}
	w = a.Request("POST", url, `{"date":"2026-10-04","amount":"40","currency":"BRL","km":"400","fuel":{"fuel":"Gasolina","liters":"5","unitPrice":"6"}}`)
	if w.Code != 400 {
		t.Fatal("inconsistent total accepted", w.Code)
	}
}
