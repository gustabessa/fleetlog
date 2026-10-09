package odometer

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"fleetlog/internal/apiutil"
	"fleetlog/internal/auth"
	"fleetlog/internal/garage"
	"github.com/jackc/pgx/v5"
)

var ErrConflict = errors.New("odometer conflicts with chronological readings")

type Reading struct {
	ID       int64  `json:"id"`
	Date     string `json:"date"`
	KM       string `json:"km"`
	Origin   string `json:"origin"`
	SourceID int64  `json:"sourceId"`
	Author   string `json:"author"`
}
type Service struct{ Garage *garage.Service }

func (s *Service) Routes(m *http.ServeMux) {
	base := "/api/garages/{garageID}/vehicles/{vehicleID}/readings"
	m.HandleFunc("GET "+base, s.Garage.RequireMember(s.list))
	m.HandleFunc("GET "+base+"/audit", s.Garage.RequireMember(s.audit))
	m.HandleFunc("POST "+base, s.Garage.RequireMemberWrite(s.write))
	m.HandleFunc("PUT "+base+"/{readingID}", s.Garage.RequireMemberWrite(s.write))
	m.HandleFunc("DELETE "+base+"/{readingID}", s.Garage.RequireMemberWrite(s.write))
}

// Lock serializes every reading/entry mutation for this vehicle, including retroactive edits.
func Lock(ctx context.Context, tx pgx.Tx, garageID, vehicleID int64) error {
	var id int64
	return tx.QueryRow(ctx, `SELECT id FROM vehicles WHERE garage_id=$1 AND id=$2 FOR UPDATE`, garageID, vehicleID).Scan(&id)
}

