package entry

import (
	"encoding/json"
	"fleetlog/internal/apiutil"
	"fleetlog/internal/money"
	"fleetlog/internal/odometer"
	"math/big"
	"net/http"
)

type Consumption struct {
	EntryID  int64   `json:"entryId"`
	Date     string  `json:"date"`
	Status   string  `json:"status"`
	KML      *string `json:"kmPerLiter"`
	Distance *string `json:"distance"`
	Liters   *string `json:"liters"`
}

func Calculate(entries []Entry) []Consumption {
	result := []Consumption{}
	var reference *big.Rat
	liters := new(big.Rat)
	incomplete := false
	for _, e := range entries {
		var f Fuel
		json.Unmarshal(e.Details, &f)
		row := Consumption{EntryID: e.ID, Date: e.Date, Status: "partial"}
		km := new(big.Rat)
		if e.KM == nil {
			row.Status = "incomplete"
			incomplete = true
			result = append(result, row)
			continue
		}
		if _, ok := km.SetString(*e.KM); !ok {
			incomplete = true
			result = append(result, row)
			continue
		}
		amount, err := money.Parse(f.Liters)
		if err != nil {
			incomplete = true
			result = append(result, row)
			continue
		}
		if reference != nil {
			liters.Add(liters, amount)
		}
		incomplete = incomplete || f.Incomplete
		if f.Full {
			if reference == nil {
				row.Status = "reference"
			} else if incomplete {
				row.Status = "incomplete"
			} else {
				distance := new(big.Rat).Sub(km, reference)
				if distance.Sign() <= 0 || liters.Sign() <= 0 {
					row.Status = "invalid"
				} else {
					row.Status = "valid"
					value := money.Round(new(big.Rat).Quo(distance, liters), 3)
					d := money.Round(distance, 3)
					l := money.Round(liters, 6)
					row.KML = &value
					row.Distance = &d
					row.Liters = &l
				}
			}
			reference = new(big.Rat).Set(km)
			liters.SetInt64(0)
			incomplete = false
		}
		result = append(result, row)
	}
	return result
}
func (s *Service) consumption(w http.ResponseWriter, r *http.Request) {
	if err := s.exists(r); err != nil {
		odometer.Failure(w, err)
		return
	}
	rows, err := s.Garage.Auth.DB.Query(r.Context(), `SELECT `+columns+` FROM entries e JOIN users u ON u.id=e.created_by WHERE e.vehicle_id=$1 AND e.kind='fuel' ORDER BY e.entry_date,e.km NULLS LAST,e.id`, apiutil.ID(r, "vehicleID"))
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
	apiutil.Reply(w, 200, Calculate(list))
}
