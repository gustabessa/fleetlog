package garage

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"fleetlog/internal/auth"
	"github.com/jackc/pgx/v5"
)

type Garage struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}
type garageKey struct{}

func FromContext(ctx context.Context) (Garage, bool) {
	g, ok := ctx.Value(garageKey{}).(Garage)
	return g, ok
}

type Service struct{ Auth *auth.Service }

func (s *Service) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/garages", s.Auth.RequireUser(s.list))
	mux.HandleFunc("GET /api/garages/{garageID}", s.RequireMember(s.detail))
}

// RequireMember is reusable for future routes under /api/garages/{garageID}/... .
// Membership is read on every request; nonexistent and inaccessible IDs both return 404.
func (s *Service) RequireMember(next http.HandlerFunc) http.HandlerFunc {
	return s.Auth.RequireUser(func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(r.PathValue("garageID"), 10, 64)
		if err != nil || id <= 0 {
			reply(w, 404, map[string]string{"error": "garage not found"})
			return
		}
		user, _ := auth.UserFromContext(r.Context())
		var g Garage
		err = s.Auth.DB.QueryRow(r.Context(), `SELECT g.id,g.name FROM garages g JOIN garage_members m ON m.garage_id=g.id WHERE g.id=$1 AND m.user_id=$2`, id, user.ID).Scan(&g.ID, &g.Name)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				reply(w, 404, map[string]string{"error": "garage not found"})
			} else {
				reply(w, 503, map[string]string{"error": "garage unavailable"})
			}
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), garageKey{}, g)))
	})
}
func (s *Service) list(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFromContext(r.Context())
	rows, err := s.Auth.DB.Query(r.Context(), `SELECT g.id,g.name FROM garages g JOIN garage_members m ON m.garage_id=g.id WHERE m.user_id=$1 ORDER BY g.id`, user.ID)
	if err != nil {
		reply(w, 503, map[string]string{"error": "garage unavailable"})
		return
	}
	defer rows.Close()
	garages := []Garage{}
	for rows.Next() {
		var g Garage
		if rows.Scan(&g.ID, &g.Name) != nil {
			reply(w, 503, map[string]string{"error": "garage unavailable"})
			return
		}
		garages = append(garages, g)
	}
	if rows.Err() != nil {
		reply(w, 503, map[string]string{"error": "garage unavailable"})
		return
	}
	reply(w, 200, garages)
}
func (s *Service) detail(w http.ResponseWriter, r *http.Request) {
	g, _ := FromContext(r.Context())
	reply(w, 200, g)
}
func reply(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}
