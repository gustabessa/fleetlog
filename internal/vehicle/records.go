package vehicle

import (
	"encoding/json"
	"fleetlog/internal/apiutil"
	"fleetlog/internal/auth"
	"fleetlog/internal/garage"
	"fleetlog/internal/money"
	"fleetlog/internal/odometer"
	"net/http"
	"strings"
	"unicode/utf8"
)

type Trade struct {
	Date     string `json:"date"`
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
	Party    string `json:"party"`
}
type Ownership struct {
	Purchase *Trade `json:"purchase"`
	Sale     *Trade `json:"sale"`
}

func (s *Service) recordRoutes(m *http.ServeMux) {
	base := "/api/garages/{garageID}/vehicles/{vehicleID}"
	m.HandleFunc("GET "+base+"/notes", s.Garage.RequireMember(s.notes))
	m.HandleFunc("POST "+base+"/notes", s.Garage.RequireCreatorWrite(s.writeNote))
	m.HandleFunc("PUT "+base+"/notes/{noteID}", s.Garage.RequireCreatorWrite(s.writeNote))
	m.HandleFunc("DELETE "+base+"/notes/{noteID}", s.Garage.RequireCreatorWrite(s.writeNote))
	m.HandleFunc("GET "+base+"/ownership", s.Garage.RequireMember(s.ownership))
	m.HandleFunc("PUT "+base+"/ownership", s.Garage.RequireCreatorWrite(s.writeOwnership))
	m.HandleFunc("DELETE "+base, s.Garage.RequireCreatorWrite(s.removeVehicle))
}
func (s *Service) checkVehicle(r *http.Request) error {
	g, _ := garage.FromContext(r.Context())
	var id int64
	return s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT id FROM vehicles WHERE garage_id=$1 AND id=$2`, g.ID, apiutil.ID(r, "vehicleID")).Scan(&id)
}
func (s *Service) notes(w http.ResponseWriter, r *http.Request) {
	if err := s.checkVehicle(r); err != nil {
		odometer.Failure(w, err)
		return
	}
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `SELECT jsonb_build_object('id',n.id,'content',n.content,'author',u.username,'updatedAt',n.updated_at) FROM vehicle_notes n JOIN users u ON u.id=n.created_by WHERE n.vehicle_id=$1 ORDER BY n.id DESC`, apiutil.ID(r, "vehicleID"))
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer rows.Close()
	list := []json.RawMessage{}
	for rows.Next() {
		var n json.RawMessage
		if err = rows.Scan(&n); err != nil {
			odometer.Failure(w, err)
			return
		}
		list = append(list, n)
	}
	if rows.Err() != nil {
		odometer.Failure(w, rows.Err())
		return
	}
	apiutil.Reply(w, 200, list)
}
func (s *Service) writeNote(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Content string `json:"content"`
	}
	if r.Method != "DELETE" {
		if !apiutil.Decode(w, r, &input) {
			return
		}
		input.Content = strings.TrimSpace(input.Content)
		if input.Content == "" || !validRecordText(input.Content, 20000) {
			apiutil.Reply(w, 400, map[string]string{"error": "note required, maximum 20000 characters"})
			return
		}
	}
	tx, err := s.Garage.Auth.DB.Begin(r.Context())
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	g, _ := garage.FromContext(r.Context())
	user, _ := auth.UserFromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
	if err = odometer.Lock(r.Context(), tx, g.ID, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if r.Method == "POST" {
		_, err = tx.Exec(r.Context(), `INSERT INTO vehicle_notes(vehicle_id,content,created_by,updated_by) VALUES($1,$2,$3,$3)`, vid, input.Content, user.ID)
	} else {
		var id int64
		if r.Method == "DELETE" {
			err = tx.QueryRow(r.Context(), `DELETE FROM vehicle_notes WHERE vehicle_id=$1 AND id=$2 RETURNING id`, vid, apiutil.ID(r, "noteID")).Scan(&id)
		} else {
			err = tx.QueryRow(r.Context(), `UPDATE vehicle_notes SET content=$1,updated_by=$2,updated_at=now() WHERE vehicle_id=$3 AND id=$4 RETURNING id`, input.Content, user.ID, vid, apiutil.ID(r, "noteID")).Scan(&id)
		}
	}
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		odometer.Failure(w, err)
		return
	}
	s.notes(w, r)
}

const ownershipSQL = `SELECT jsonb_build_object('purchase',(SELECT jsonb_build_object('date',transaction_date::text,'amount',amount::text,'currency',currency,'party',party) FROM vehicle_transactions WHERE vehicle_id=$1 AND kind='purchase'),'sale',(SELECT jsonb_build_object('date',transaction_date::text,'amount',amount::text,'currency',currency,'party',party) FROM vehicle_transactions WHERE vehicle_id=$1 AND kind='sale'))`

func (s *Service) ownership(w http.ResponseWriter, r *http.Request) {
	if err := s.checkVehicle(r); err != nil {
		odometer.Failure(w, err)
		return
	}
	var data json.RawMessage
	if err := s.Garage.Auth.DB.QueryRow(r.Context(), ownershipSQL, apiutil.ID(r, "vehicleID")).Scan(&data); err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, data)
}
func (s *Service) writeOwnership(w http.ResponseWriter, r *http.Request) {
	var input Ownership
	if !apiutil.Decode(w, r, &input) {
		return
	}
	for _, trade := range []*Trade{input.Purchase, input.Sale} {
		if trade == nil {
			continue
		}
		value, err := money.Parse(trade.Amount)
		if err != nil || !apiutil.Date(trade.Date) || !money.ValidCurrency(trade.Currency) || !validRecordText(trade.Party, 200) {
			apiutil.Reply(w, 400, map[string]string{"error": "invalid purchase or sale"})
			return
		}
		trade.Amount = money.Round(value, money.Scale(trade.Currency))
		if _, err = money.Parse(trade.Amount); err != nil {
			apiutil.Reply(w, 400, map[string]string{"error": "amount overflow"})
			return
		}
	}
	if input.Purchase != nil && input.Sale != nil && input.Sale.Date < input.Purchase.Date {
		apiutil.Reply(w, 400, map[string]string{"error": "sale precedes purchase"})
		return
	}
	g, _ := garage.FromContext(r.Context())
	user, _ := auth.UserFromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
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
	if err = tx.QueryRow(r.Context(), ownershipSQL, vid).Scan(&before); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `DELETE FROM vehicle_transactions WHERE vehicle_id=$1`, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	for kind, trade := range map[string]*Trade{"purchase": input.Purchase, "sale": input.Sale} {
		if trade == nil {
			continue
		}
		if _, err = tx.Exec(r.Context(), `INSERT INTO vehicle_transactions(vehicle_id,kind,transaction_date,amount,currency,party) VALUES($1,$2,$3::date,$4::numeric,$5,$6)`, vid, kind, trade.Date, trade.Amount, trade.Currency, trade.Party); err != nil {
			odometer.Failure(w, err)
			return
		}
	}
	if _, err = tx.Exec(r.Context(), `UPDATE vehicles SET archived=$1,updated_at=now() WHERE id=$2`, input.Sale != nil, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = tx.QueryRow(r.Context(), ownershipSQL, vid).Scan(&after); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO vehicle_audit(vehicle_id,actor_id,before_value,after_value) SELECT $1,$2,$3::jsonb,$4::jsonb WHERE $3::jsonb<>$4::jsonb`, vid, user.ID, before, after); err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, after)
}
func (s *Service) removeVehicle(w http.ResponseWriter, r *http.Request) {
	g, _ := garage.FromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
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
	var history bool
	if err = tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM entries WHERE vehicle_id=$1) OR EXISTS(SELECT 1 FROM odometer_audit WHERE vehicle_id=$1) OR EXISTS(SELECT 1 FROM entry_audit WHERE vehicle_id=$1) OR EXISTS(SELECT 1 FROM vehicle_notes WHERE vehicle_id=$1) OR EXISTS(SELECT 1 FROM vehicle_transactions WHERE vehicle_id=$1) OR EXISTS(SELECT 1 FROM vehicle_audit WHERE vehicle_id=$1)`, vid).Scan(&history); err != nil {
		odometer.Failure(w, err)
		return
	}
	if history {
		apiutil.Reply(w, 409, map[string]string{"error": "vehicle has history and cannot be deleted"})
		return
	}
	if _, err = tx.Exec(r.Context(), `UPDATE photo_objects SET state='delete' WHERE object_key=(SELECT object_key FROM vehicle_photos WHERE vehicle_id=$1)`, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `DELETE FROM vehicle_photos WHERE vehicle_id=$1`, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `DELETE FROM vehicles WHERE id=$1`, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, map[string]bool{"deleted": true})
}
func validRecordText(s string, max int) bool {
	return utf8.ValidString(s) && utf8.RuneCountInString(s) <= max && !strings.ContainsRune(s, 0)
}
