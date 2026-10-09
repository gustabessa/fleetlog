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

func TestItemsIntegration(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	(&entry.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	w := a.Request("POST", base, `{"name":"Car","initialKm":100}`)
	var v vehicle.Vehicle
	json.Unmarshal(w.Body.Bytes(), &v)
	url := fmt.Sprintf("%s/%d/service", base, v.ID)
	body := `{"date":"2026-10-08","title":"Óleo","currency":"BRL","service":{"mode":"detailed","discount":"5","adjustment":"-1","items":[{"name":"Óleo","brand":"Marca","code":"01","unit":"liter","kind":"part","quantity":"4","unitPrice":"20","currency":"BRL"},{"name":"Troca","unit":"hour","kind":"labor","quantity":"1","unitPrice":"30","currency":"BRL"}]}}`
	w = a.Request("POST", url, body)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var e entry.Entry
	json.Unmarshal(w.Body.Bytes(), &e)
	if e.Amount != "104.000000" {
		t.Fatal(e)
	}
	var detail entry.Maintenance
	json.Unmarshal(e.Details, &detail)
	if detail.Items[0].RefID == 0 {
		t.Fatal("no reference")
	}
	second := fmt.Sprintf(`{"date":"2026-10-09","currency":"BRL","service":{"mode":"detailed","items":[{"refId":%d,"unit":"liter","kind":"part","quantity":"4","unitPrice":"25","currency":"BRL"}]}}`, detail.Items[0].RefID)
	w = a.Request("POST", url, second)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	prices := fmt.Sprintf("/api/garages/%d/items/%d/prices", a.GarageID, detail.Items[0].RefID)
	w = a.Request("GET", prices, "")
	if !strings.Contains(w.Body.String(), `"unitPrice":"20"`) || !strings.Contains(w.Body.String(), `"unitPrice":"25"`) {
		t.Fatal(w.Body.String())
	}
	w = a.Request("POST", url, strings.Replace(body, `"unitPrice":"20","currency":"BRL"`, `"unitPrice":"20","currency":"USD"`, 1))
	if w.Code != 400 {
		t.Fatal("mixed currency accepted", w.Code)
	}
	w = a.Request("PUT", fmt.Sprintf("%s/%d", url, e.ID), `{"date":"2026-10-08","amount":"50","currency":"BRL","service":{"mode":"direct"}}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	json.Unmarshal(w.Body.Bytes(), &e)
	if strings.Contains(string(e.Details), `"unitPrice"`) || e.Amount != "50.000000" {
		t.Fatal("double total", e)
	}
	w = a.Request("GET", fmt.Sprintf("/api/garages/%d/items/%d/prices", a.GarageID+99, detail.Items[0].RefID), "")
	if w.Code != 404 {
		t.Fatal("item isolation", w.Code)
	}
}
