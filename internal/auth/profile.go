package auth

import (
	"encoding/json"
	"io"
	"net/http"
	"slices"
)

// Updates only the authenticated user's defaults. Financial records never read
// these defaults when displaying historical values.
func (s *Service) updateProfile(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Currency *string `json:"currency"`
		Palette  *string `json:"palette"`
		Theme    *string `json:"theme"`
	}
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2048))
	d.DisallowUnknownFields()
	if d.Decode(&input) != nil || d.Decode(new(any)) != io.EOF || (input.Currency == nil && input.Palette == nil && input.Theme == nil) {
		reply(w, 400, map[string]string{"error": "invalid profile"})
		return
	}
	if input.Currency != nil && !slices.Contains([]string{"BRL", "USD", "EUR", "GBP", "ARS", "CAD", "JPY", "CHF"}, *input.Currency) {
		reply(w, 400, map[string]string{"error": "unsupported currency"})
		return
	}
	if input.Palette != nil && !slices.Contains([]string{"original", "orange", "blue", "violet", "green", "rose", "amber", "cyan", "red", "lime", "mono", "copper"}, *input.Palette) {
		reply(w, 400, map[string]string{"error": "invalid palette"})
		return
	}
	if input.Theme != nil && *input.Theme != "light" && *input.Theme != "dark" {
		reply(w, 400, map[string]string{"error": "invalid theme"})
		return
	}
	user, _ := UserFromContext(r.Context())
	err := s.DB.QueryRow(r.Context(), `UPDATE users SET currency=COALESCE($2,currency),palette=COALESCE($3,palette),theme=COALESCE($4,theme) WHERE id=$1 RETURNING currency,palette,theme`, user.ID, input.Currency, input.Palette, input.Theme).Scan(&user.Currency, &user.Palette, &user.Theme)
	if err != nil {
		reply(w, 503, map[string]string{"error": "profile unavailable"})
		return
	}
	reply(w, 200, user)
}
