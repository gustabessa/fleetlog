package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"

	"fleetlog/internal/auth"
	"fleetlog/internal/entry"
	"fleetlog/internal/garage"
	"fleetlog/internal/odometer"
	"fleetlog/internal/photo"
	"fleetlog/internal/reminder"
	"fleetlog/internal/vehicle"
)

// Check the documented routes against the actual ServeMux registrations, without
// contacting dependencies or replacing the API's auth/authorization behavior.
func TestOpenAPIRoutes(t *testing.T) {
	data, err := os.ReadFile("../../docs/openapi.json")
	if err != nil {
		t.Fatal(err)
	}
	var spec struct {
		Paths map[string]map[string]struct {
			OperationID string `json:"operationId"`
			Parameters  []struct {
				Name     string `json:"name"`
				In       string `json:"in"`
				Required bool   `json:"required"`
			} `json:"parameters"`
		} `json:"paths"`
	}
	if err = json.Unmarshal(data, &spec); err != nil {
		t.Fatal(err)
	}
	authentication := &auth.Service{Origin: "http://fleetlog.test"}
	garages := &garage.Service{Auth: authentication}
	mux := http.NewServeMux()
	authentication.Routes(mux)
	garages.Routes(mux)
	(&vehicle.Service{Garage: garages}).Routes(mux)
	(&odometer.Service{Garage: garages}).Routes(mux)
	(&entry.Service{Garage: garages}).Routes(mux)
	(&reminder.Service{Garage: garages}).Routes(mux)
	(&photo.Service{Garage: garages}).Routes(mux)
	mux.HandleFunc("GET /healthz", func(http.ResponseWriter, *http.Request) {})
	ids := map[string]bool{}
	parameters := regexp.MustCompile(`\{([^}]+)\}`)
	count := 0
	for path, operations := range spec.Paths {
		for method, op := range operations {
			count++
			if op.OperationID == "" || ids[op.OperationID] {
				t.Fatalf("missing/duplicate operationId: %s %s", method, path)
			}
			ids[op.OperationID] = true
			for _, match := range parameters.FindAllStringSubmatch(path, -1) {
				found := false
				for _, p := range op.Parameters {
					if p.Name == match[1] && p.In == "path" && p.Required {
						found = true
					}
				}
				if !found {
					t.Errorf("missing required parameter %s: %s %s", match[1], method, path)
				}
			}
			url := parameters.ReplaceAllString(path, "1")
			_, pattern := mux.Handler(httptest.NewRequest(strings.ToUpper(method), url, nil))
			expected := strings.ToUpper(method) + " " + path
			if pattern != expected {
				t.Errorf("documented route %s resolves to %q", expected, pattern)
			}
		}
	}
	if count == 0 {
		t.Fatal("OpenAPI must describe operations")
	}
}
