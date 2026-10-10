package reminder

import (
	"context"
	"encoding/json"
	"errors"
	"fleetlog/internal/apiutil"
	"fleetlog/internal/auth"
	"fleetlog/internal/garage"
	"fleetlog/internal/odometer"
	"github.com/jackc/pgx/v5"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

type Service struct{ Garage *garage.Service }
type Input struct {
	Title          string  `json:"title"`
	IntervalKM     *string `json:"intervalKm"`
	IntervalMonths *int    `json:"intervalMonths"`
	BaseKM         *string `json:"baseKm"`
	BaseDate       *string `json:"baseDate"`
	AdvanceKM      string  `json:"advanceKm"`
	AdvanceDays    int     `json:"advanceDays"`
}
type Rule struct {
	ID          int64  `json:"id"`
	VehicleID   int64  `json:"vehicleId"`
	VehicleName string `json:"vehicleName"`
	Input
	NextKM        *string `json:"nextKm"`
	NextDate      *string `json:"nextDate"`
	RemainingKM   *string `json:"remainingKm"`
	RemainingDays *int    `json:"remainingDays"`
	LastEntryID   *int64  `json:"lastEntryId"`
	Status        string  `json:"status"`
}

func (s *Service) Routes(m *http.ServeMux) {
	base := "/api/garages/{garageID}/vehicles/{vehicleID}/reminders"
	m.HandleFunc("GET "+base, s.Garage.RequireMember(s.list))
	m.HandleFunc("GET /api/garages/{garageID}/reminders", s.Garage.RequireMember(s.list))
	m.HandleFunc("POST "+base, s.Garage.RequireMemberWrite(s.write))
	m.HandleFunc("PUT "+base+"/{reminderID}", s.Garage.RequireMemberWrite(s.write))
	m.HandleFunc("DELETE "+base+"/{reminderID}", s.Garage.RequireMemberWrite(s.write))
	m.HandleFunc("POST "+base+"/{reminderID}/complete", s.Garage.RequireMemberWrite(s.complete))
}
func valid(i *Input) bool {
	i.Title = strings.TrimSpace(i.Title)
	if i.AdvanceKM == "" {
		i.AdvanceKM = "0"
	}
	if i.Title == "" || utf8.RuneCountInString(i.Title) > 120 || !utf8.ValidString(i.Title) || strings.ContainsAny(i.Title, "\x00\r\n") || !apiutil.KM.MatchString(i.AdvanceKM) || i.AdvanceDays < 0 || i.AdvanceDays > 3650 {
		return false
	}
	if i.IntervalKM == nil && i.IntervalMonths == nil {
		return false
	}
	if i.IntervalKM != nil && (!apiutil.KM.MatchString(*i.IntervalKM) || strings.Trim(*i.IntervalKM, "0.") == "" || i.BaseKM == nil) {
		return false
	}
	if i.IntervalMonths != nil && (*i.IntervalMonths < 1 || *i.IntervalMonths > 1200 || i.BaseDate == nil) {
		return false
	}
	return (i.BaseKM == nil || apiutil.KM.MatchString(*i.BaseKM)) && (i.BaseDate == nil || apiutil.Date(*i.BaseDate))
}
func (s *Service) list(w http.ResponseWriter, r *http.Request) {
	g, _ := garage.FromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
	if r.PathValue("vehicleID") != "" {
		var id int64
		if err := s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT id FROM vehicles WHERE id=$1 AND garage_id=$2`, vid, g.ID).Scan(&id); err != nil {
			odometer.Failure(w, err)
			return
		}
	}
	asOf := r.URL.Query().Get("asOf")
	if asOf == "" {
		asOf = time.Now().UTC().Format("2006-01-02")
	}
	if !apiutil.Date(asOf) {
		apiutil.Reply(w, 400, map[string]string{"error": "invalid date"})
		return
	}
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `
 WITH goals AS (
 SELECT m.*,v.name vehicle_name,c.id last_entry_id,
 CASE WHEN c.id IS NOT NULL THEN c.km ELSE m.base_km END effective_km,
 CASE WHEN c.id IS NOT NULL THEN c.entry_date ELSE m.base_date END effective_date,
 COALESCE((SELECT km FROM odometer_readings WHERE vehicle_id=v.id ORDER BY reading_date DESC,km DESC,id DESC LIMIT 1),v.initial_km) current_km
 FROM maintenance_reminders m JOIN vehicles v ON v.id=m.vehicle_id
 LEFT JOIN LATERAL (SELECT e.* FROM maintenance_reminder_completions mc JOIN entries e ON e.id=mc.entry_id WHERE mc.reminder_id=m.id ORDER BY e.entry_date DESC,e.km DESC NULLS LAST,e.id DESC LIMIT 1) c ON true
 WHERE v.garage_id=$1 AND ($2::bigint=0 OR v.id=$2) AND ($2::bigint<>0 OR NOT v.archived)
 ), targets AS (SELECT *,effective_km+interval_km next_km,(effective_date+make_interval(months=>interval_months))::date next_date FROM goals)
 SELECT id,vehicle_id,vehicle_name,title,interval_km::text,interval_months,base_km::text,base_date::text,advance_km::text,advance_days,
 next_km::text,next_date::text,(next_km-current_km)::text,next_date-$3::date,last_entry_id,
 CASE WHEN (interval_km IS NOT NULL AND next_km IS NULL) OR (interval_months IS NOT NULL AND next_date IS NULL) THEN 'needs-data'
 WHEN current_km>=next_km OR $3::date>=next_date THEN 'overdue'
 WHEN current_km>=next_km-advance_km OR $3::date>=next_date-advance_days THEN 'upcoming' ELSE 'ok' END
 FROM targets ORDER BY next_date NULLS LAST,id`, g.ID, vid, asOf)
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer rows.Close()
	out := []Rule{}
	for rows.Next() {
		var v Rule
		if err = rows.Scan(&v.ID, &v.VehicleID, &v.VehicleName, &v.Title, &v.IntervalKM, &v.IntervalMonths, &v.BaseKM, &v.BaseDate, &v.AdvanceKM, &v.AdvanceDays, &v.NextKM, &v.NextDate, &v.RemainingKM, &v.RemainingDays, &v.LastEntryID, &v.Status); err != nil {
			odometer.Failure(w, err)
			return
		}
		out = append(out, v)
	}
	if rows.Err() != nil {
		odometer.Failure(w, rows.Err())
		return
	}
	apiutil.Reply(w, 200, out)
}
func (s *Service) write(w http.ResponseWriter, r *http.Request) {
	var i Input
	if r.Method != "DELETE" {
		if !apiutil.Decode(w, r, &i) {
			return
		}
		if !valid(&i) {
			apiutil.Reply(w, 400, map[string]string{"error": "invalid reminder; baseline date/km required"})
			return
		}
	}
	g, _ := garage.FromContext(r.Context())
	u, _ := auth.UserFromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
	id := apiutil.ID(r, "reminderID")
	tx, err := s.Garage.Auth.DB.Begin(r.Context())
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	if err = odometer.Lock(r.Context(), tx, g.ID, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	var before, after json.RawMessage
	action := "create"
	if r.Method != "POST" {
		if err = tx.QueryRow(r.Context(), `SELECT to_jsonb(m) FROM maintenance_reminders m WHERE id=$1 AND vehicle_id=$2 FOR UPDATE`, id, vid).Scan(&before); err != nil {
			odometer.Failure(w, err)
			return
		}
	}
	switch r.Method {
	case "POST":
		err = tx.QueryRow(r.Context(), `INSERT INTO maintenance_reminders(vehicle_id,title,interval_km,interval_months,base_km,base_date,advance_km,advance_days,created_by,updated_by) VALUES($1,$2,$3::numeric,$4,$5::numeric,$6::date,$7::numeric,$8,$9,$9) RETURNING id,to_jsonb(maintenance_reminders)`, vid, i.Title, i.IntervalKM, i.IntervalMonths, i.BaseKM, i.BaseDate, i.AdvanceKM, i.AdvanceDays, u.ID).Scan(&id, &after)
	case "PUT":
		action = "update"
		err = tx.QueryRow(r.Context(), `UPDATE maintenance_reminders SET title=$1,interval_km=$2::numeric,interval_months=$3,base_km=$4::numeric,base_date=$5::date,advance_km=$6::numeric,advance_days=$7,updated_by=$8 WHERE id=$9 RETURNING to_jsonb(maintenance_reminders)`, i.Title, i.IntervalKM, i.IntervalMonths, i.BaseKM, i.BaseDate, i.AdvanceKM, i.AdvanceDays, u.ID, id).Scan(&after)
	case "DELETE":
		action = "delete"
		_, err = tx.Exec(r.Context(), `DELETE FROM maintenance_reminders WHERE id=$1`, id)
	}
	if err == nil {
		_, err = tx.Exec(r.Context(), `INSERT INTO maintenance_reminder_audit(vehicle_id,reminder_id,action,actor_id,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6)`, vid, id, action, u.ID, before, after)
	}
	if err == nil {
		err = tx.Commit(r.Context())
	}
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, map[string]any{"id": id})
}

// Complete uses the entry transaction, so a new maintenance and its completion commit together.
var ErrMaintenanceKM = errors.New("maintenance odometer required for reminder")

func Complete(ctx context.Context, tx pgx.Tx, vehicleID, reminderID, entryID, actorID int64) error {
	var intervalKM *string
	var km *string
	var date string
	if err := tx.QueryRow(ctx, `SELECT interval_km::text FROM maintenance_reminders WHERE id=$1 AND vehicle_id=$2 FOR UPDATE`, reminderID, vehicleID).Scan(&intervalKM); err != nil {
		return err
	}
	if err := tx.QueryRow(ctx, `SELECT km::text,entry_date::text FROM entries WHERE id=$1 AND vehicle_id=$2 AND kind='service'`, entryID, vehicleID).Scan(&km, &date); err != nil {
		return err
	}
	if intervalKM != nil && km == nil {
		return ErrMaintenanceKM
	}
	tag, err := tx.Exec(ctx, `INSERT INTO maintenance_reminder_completions(reminder_id,entry_id,actor_id) VALUES($1,$2,$3) ON CONFLICT(reminder_id,entry_id) DO NOTHING`, reminderID, entryID, actorID)
	if err == nil && tag.RowsAffected() > 0 {
		_, err = tx.Exec(ctx, `INSERT INTO maintenance_reminder_audit(vehicle_id,reminder_id,action,actor_id,after_value) VALUES($1,$2,'complete',$3,jsonb_build_object('entryId',$4::bigint))`, vehicleID, reminderID, actorID, entryID)
	}
	return err
}
func (s *Service) complete(w http.ResponseWriter, r *http.Request) {
	var in struct {
		EntryID int64 `json:"entryId"`
	}
	if !apiutil.Decode(w, r, &in) {
		return
	}
	g, _ := garage.FromContext(r.Context())
	u, _ := auth.UserFromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
	tx, err := s.Garage.Auth.DB.Begin(r.Context())
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	if err = odometer.Lock(r.Context(), tx, g.ID, vid); err == nil {
		err = Complete(r.Context(), tx, vid, apiutil.ID(r, "reminderID"), in.EntryID, u.ID)
	}
	if err != nil {
		apiutil.Reply(w, 400, map[string]string{"error": "valid maintenance with required odometer must be selected"})
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, map[string]bool{"ok": true})
}
