package httpserver

import (
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestSPA(t *testing.T) {
	handler := SPA(fstest.MapFS{
		"index.html": &fstest.MapFile{Data: []byte("<html>FleetLog</html>")},
		"ngsw.json":  &fstest.MapFile{Data: []byte(`{"configVersion":1}`)},
	})
	cases := []struct {
		method, path, accept string
		status               int
		body                 string
	}{
		{"GET", "/vehicles/123", "text/html", 200, "<html>FleetLog</html>"},
		{"GET", "/ngsw.json", "*/*", 200, `{"configVersion":1}`},
		{"GET", "/missing.js", "text/html", 404, ""},
		{"GET", "/missing", "application/json", 404, ""},
		{"POST", "/vehicles/123", "text/html", 405, ""},
	}
	for _, tc := range cases {
		t.Run(tc.method+tc.path+tc.accept, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			req.Header.Set("Accept", tc.accept)
			result := httptest.NewRecorder()
			handler.ServeHTTP(result, req)
			if result.Code != tc.status {
				t.Fatalf("status %d; want %d", result.Code, tc.status)
			}
			if tc.body != "" && result.Body.String() != tc.body {
				t.Fatalf("unexpected body %q", result.Body.String())
			}
			if tc.status == 200 && result.Header().Get("Cache-Control") != "no-cache" {
				t.Fatal("entrypoints must revalidate")
			}
		})
	}
}
