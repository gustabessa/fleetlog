package reminder_test

import (
	"context"
	"encoding/json"
	"fleetlog/internal/entry"
	"fleetlog/internal/reminder"
	"fleetlog/internal/testutil"
	"fleetlog/internal/vehicle"
	"fmt"
	"testing"
)

func TestRemindersLifecycle(t *testing.T) {
	a := testutil.New(t)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	(&entry.Service{Garage: a.Garage}).Routes(a.Mux)
	(&reminder.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	resp := a.Request("POST", base, `{"name":"Reminder car","initialKm":1000}`)
	var v struct{ ID int64 }
	json.Unmarshal(resp.Body.Bytes(), &v)
	if resp.Code != 201 {
		t.Fatal(resp.Body.String())
	}
	url := fmt.Sprintf("%s/%d", base, v.ID)
	resp = a.Request("POST", url+"/reminders", `{"title":"Óleo","intervalKm":"200","intervalMonths":1,"baseKm":"800","baseDate":"2026-01-31","advanceKm":"50","advanceDays":2}`)
	var rule struct{ ID int64 }
	json.Unmarshal(resp.Body.Bytes(), &rule)
	if resp.Code != 200 {
		t.Fatal(resp.Body.String())
	}
	get := func(asOf string) []reminder.Rule {
		t.Helper()
		r := a.Request("GET", url+"/reminders?asOf="+asOf, "")
		if r.Code != 200 {
			t.Fatal(r.Code, r.Body.String())
		}
		var out []reminder.Rule
		if err := json.Unmarshal(r.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		return out
	}
	initial := get("2026-02-01")[0]
	if initial.Status != "overdue" || *initial.NextDate != "2026-02-28" {
		t.Fatalf("first limit/calendar: %+v", initial)
	}
	bad := a.Request("POST", url+"/service", fmt.Sprintf(`{"date":"2026-02-27","title":"Oil","amount":"10","currency":"BRL","reminderId":%d}`, rule.ID))
	if bad.Code != 400 {
		t.Fatal(bad.Code, bad.Body.String())
	}
	var count int
	a.Auth.DB.QueryRow(context.Background(), `SELECT count(*) FROM entries`).Scan(&count)
	if count != 0 {
		t.Fatal("failed reminder completion persisted maintenance")
	}
	saved := a.Request("POST", url+"/service", fmt.Sprintf(`{"date":"2026-02-27","title":"Oil","amount":"10","currency":"BRL","km":"1100","reminderId":%d}`, rule.ID))
	if saved.Code != 200 {
		t.Fatal(saved.Code, saved.Body.String())
	}
	var e struct{ ID int64 }
	json.Unmarshal(saved.Body.Bytes(), &e)
	next := get("2026-02-27")[0]
	if next.Status != "ok" || *next.NextKM != "1300.000" || *next.NextDate != "2026-03-27" {
		t.Fatalf("completion: %+v", next)
	}
	if get("2026-03-25")[0].Status != "upcoming" || get("2026-03-27")[0].Status != "overdue" {
		t.Fatal("date lead/limit")
	}
	for n := 0; n < 2; n++ {
		r := a.Request("POST", fmt.Sprintf("%s/reminders/%d/complete", url, rule.ID), fmt.Sprintf(`{"entryId":%d}`, e.ID))
		if r.Code != 200 {
			t.Fatal(r.Body.String())
		}
	}
	a.Auth.DB.QueryRow(context.Background(), `SELECT count(*) FROM maintenance_reminder_completions`).Scan(&count)
	if count != 1 {
		t.Fatal("duplicate completion")
	}
	updated := a.Request("PUT", fmt.Sprintf("%s/service/%d", url, e.ID), `{"date":"2026-02-28","title":"Oil corrected","amount":"10","currency":"BRL","km":"1120"}`)
	if updated.Code != 200 {
		t.Fatal(updated.Code, updated.Body.String())
	}
	corrected := get("2026-03-26")[0]
	if *corrected.NextKM != "1320.000" || *corrected.NextDate != "2026-03-28" {
		t.Fatalf("correction: %+v", corrected)
	}
	missing := a.Request("PUT", fmt.Sprintf("%s/service/%d", url, e.ID), `{"date":"2026-02-28","title":"Oil","amount":"10","currency":"BRL"}`)
	if missing.Code != 200 {
		t.Fatal(missing.Body.String())
	}
	if get("2026-03-26")[0].Status != "needs-data" {
		t.Fatal("missing maintenance km invented a target")
	}
	removed := a.Request("DELETE", fmt.Sprintf("%s/service/%d", url, e.ID), "")
	if removed.Code != 200 {
		t.Fatal(removed.Body.String())
	}
	if get("2026-03-26")[0].LastEntryID != nil {
		t.Fatal("deleted maintenance still completed reminder")
	}
	invalid := a.Request("POST", url+"/reminders", `{"title":""}`)
	if invalid.Code != 400 {
		t.Fatal("invalid reminder accepted")
	}
	cookie := a.Cookie
	a.Cookie = nil
	if a.Request("GET", url+"/reminders", "").Code != 401 {
		t.Fatal("anonymous reminder read")
	}
	a.Cookie = cookie

	month := a.Request("POST", url+"/reminders", `{"title":"Inspection","intervalMonths":1,"baseDate":"2024-01-31","advanceDays":0}`)
	var monthly struct{ ID int64 }
	json.Unmarshal(month.Body.Bytes(), &monthly)
	if month.Code != 200 {
		t.Fatal(month.Body.String())
	}
	for _, r := range get("2024-02-28") {
		if r.ID == monthly.ID && (r.NextKM != nil || *r.NextDate != "2024-02-29" || r.Status != "ok") {
			t.Fatalf("month-only/leap: %+v", r)
		}
	}
	noKM := a.Request("POST", url+"/service", fmt.Sprintf(`{"date":"2026-02-25","title":"Inspection","amount":"0","currency":"BRL","reminderId":%d}`, monthly.ID))
	if noKM.Code != 200 {
		t.Fatal("month-only must allow no odometer", noKM.Body.String())
	}
	other := a.Request("POST", base, `{"name":"Other vehicle","initialKm":1000}`)
	var second struct{ ID int64 }
	json.Unmarshal(other.Body.Bytes(), &second)
	foreign := a.Request("POST", fmt.Sprintf("%s/%d/service", base, second.ID), `{"date":"2026-02-27","title":"Foreign","amount":"1","currency":"BRL","km":"1000"}`)
	var otherEntry struct{ ID int64 }
	json.Unmarshal(foreign.Body.Bytes(), &otherEntry)
	cross := a.Request("POST", fmt.Sprintf("%s/reminders/%d/complete", url, rule.ID), fmt.Sprintf(`{"entryId":%d}`, otherEntry.ID))
	if cross.Code != 400 {
		t.Fatal("cross-vehicle maintenance accepted", cross.Body.String())
	}
	archive := a.Request("PUT", url+"/archive", `{"archived":true}`)
	if archive.Code != 200 {
		t.Fatal(archive.Body.String())
	}
	summary := a.Request("GET", fmt.Sprintf("/api/garages/%d/reminders?asOf=2026-03-26", a.GarageID), "")
	if summary.Body.String() != "[]\n" {
		t.Fatal("archived vehicle shown in garage", summary.Body.String())
	}
}
