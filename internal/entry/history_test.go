package entry_test

import (
	"encoding/json"
	"fleetlog/internal/entry"
	"fleetlog/internal/testutil"
	"fleetlog/internal/vehicle"
	"fmt"
	"strings"
	"testing"
)

func TestHistoryIntegration(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	(&entry.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	w := a.Request("POST", base, `{"name":"Cívic","initialKm":100}`)
	var v vehicle.Vehicle
	json.Unmarshal(w.Body.Bytes(), &v)
	url := fmt.Sprintf("%s/%d", base, v.ID)
	for _, tc := range []struct{ kind, body string }{{"fuel", `{"date":"2026-10-01","amount":"100","currency":"BRL","km":"200","fuel":{"fuel":"Gasolina","liters":"10","full":true}}`}, {"service", `{"date":"2026-10-02","title":"Revisão","amount":"50","currency":"BRL"}`}, {"expense", `{"date":"2026-10-03","title":"IPVA","amount":"25","currency":"BRL","expense":{"category":"documentation","subtype":"ipva"}}`}, {"fuel", `{"date":"2026-10-04","amount":"100","currency":"USD","km":"300","fuel":{"fuel":"Gasolina","liters":"10","full":true}}`}} {
		w = a.Request("POST", url+"/"+tc.kind, tc.body)
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
	}
	history := fmt.Sprintf("/api/garages/%d/history", a.GarageID)
	w = a.Request("GET", history+"?limit=2", "")
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var h entry.History
	json.Unmarshal(w.Body.Bytes(), &h)
	if h.Total != 4 || len(h.Items) != 2 || !strings.Contains(string(h.Totals), `175.000000`) || !strings.Contains(string(h.Totals), `100.000000`) {
		t.Fatal(w.Body.String())
	}
	if !strings.Contains(string(h.Distances), `100.000`) {
		t.Fatal(w.Body.String())
	}
	w = a.Request("GET", history+"?q=revisao&from=2026-10-02&to=2026-10-02", "")
	json.Unmarshal(w.Body.Bytes(), &h)
	if h.Total != 1 || h.Items[0].Title != "Revisão" {
		t.Fatal(w.Body.String())
	}
	w = a.Request("GET", history+"?price=100&currency=BRL", "")
	json.Unmarshal(w.Body.Bytes(), &h)
	if h.Total != 1 || h.Items[0].Currency != "BRL" {
		t.Fatal(w.Body.String())
	}
	for _, query := range []string{"?price=100", "?from=2026-10-02&to=2026-10-01", "?page=-1", "?limit=101", "?currency=XYZ"} {
		if w = a.Request("GET", history+query, ""); w.Code != 400 {
			t.Fatal("invalid filters accepted", query, w.Code)
		}
	}
	if w = a.Request("GET", fmt.Sprintf("/api/garages/%d/history", a.GarageID+99), ""); w.Code != 404 {
		t.Fatal("aggregate isolation", w.Code)
	}
}