// Sync inserts/updates/removes a source reading atomically with its financial entry.
// Caller must hold Lock; a nil km removes the reading, never the immutable baseline.
func Sync(ctx context.Context, tx pgx.Tx, vehicleID int64, origin string, sourceID, actor int64, date string, km *string) error {
	var before []byte
	var id int64
	err := tx.QueryRow(ctx, `SELECT id,to_jsonb(o) FROM odometer_readings o WHERE vehicle_id=$1 AND origin=$2 AND source_id=$3`, vehicleID, origin, sourceID).Scan(&id, &before)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	var after []byte
	action := "create"
	if km == nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		action = "delete"
		if _, err = tx.Exec(ctx, `DELETE FROM odometer_readings WHERE id=$1`, id); err != nil {
			return err
		}
	} else {
		if len(before) > 0 {
			action = "update"
		}
		err = tx.QueryRow(ctx, `INSERT INTO odometer_readings(vehicle_id,reading_date,km,origin,source_id,created_by,updated_by) VALUES($1,$2::date,$3::numeric,$4,$5,$6,$6) ON CONFLICT(vehicle_id,origin,source_id) DO UPDATE SET reading_date=excluded.reading_date,km=excluded.km,updated_by=excluded.updated_by,updated_at=now() RETURNING id,to_jsonb(odometer_readings)`, vehicleID, date, *km, origin, sourceID, actor).Scan(&id, &after)
		if err != nil {
			return err
		}
	}
	var invalid bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM (SELECT km,lag(km) OVER(ORDER BY reading_date,id) previous FROM odometer_readings WHERE vehicle_id=$1) r WHERE km<previous OR km<(SELECT initial_km FROM vehicles WHERE id=$1))`, vehicleID).Scan(&invalid)
	if err != nil {
		return err
	}
	if invalid {
		return ErrConflict
	}
	_, err = tx.Exec(ctx, `INSERT INTO odometer_audit(vehicle_id,reading_id,action,actor_id,before_value,after_value) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)`, vehicleID, id, action, actor, jsonOrNil(before), jsonOrNil(after))
	return err
}
func jsonOrNil(b []byte) any {
	if len(b) == 0 {
		return nil
	}
	return json.RawMessage(b)
}
func Failure(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrConflict) {
		apiutil.Reply(w, 409, map[string]string{"error": err.Error()})
	} else if errors.Is(err, pgx.ErrNoRows) {
		apiutil.Reply(w, 404, map[string]string{"error": "record not found"})
	} else {
		apiutil.Reply(w, 503, map[string]string{"error": "record unavailable"})
	}
}
func (s *Service) exists(r *http.Request) bool {
	g, _ := garage.FromContext(r.Context())
	var id int64
	return s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT id FROM vehicles WHERE garage_id=$1 AND id=$2`, g.ID, apiutil.ID(r, "vehicleID")).Scan(&id) == nil
}
func (s *Service) list(w http.ResponseWriter, r *http.Request) {
	if !s.exists(r) {
		Failure(w, pgx.ErrNoRows)
		return
	}
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `SELECT o.id,o.reading_date::text,o.km::text,o.origin,o.source_id,u.username FROM odometer_readings o JOIN users u ON u.id=o.created_by WHERE o.vehicle_id=$1 ORDER BY o.reading_date DESC,o.id DESC`, apiutil.ID(r, "vehicleID"))
	if err != nil {
		Failure(w, err)
		return
	}
	defer rows.Close()
	list := []Reading{}
	for rows.Next() {
		var v Reading
		if err = rows.Scan(&v.ID, &v.Date, &v.KM, &v.Origin, &v.SourceID, &v.Author); err != nil {
			Failure(w, err)
			return
		}
		list = append(list, v)
	}
	if rows.Err() != nil {
		Failure(w, rows.Err())
		return
	}
	// The immutable baseline already belongs to the vehicle registration record.
	// Its timestamp is the registration time, not an invented civil date for old mileage.
	baseline := Reading{Origin: "registration", SourceID: apiutil.ID(r, "vehicleID")}
	if err = s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT to_char(v.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),v.initial_km::text,u.username FROM vehicles v JOIN users u ON u.id=v.created_by WHERE v.id=$1`, baseline.SourceID).Scan(&baseline.Date, &baseline.KM, &baseline.Author); err != nil {
		Failure(w, err)
		return
	}
	list = append(list, baseline)
	apiutil.Reply(w, 200, list)
}
func (s *Service) audit(w http.ResponseWriter, r *http.Request) {
	if !s.exists(r) {
		Failure(w, pgx.ErrNoRows)
		return
	}
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `SELECT jsonb_build_object('id',a.id,'readingId',a.reading_id,'action',a.action,'author',u.username,'before',a.before_value,'after',a.after_value,'changedAt',a.changed_at) FROM odometer_audit a JOIN users u ON u.id=a.actor_id WHERE a.vehicle_id=$1 ORDER BY a.id DESC`, apiutil.ID(r, "vehicleID"))
	if err != nil {
		Failure(w, err)
		return
	}
	defer rows.Close()
	list := []json.RawMessage{}
	for rows.Next() {
		var b json.RawMessage
		if err = rows.Scan(&b); err != nil {
			Failure(w, err)
			return
		}
		list = append(list, b)
	}
	if rows.Err() != nil {
		Failure(w, rows.Err())
		return
	}
	apiutil.Reply(w, 200, list)
}
func (s *Service) write(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Date string `json:"date"`
		KM   string `json:"km"`
	}
	if r.Method != "DELETE" {
		if !apiutil.Decode(w, r, &input) {
			return
		}
		if !apiutil.Date(input.Date) || !apiutil.KM.MatchString(input.KM) {
			apiutil.Reply(w, 400, map[string]string{"error": "invalid date or km"})
			return
		}
	}
	g, _ := garage.FromContext(r.Context())
	user, _ := auth.UserFromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
	tx, err := s.Garage.Auth.DB.Begin(r.Context())
	if err != nil {
		Failure(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	if err = Lock(r.Context(), tx, g.ID, vid); err != nil {
		Failure(w, err)
		return
	}
	var sourceID int64
	if r.Method == "POST" {
		err = tx.QueryRow(r.Context(), `SELECT nextval(pg_get_serial_sequence('odometer_readings','id'))`).Scan(&sourceID)
	} else {
		err = tx.QueryRow(r.Context(), `SELECT source_id FROM odometer_readings WHERE id=$1 AND vehicle_id=$2 AND origin='manual'`, apiutil.ID(r, "readingID"), vid).Scan(&sourceID)
	}
	if err != nil {
		Failure(w, err)
		return
	}
	var km *string
	if r.Method != "DELETE" {
		km = &input.KM
	}
	if err = Sync(r.Context(), tx, vid, "manual", sourceID, user.ID, input.Date, km); err != nil {
		Failure(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		Failure(w, err)
		return
	}
	s.list(w, r)
}
