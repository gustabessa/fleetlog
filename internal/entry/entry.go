package entry

import (
	"encoding/json"
	"errors"
	"fleetlog/internal/apiutil"
	"fleetlog/internal/auth"
	"fleetlog/internal/garage"
	"fleetlog/internal/money"
	"fleetlog/internal/odometer"
	"github.com/jackc/pgx/v5"
	"math/big"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"
)

type Fuel struct {
	Liters     string `json:"liters"`
	UnitPrice  string `json:"unitPrice"`
	Fuel       string `json:"fuel"`
	Full       bool   `json:"full"`
	Incomplete bool   `json:"incomplete"`
}
type Expense struct {
	Category string `json:"category"`
	Subtype  string `json:"subtype"`
}
type Input struct {
	Expense  *Expense     `json:"expense"`
	Date     string       `json:"date"`
	Title    string       `json:"title"`
	Amount   string       `json:"amount"`
	Currency string       `json:"currency"`
	KM       *string      `json:"km"`
	Fuel     *Fuel        `json:"fuel"`
	Service  *Maintenance `json:"service"`
}
type Entry struct {
	ID        int64           `json:"id"`
	VehicleID int64           `json:"vehicleId"`
	Kind      string          `json:"kind"`
	Date      string          `json:"date"`
	Title     string          `json:"title"`
	Amount    string          `json:"amount"`
	Currency  string          `json:"currency"`
	KM        *string         `json:"km"`
	Details   json.RawMessage `json:"details"`
	Author    string          `json:"author"`
}
type Service struct{ Garage *garage.Service }

const columns = `e.id,e.vehicle_id,e.kind,e.entry_date::text,e.title,e.amount::text,e.currency,e.km::text,e.details,u.username`

