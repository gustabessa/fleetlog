package entry

import (
	"context"
	"encoding/json"
	"errors"
	"fleetlog/internal/apiutil"
	"fleetlog/internal/garage"
	"fleetlog/internal/money"
	"fleetlog/internal/odometer"
	"github.com/jackc/pgx/v5"
	"math/big"
	"net/http"
	"slices"
	"strconv"
	"strings"
)

type Item struct {
	RefID     int64  `json:"refId"`
	Name      string `json:"name"`
	Brand     string `json:"brand"`
	Code      string `json:"code"`
	Unit      string `json:"unit"`
	Kind      string `json:"kind"`
	Quantity  string `json:"quantity"`
	UnitPrice string `json:"unitPrice"`
	Currency  string `json:"currency"`
}
type Maintenance struct {
	Mode       string `json:"mode"`
	Items      []Item `json:"items"`
	Discount   string `json:"discount"`
	Adjustment string `json:"adjustment"`
}

func maintenanceDetails(input *Input) (json.RawMessage, error) {
	m := input.Service
	if m == nil {
		m = &Maintenance{Mode: "direct"}
		input.Service = m
	}
	if m.Mode == "" {
		m.Mode = "direct"
	}
	if m.Mode != "direct" && m.Mode != "detailed" {
		return nil, errors.New("invalid maintenance mode")
	}
	total := new(big.Rat)
	if m.Mode == "direct" {
		if len(m.Items) > 0 || m.Discount != "" && m.Discount != "0" || m.Adjustment != "" && m.Adjustment != "0" {
			return nil, errors.New("direct total cannot include item adjustments")
		}
		v, err := money.Parse(input.Amount)
		if err != nil {
			return nil, err
		}
		total = v
		m.Items = []Item{}
	} else {
		if len(m.Items) == 0 || len(m.Items) > 100 {
			return nil, errors.New("between 1 and 100 items required")
		}
		for i := range m.Items {
			item := &m.Items[i]
			item.Name = strings.TrimSpace(item.Name)
			item.Brand = strings.TrimSpace(item.Brand)
			item.Code = strings.TrimSpace(item.Code)
			if item.RefID < 0 || !validText(item.Name, 200) || !validText(item.Brand, 100) || !validText(item.Code, 100) || item.RefID == 0 && item.Name == "" || !slices.Contains([]string{"unit", "liter", "hour"}, item.Unit) || !slices.Contains([]string{"part", "labor"}, item.Kind) || item.Currency != input.Currency {
				return nil, errors.New("invalid item or mixed currencies")
			}
			q, e := money.Parse(item.Quantity)
			if e != nil || q.Sign() <= 0 {
				return nil, errors.New("positive quantity required")
			}
			price, e := money.Parse(item.UnitPrice)
			if e != nil {
				return nil, e
			}
			total.Add(total, new(big.Rat).Mul(q, price))
		}
		if m.Discount == "" {
			m.Discount = "0"
		}
		discount, e := money.Parse(m.Discount)
		if e != nil {
			return nil, e
		}
		total.Sub(total, discount)
		if m.Adjustment == "" {
			m.Adjustment = "0"
		}
		adjustText := m.Adjustment
		negative := strings.HasPrefix(adjustText, "-")
		adjustText = strings.TrimPrefix(adjustText, "-")
		adjust, e := money.Parse(adjustText)
		if e != nil {
			return nil, e
		}
		if negative {
			adjust.Neg(adjust)
		}
		total.Add(total, adjust)
	}
	if total.Sign() < 0 {
		return nil, errors.New("maintenance total cannot be negative")
	}
	input.Amount = money.Round(total, money.Scale(input.Currency))
	if _, e := money.Parse(input.Amount); e != nil {
		return nil, e
	}
	if input.Title == "" {
		input.Title = "Manutenção"
	}
	return json.Marshal(m)
}

// Resolve references inside the entry transaction; occurrences carry immutable name/price snapshots.
func resolveItems(ctx context.Context, tx pgx.Tx, garageID int64, input *Input) (json.RawMessage, error) {
	m := input.Service
	if m == nil {
		return nil, nil
	}
	for i := range m.Items {
		item := &m.Items[i]
		if item.RefID == 0 {
			err := tx.QueryRow(ctx, `INSERT INTO item_references(garage_id,name,brand,code,unit) VALUES($1,$2,$3,$4,$5) ON CONFLICT(garage_id,name,brand,code,unit) DO UPDATE SET name=excluded.name RETURNING id`, garageID, item.Name, item.Brand, item.Code, item.Unit).Scan(&item.RefID)
			if err != nil {
				return nil, err
			}
		}
		if err := tx.QueryRow(ctx, `SELECT name,brand,code,unit FROM item_references WHERE id=$1 AND garage_id=$2`, item.RefID, garageID).Scan(&item.Name, &item.Brand, &item.Code, &item.Unit); err != nil {
			return nil, err
		}
	}
	return json.Marshal(m)
}
func (s *Service) itemRoutes(m *http.ServeMux) {
	base := "/api/garages/{garageID}/items"
	m.HandleFunc("GET "+base, s.Garage.RequireMember(s.items))
	m.HandleFunc("GET "+base+"/{itemID}/prices", s.Garage.RequireMember(s.prices))
}
func (s *Service) items(w http.ResponseWriter, r *http.Request) {
	g, _ := garage.FromContext(r.Context())
	query := r.URL.Query().Get("q")
	if len(query) > 200 {
		apiutil.Reply(w, 400, map[string]string{"error": "query too long"})
		return
	}
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `SELECT id,name,brand,code,unit FROM item_references WHERE garage_id=$1 AND (name||' '||brand||' '||code) ILIKE '%'||$2||'%' ORDER BY name,id LIMIT 200`, g.ID, query)
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer rows.Close()
	list := []Item{}
	for rows.Next() {
		var i Item
		if err = rows.Scan(&i.RefID, &i.Name, &i.Brand, &i.Code, &i.Unit); err != nil {
			odometer.Failure(w, err)
			return
		}
		list = append(list, i)
	}
	if rows.Err() != nil {
		odometer.Failure(w, rows.Err())
		return
	}
	apiutil.Reply(w, 200, list)
}
func (s *Service) prices(w http.ResponseWriter, r *http.Request) {
	g, _ := garage.FromContext(r.Context())
	id := apiutil.ID(r, "itemID")
	var found int64
	if err := s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT id FROM item_references WHERE id=$1 AND garage_id=$2`, id, g.ID).Scan(&found); err != nil {
		odometer.Failure(w, err)
		return
	}
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `SELECT jsonb_build_object('entryId',e.id,'date',e.entry_date,'vehicle',v.name,'vehicleId',v.id,'currency',e.currency,'quantity',i->>'quantity','unitPrice',i->>'unitPrice','unit',i->>'unit','name',i->>'name') FROM entries e JOIN vehicles v ON v.id=e.vehicle_id CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.details->'items','[]')) i WHERE v.garage_id=$1 AND e.kind='service' AND i->>'refId'=$2 ORDER BY e.entry_date DESC,e.id DESC`, g.ID, strconv.FormatInt(id, 10))
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer rows.Close()
	list := []json.RawMessage{}
	for rows.Next() {
		var p json.RawMessage
		if err = rows.Scan(&p); err != nil {
			odometer.Failure(w, err)
			return
		}
		list = append(list, p)
	}
	if rows.Err() != nil {
		odometer.Failure(w, rows.Err())
		return
	}
	apiutil.Reply(w, 200, list)
}
