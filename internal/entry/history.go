package entry

import (
	"encoding/json"
	"fleetlog/internal/apiutil"
	"fleetlog/internal/garage"
	"fleetlog/internal/money"
	"fleetlog/internal/odometer"
	"github.com/jackc/pgx/v5"
	"net/http"
	"strconv"
	"strings"
)

const historyCTE = `WITH filtered AS (
 SELECT e.*,v.name AS vehicle_name,v.plate AS vehicle_plate,
 CASE WHEN e.kind='expense' THEN e.details->>'category' ELSE e.kind END AS cost_kind
 FROM entries e JOIN vehicles v ON v.id=e.vehicle_id
 WHERE v.garage_id=$1 AND ($2::bigint=0 OR v.id=$2)
 AND ($3::text='' OR CASE WHEN e.kind='expense' THEN e.details->>'category' ELSE e.kind END=$3)
 AND ($4::date IS NULL OR e.entry_date>=$4) AND ($5::date IS NULL OR e.entry_date<=$5)
 AND ($6::text='' OR strpos(translate(lower(e.title||' '||v.name||' '||v.plate||' '||e.details::text),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc'),$6)>0)
 AND ($7::text='' OR e.currency=$7)
 AND ($8::numeric IS NULL OR e.amount BETWEEN $8::numeric*0.9 AND $8::numeric*1.1)
) `

type HistoryItem struct {
	Entry
	VehicleName string `json:"vehicleName"`
	CostKind    string `json:"costKind"`
}
type History struct {
	Items     []HistoryItem   `json:"items"`
	Total     int64           `json:"total"`
	Page      int             `json:"page"`
	PageSize  int             `json:"pageSize"`
	Totals    json.RawMessage `json:"totals"`
	ByType    json.RawMessage `json:"byType"`
	ByMonth   json.RawMessage `json:"byMonth"`
	ByVehicle json.RawMessage `json:"byVehicle"`
	Distances json.RawMessage `json:"distances"`
}

func parseIntQuery(r *http.Request, name string, fallback int) (int, bool) {
	value := r.URL.Query().Get(name)
	if value == "" {
		return fallback, true
	}
	n, e := strconv.Atoi(value)
	return n, e == nil
}
func (s *Service) history(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	g, _ := garage.FromContext(r.Context())
	page, pok := parseIntQuery(r, "page", 1)
	limit, lok := parseIntQuery(r, "limit", 25)
	vid, vok := parseIntQuery(r, "vehicleId", 0)
	kind := q.Get("kind")
	currency := q.Get("currency")
	from, to := q.Get("from"), q.Get("to")
	price := q.Get("price")
	text := q.Get("q")
	bad := !pok || !lok || !vok || page < 1 || page > 1000000 || limit < 1 || limit > 100 || vid < 0 || !validText(text, 200) || from != "" && !apiutil.Date(from) || to != "" && !apiutil.Date(to) || from != "" && to != "" && from > to || currency != "" && !money.ValidCurrency(currency)
	if kind != "" && kind != "fuel" && kind != "service" && kind != "documentation" && kind != "insurance" && kind != "other" {
		bad = true
	}
	var priceValue any
	if price != "" {
		if _, err := money.Parse(price); err != nil || currency == "" {
			bad = true
		}
		priceValue = price
	}
	if bad {
		apiutil.Reply(w, 400, map[string]string{"error": "invalid history filters"})
		return
	}
	var fromValue, toValue any
	if from != "" {
		fromValue = from
	}
	if to != "" {
		toValue = to
	}
	replacer := strings.NewReplacer("á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a", "é", "e", "è", "e", "ê", "e", "ë", "e", "í", "i", "ì", "i", "î", "i", "ï", "i", "ó", "o", "ò", "o", "õ", "o", "ô", "o", "ö", "o", "ú", "u", "ù", "u", "û", "u", "ü", "u", "ç", "c")
	args := []any{g.ID, vid, kind, fromValue, toValue, replacer.Replace(strings.ToLower(strings.TrimSpace(text))), currency, priceValue}
	tx, err := s.Garage.Auth.DB.BeginTx(r.Context(), pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	result := History{Items: []HistoryItem{}, Page: page, PageSize: limit}
	if err = tx.QueryRow(r.Context(), historyCTE+`SELECT count(*) FROM filtered`, args...).Scan(&result.Total); err != nil {
		odometer.Failure(w, err)
		return
	}
	pageArgs := append(append([]any{}, args...), limit, (page-1)*limit)
	rows, err := tx.Query(r.Context(), historyCTE+`SELECT `+columns+`,e.vehicle_name,e.cost_kind FROM filtered e JOIN users u ON u.id=e.created_by ORDER BY e.entry_date DESC,e.id DESC LIMIT $9 OFFSET $10`, pageArgs...)
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	for rows.Next() {
		var e HistoryItem
		if err = rows.Scan(&e.ID, &e.VehicleID, &e.Kind, &e.Date, &e.Title, &e.Amount, &e.Currency, &e.KM, &e.Details, &e.Author, &e.VehicleName, &e.CostKind); err != nil {
			rows.Close()
			odometer.Failure(w, err)
			return
		}
		result.Items = append(result.Items, e)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	for _, aggregate := range []struct {
		sql  string
		dest *json.RawMessage
	}{
		{`SELECT currency,sum(amount)::text AS amount FROM filtered GROUP BY currency ORDER BY currency`, &result.Totals},
		{`SELECT currency,cost_kind AS kind,sum(amount)::text AS amount FROM filtered GROUP BY currency,cost_kind ORDER BY currency,cost_kind`, &result.ByType},
		{`SELECT currency,to_char(entry_date,'YYYY-MM') AS month,sum(amount)::text AS amount FROM filtered GROUP BY currency,month ORDER BY currency,month`, &result.ByMonth},
		{`SELECT currency,vehicle_id AS "vehicleId",vehicle_name AS vehicle,sum(amount)::text AS amount FROM filtered GROUP BY currency,vehicle_id,vehicle_name ORDER BY currency,vehicle_name`, &result.ByVehicle},
	} {
		if err = tx.QueryRow(r.Context(), historyCTE+`SELECT COALESCE(jsonb_agg(x),'[]') FROM (`+aggregate.sql+`) x`, args...).Scan(aggregate.dest); err != nil {
			odometer.Failure(w, err)
			return
		}
	}
	if err = tx.QueryRow(r.Context(), `SELECT COALESCE(jsonb_agg(x),'[]') FROM (SELECT v.id AS "vehicleId",v.name AS vehicle,CASE WHEN count(*)>1 THEN (max(o.km)-min(o.km))::text END AS distance FROM odometer_readings o JOIN vehicles v ON v.id=o.vehicle_id WHERE v.garage_id=$1 AND ($2::bigint=0 OR v.id=$2) AND ($3::date IS NULL OR o.reading_date>=$3) AND ($4::date IS NULL OR o.reading_date<=$4) GROUP BY v.id,v.name ORDER BY v.id) x`, g.ID, vid, fromValue, toValue).Scan(&result.Distances); err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, result)
}
