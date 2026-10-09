package apiutil

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"time"
)

func Reply(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}
func Decode(w http.ResponseWriter, r *http.Request, target any) bool {
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
	d.DisallowUnknownFields()
	if d.Decode(target) != nil || d.Decode(new(any)) != io.EOF {
		Reply(w, 400, map[string]string{"error": "invalid JSON"})
		return false
	}
	return true
}
func ID(r *http.Request, name string) int64 {
	id, _ := strconv.ParseInt(r.PathValue(name), 10, 64)
	return id
}
func Date(s string) bool {
	t, e := time.Parse("2006-01-02", s)
	return e == nil && t.Format("2006-01-02") == s && t.Year() > 0
}

var KM = regexp.MustCompile(`^(0|[1-9][0-9]{0,8})(\.[0-9]{1,3})?$`)
