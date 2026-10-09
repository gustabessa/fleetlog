package vehicle_test

import (
	"encoding/json"
	"fleetlog/internal/entry"
	"fleetlog/internal/testutil"
	"fleetlog/internal/vehicle"
	"fmt"
	"strings"
	"testing"
)

func TestVehicleRecordsIntegration(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	(&entry.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	w := a.Request("POST", base, `{"name":"Car","initialKm":100}`)
	var v vehicle.Vehicle
	json.Unmarshal(w.Body.Bytes(), &v)
	url := fmt.Sprintf("%s/%d", base, v.ID)
	w = a.Request("POST", url+"/notes", `{"content":"Anotação <script> texto"}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w = a.Request("DELETE", url, `{}`); w.Code != 409 {
		t.Fatal("vehicle with note deleted", w.Code)
	}
	w = a.Request("PUT", url+"/ownership", `{"purchase":{"date":"2026-01-01","amount":"10000.12","currency":"BRL","party":"Anterior"},"sale":{"date":"2026-10-08","amount":"2000.5","currency":"USD"}}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = a.Request("GET", base, "")
	if w.Body.String() != "[]\n" {
		t.Fatal("sold car still active", w.Body.String())
	}
	w = a.Request("GET", base+"?includeArchived=true", "")
	if !strings.Contains(w.Body.String(), `"archived":true`) {
		t.Fatal(w.Body.String())
	}
	w = a.Request("GET", url+"/ownership", "")
	if !strings.Contains(w.Body.String(), `"amount": "2000.500000"`) && !strings.Contains(w.Body.String(), `"amount":"2000.500000"`) {
		t.Fatal(w.Body.String())
	}
	w = a.Request("POST", url+"/expense", `{"date":"2026-10-08","title":"Licenciamento","amount":"150","currency":"BRL","expense":{"category":"documentation","subtype":"licensing"}}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var e entry.Entry
	json.Unmarshal(w.Body.Bytes(), &e)
	w = a.Request("PUT", fmt.Sprintf("%s/expense/%d", url, e.ID), `{"date":"2026-10-08","title":"Seguro","amount":"30","currency":"USD","expense":{"category":"insurance","subtype":""}}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = a.Request("PUT", url+"/ownership", `{"purchase":{"date":"2026-01-01","amount":"10000.12","currency":"BRL"},"sale":null}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = a.Request("GET", base, "")
	if strings.Contains(w.Body.String(), `"archived":true`) {
		t.Fatal(w.Body.String())
	}
	w = a.Request("DELETE", url, `{}`)
	if w.Code != 409 {
		t.Fatal("history deletion accepted", w.Code)
	}
	w = a.Request("POST", base, `{"name":"Empty","initialKm":0}`)
	json.Unmarshal(w.Body.Bytes(), &v)
	w = a.Request("DELETE", fmt.Sprintf("%s/%d", base, v.ID), `{}`)
	if w.Code != 200 {
		t.Fatal("empty car deletion failed", w.Code, w.Body.String())
	}
}