func (s *Service) Routes(m *http.ServeMux) {
	m.HandleFunc("GET /api/garages/{garageID}/history", s.Garage.RequireMember(s.history))
	s.routesKind(m, "fuel")
	s.routesKind(m, "service")
	s.routesKind(m, "expense")
	s.itemRoutes(m)
	base := "/api/garages/{garageID}/vehicles/{vehicleID}/consumption"
	m.HandleFunc("GET "+base, s.Garage.RequireMember(s.consumption))
}
func (s *Service) routesKind(m *http.ServeMux, kind string) {
	base := "/api/garages/{garageID}/vehicles/{vehicleID}/" + kind
	m.HandleFunc("GET "+base, s.Garage.RequireMember(func(w http.ResponseWriter, r *http.Request) { s.list(w, r, kind) }))
	m.HandleFunc("GET "+base+"/{entryID}", s.Garage.RequireMember(func(w http.ResponseWriter, r *http.Request) { s.detail(w, r, kind) }))
	for _, method := range []string{"POST", "PUT", "DELETE"} {
		path := base
		if method != "POST" {
			path += "/{entryID}"
		}
		m.HandleFunc(method+" "+path, s.Garage.RequireMemberWrite(func(w http.ResponseWriter, r *http.Request) { s.write(w, r, kind) }))
	}
}
func validText(s string, max int) bool {
	return utf8.ValidString(s) && utf8.RuneCountInString(s) <= max && !strings.ContainsRune(s, 0)
}
func validate(input *Input, kind string) (json.RawMessage, error) {
	input.Title = strings.TrimSpace(input.Title)
	if !apiutil.Date(input.Date) || !money.ValidCurrency(input.Currency) || !validText(input.Title, 500) || (input.KM != nil && !apiutil.KM.MatchString(*input.KM)) {
		return nil, errors.New("invalid date, currency, description or odometer")
	}
	if kind == "fuel" {
		if input.Service != nil || input.Expense != nil {
			return nil, errors.New("invalid fuel fields")
		}
		f := input.Fuel
		if f == nil || input.KM == nil || !validText(f.Fuel, 100) || strings.TrimSpace(f.Fuel) == "" {
			return nil, errors.New("fuel and odometer required")
		}
		liters, e := money.Parse(f.Liters)
		if e != nil || liters.Sign() <= 0 {
			return nil, errors.New("positive liters required")
		}
		var total *big.Rat
		if input.Amount != "" {
			total, e = money.Parse(input.Amount)
			if e != nil || total.Sign() <= 0 {
				return nil, errors.New("positive amount required")
			}
		}
		if f.UnitPrice != "" {
			price, e := money.Parse(f.UnitPrice)
			if e != nil || price.Sign() <= 0 {
				return nil, errors.New("positive unit price required")
			}
			computed := new(big.Rat).Mul(price, liters)
			if total != nil && money.Round(total, money.Scale(input.Currency)) != money.Round(computed, money.Scale(input.Currency)) {
				return nil, errors.New("total does not match liters and unit price")
			}
			if total == nil {
				total = computed
			}
		}
		if total == nil {
			return nil, errors.New("total or unit price required")
		}
		input.Amount = money.Round(total, money.Scale(input.Currency))
		if _, e = money.Parse(input.Amount); e != nil {
			return nil, e
		}
		f.UnitPrice = money.Round(new(big.Rat).Quo(total, liters), 6)
		if _, e = money.Parse(f.UnitPrice); e != nil {
			return nil, e
		}
		input.Title = "Abastecimento"
		return json.Marshal(f)
	}
	if kind == "service" {
		if input.Fuel != nil || input.Expense != nil {
			return nil, errors.New("unrelated fields not valid for service")
		}
		return maintenanceDetails(input)
	}
	if kind == "expense" {
		if input.Fuel != nil || input.Service != nil || input.KM != nil || input.Expense == nil {
			return nil, errors.New("invalid expense fields")
		}
		e := input.Expense
		if e.Category != "documentation" && e.Category != "insurance" && e.Category != "other" {
			return nil, errors.New("invalid category")
		}
		if e.Category == "documentation" {
			if !slices.Contains([]string{"ipva", "licensing", "transfer", "fees", "other"}, e.Subtype) {
				return nil, errors.New("invalid documentation subtype")
			}
		} else if e.Subtype != "" {
			return nil, errors.New("subtype only for documentation")
		}
		value, err := money.Parse(input.Amount)
		if err != nil {
			return nil, err
		}
		input.Amount = money.Round(value, money.Scale(input.Currency))
		if _, err = money.Parse(input.Amount); err != nil {
			return nil, err
		}
		if input.Title == "" {
			input.Title = map[string]string{"documentation": "Documentação", "insurance": "Seguro", "other": "Outra despesa"}[e.Category]
		}
		return json.Marshal(e)
	}
	return nil, errors.New("unsupported entry")
}
func scan(row pgx.Row) (Entry, error) {
	var e Entry
	err := row.Scan(&e.ID, &e.VehicleID, &e.Kind, &e.Date, &e.Title, &e.Amount, &e.Currency, &e.KM, &e.Details, &e.Author)
	return e, err
}
func (s *Service) exists(r *http.Request) error {
	g, _ := garage.FromContext(r.Context())
	var id int64
	return s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT id FROM vehicles WHERE garage_id=$1 AND id=$2`, g.ID, apiutil.ID(r, "vehicleID")).Scan(&id)
}
func (s *Service) list(w http.ResponseWriter, r *http.Request, kind string) {
	if err := s.exists(r); err != nil {
		odometer.Failure(w, err)
		return
	}
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `SELECT `+columns+` FROM entries e JOIN users u ON u.id=e.created_by WHERE e.vehicle_id=$1 AND e.kind=$2 ORDER BY e.entry_date DESC,e.id DESC`, apiutil.ID(r, "vehicleID"), kind)
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer rows.Close()
	list := []Entry{}
	for rows.Next() {
		v, e := scan(rows)
		if e != nil {
			odometer.Failure(w, e)
			return
		}
		list = append(list, v)
	}
	if rows.Err() != nil {
		odometer.Failure(w, rows.Err())
		return
	}
	apiutil.Reply(w, 200, list)
}
func (s *Service) detail(w http.ResponseWriter, r *http.Request, kind string) {
	if err := s.exists(r); err != nil {
		odometer.Failure(w, err)
		return
	}
	v, err := scan(s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT `+columns+` FROM entries e JOIN users u ON u.id=e.created_by WHERE e.vehicle_id=$1 AND e.kind=$2 AND e.id=$3`, apiutil.ID(r, "vehicleID"), kind, apiutil.ID(r, "entryID")))
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, v)
}
func (s *Service) write(w http.ResponseWriter, r *http.Request, kind string) {
	var input Input
	var details json.RawMessage
	var err error
	if r.Method != "DELETE" {
		if !apiutil.Decode(w, r, &input) {
			return
		}
		details, err = validate(&input, kind)
		if err != nil {
			apiutil.Reply(w, 400, map[string]string{"error": err.Error()})
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
	id := apiutil.ID(r, "entryID")
	if err = odometer.Lock(r.Context(), tx, g.ID, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if kind == "service" && r.Method != "DELETE" {
		details, err = resolveItems(r.Context(), tx, g.ID, &input)
		if err != nil {
			odometer.Failure(w, err)
			return
		}
	}
	var before, after json.RawMessage
	action := "create"
	if r.Method != "POST" {
		if err = tx.QueryRow(r.Context(), `SELECT to_jsonb(e) FROM entries e WHERE id=$1 AND vehicle_id=$2 AND kind=$3`, id, vid, kind).Scan(&before); err != nil {
			odometer.Failure(w, err)
			return
		}
	}
	if r.Method == "DELETE" {
		action = "delete"
		_, err = tx.Exec(r.Context(), `DELETE FROM entries WHERE id=$1`, id)
		if err == nil && kind == "fuel" { // A removed fill makes the next interval incomplete rather than inflating consumption.
			_, err = tx.Exec(r.Context(), `UPDATE entries SET details=jsonb_set(details,'{incomplete}','true') WHERE id=(SELECT id FROM entries WHERE vehicle_id=$1 AND kind='fuel' AND (entry_date,id)>((($2::jsonb)->>'entry_date')::date,$3) ORDER BY entry_date,id LIMIT 1)`, vid, before, id)
		}
	} else if r.Method == "POST" {
		err = tx.QueryRow(r.Context(), `INSERT INTO entries(vehicle_id,kind,entry_date,title,amount,currency,km,details,created_by,updated_by) VALUES($1,$2,$3::date,$4,$5::numeric,$6,$7::numeric,$8,$9,$9) RETURNING id,to_jsonb(entries)`, vid, kind, input.Date, input.Title, input.Amount, input.Currency, input.KM, details, user.ID).Scan(&id, &after)
	} else {
		action = "update"
		err = tx.QueryRow(r.Context(), `UPDATE entries SET entry_date=$1::date,title=$2,amount=$3::numeric,currency=$4,km=$5::numeric,details=$6,updated_by=$7,updated_at=now() WHERE id=$8 RETURNING to_jsonb(entries)`, input.Date, input.Title, input.Amount, input.Currency, input.KM, details, user.ID, id).Scan(&after)
	}
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	km := input.KM
	if r.Method == "DELETE" {
		km = nil
	}
	if err = odometer.Sync(r.Context(), tx, vid, kind, id, user.ID, input.Date, km); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO entry_audit(vehicle_id,entry_id,action,actor_id,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6)`, vid, id, action, user.ID, nullableJSON(before), nullableJSON(after)); err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		odometer.Failure(w, err)
		return
	}
	if r.Method == "DELETE" {
		apiutil.Reply(w, 200, map[string]bool{"deleted": true})
		return
	}
	s.detailForID(w, r, kind, id)
}
func nullableJSON(b json.RawMessage) any {
	if len(b) == 0 {
		return nil
	}
	return b
}
func (s *Service) detailForID(w http.ResponseWriter, r *http.Request, kind string, id int64) {
	r.SetPathValue("entryID", strconv.FormatInt(id, 10))
	s.detail(w, r, kind)
}
