package vehicle

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"fleetlog/internal/auth"
	"fleetlog/internal/garage"
	"github.com/jackc/pgx/v5"
)

type Vehicle struct {
	ID        int64  `json:"id"`
	GarageID  int64  `json:"garageId"`
	Name      string `json:"name"`
	Plate     string `json:"plate"`
	Brand     string `json:"brand"`
	Year      *int   `json:"year"`
	Chassis   string `json:"chassis"`
	Renavam   string `json:"renavam"`
	InitialKM string `json:"initialKm"`
}
type Input struct {
	Name      string       `json:"name"`
	Plate     string       `json:"plate"`
	Brand     string       `json:"brand"`
	Year      *int         `json:"year"`
	Chassis   string       `json:"chassis"`
	Renavam   string       `json:"renavam"`
	InitialKM *json.Number `json:"initialKm"`
}
type Service struct{ Garage *garage.Service }

func (s *Service) Routes(mux *http.ServeMux) {
	base := "/api/garages/{garageID}/vehicles"
	mux.HandleFunc("GET "+base, s.Garage.RequireMember(s.list))
	mux.HandleFunc("GET "+base+"/{vehicleID}", s.Garage.RequireMember(s.detail))
	mux.HandleFunc("POST "+base, s.Garage.RequireCreatorWrite(s.create))
	mux.HandleFunc("PUT "+base+"/{vehicleID}", s.Garage.RequireCreatorWrite(s.update))
}

const columns = `id,garage_id,name,plate,brand,model_year,chassis,renavam,initial_km::text`

var kmPattern = regexp.MustCompile(`^(0|[1-9][0-9]{0,8})(\.[0-9]{1,3})?$`)

func readInput(w http.ResponseWriter, r *http.Request, creating bool) (Input, map[string]string) {
	var input Input
	r.Body = http.MaxBytesReader(w, r.Body, 8192)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if d.Decode(&input) != nil || d.Decode(new(any)) != io.EOF {
		return input, map[string]string{"form": "invalid JSON"}
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Plate = strings.TrimSpace(input.Plate)
	input.Brand = strings.TrimSpace(input.Brand)
	input.Chassis = strings.TrimSpace(input.Chassis)
	input.Renavam = strings.TrimSpace(input.Renavam)
	fields := map[string]string{}
	for _, f := range []struct {
		name, value string
		limit       int
	}{{"name", input.Name, 120}, {"plate", input.Plate, 32}, {"brand", input.Brand, 100}, {"chassis", input.Chassis, 64}, {"renavam", input.Renavam, 64}} {
		if utf8.RuneCountInString(f.value) > f.limit || !utf8.ValidString(f.value) || strings.ContainsAny(f.value, "\x00\r\n") {
			fields[f.name] = "invalid value"
		}
	}
	if input.Name == "" {
		fields["name"] = "required"
	}
	if input.Year != nil && (*input.Year < 1 || *input.Year > 9999) {
		fields["year"] = "invalid year"
	}
	if creating {
		if input.InitialKM == nil || !kmPattern.MatchString(input.InitialKM.String()) {
			fields["initialKm"] = "non-negative kilometers with up to three decimal places required"
		}
	} else if input.InitialKM != nil {
		fields["initialKm"] = "initial odometer cannot be changed"
	}
	return input, fields
}
func invalid(w http.ResponseWriter, fields map[string]string) {
	reply(w, 400, map[string]any{"error": "invalid vehicle", "fields": fields})
}
func scan(row pgx.Row) (Vehicle, error) {
	var v Vehicle
	err := row.Scan(&v.ID, &v.GarageID, &v.Name, &v.Plate, &v.Brand, &v.Year, &v.Chassis, &v.Renavam, &v.InitialKM)
	return v, err
}
func vehicleID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("vehicleID"), 10, 64)
	if err != nil || id <= 0 {
		reply(w, 404, map[string]string{"error": "vehicle not found"})
		return 0, false
	}
	return id, true
}
func result(w http.ResponseWriter, v Vehicle, err error, status int) {
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			reply(w, 404, map[string]string{"error": "vehicle not found"})
		} else {
			reply(w, 503, map[string]string{"error": "vehicle unavailable"})
		}
		return
	}
	reply(w, status, v)
}
func (s *Service) list(w http.ResponseWriter, r *http.Request) {
	g, _ := garage.FromContext(r.Context())
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `SELECT `+columns+` FROM vehicles WHERE garage_id=$1 ORDER BY id`, g.ID)
	if err != nil {
		reply(w, 503, map[string]string{"error": "vehicle unavailable"})
		return
	}
	defer rows.Close()
	list := []Vehicle{}
	for rows.Next() {
		v, err := scan(rows)
		if err != nil {
			reply(w, 503, map[string]string{"error": "vehicle unavailable"})
			return
		}
		list = append(list, v)
	}
	if rows.Err() != nil {
		reply(w, 503, map[string]string{"error": "vehicle unavailable"})
		return
	}
	reply(w, 200, list)
}
func (s *Service) detail(w http.ResponseWriter, r *http.Request) {
	id, ok := vehicleID(w, r)
	if !ok {
		return
	}
	g, _ := garage.FromContext(r.Context())
	v, err := scan(s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT `+columns+` FROM vehicles WHERE garage_id=$1 AND id=$2`, g.ID, id))
	result(w, v, err, 200)
}
func (s *Service) create(w http.ResponseWriter, r *http.Request) {
	input, fields := readInput(w, r, true)
	if len(fields) > 0 {
		invalid(w, fields)
		return
	}
	g, _ := garage.FromContext(r.Context())
	user, _ := auth.UserFromContext(r.Context())
	v, err := scan(s.Garage.Auth.DB.QueryRow(r.Context(), `INSERT INTO vehicles(garage_id,name,plate,brand,model_year,chassis,renavam,initial_km,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8::numeric,$9) RETURNING `+columns, g.ID, input.Name, input.Plate, input.Brand, input.Year, input.Chassis, input.Renavam, input.InitialKM.String(), user.ID))
	result(w, v, err, 201)
}
func (s *Service) update(w http.ResponseWriter, r *http.Request) {
	id, ok := vehicleID(w, r)
	if !ok {
		return
	}
	input, fields := readInput(w, r, false)
	if len(fields) > 0 {
		invalid(w, fields)
		return
	}
	g, _ := garage.FromContext(r.Context())
	v, err := scan(s.Garage.Auth.DB.QueryRow(r.Context(), `UPDATE vehicles SET name=$1,plate=$2,brand=$3,model_year=$4,chassis=$5,renavam=$6,updated_at=now() WHERE garage_id=$7 AND id=$8 RETURNING `+columns, input.Name, input.Plate, input.Brand, input.Year, input.Chassis, input.Renavam, g.ID, id))
	result(w, v, err, 200)
}
func reply(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}
