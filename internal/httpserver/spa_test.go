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

func TestThemeManifest(t *testing.T) {
	handler := SPA(fstest.MapFS{
		"manifest.webmanifest":        {Data: []byte(`{"id":"/","name":"default"}`)},
		"pwa/orange-dark.webmanifest": {Data: []byte(`{"id":"/","name":"orange-dark"}`)},
	})
	for _, value := range []string{"orange-dark", "../../secret", "unknown-dark", "original-light", ""} {
		req := httptest.NewRequest("GET", "/manifest.webmanifest", nil)
		if value != "" {
			req.Header.Set("Cookie", "fleetlog_pwa_theme="+value)
		}
		result := httptest.NewRecorder()
		handler.ServeHTTP(result, req)
		expected := `{"id":"/","name":"default"}`
		if value == "orange-dark" {
			expected = `{"id":"/","name":"orange-dark"}`
		}
		if result.Code != 200 || result.Body.String() != expected {
			t.Fatalf("theme %q: %d %s", value, result.Code, result.Body.String())
		}
		if result.Header().Get("Cache-Control") != "private, no-store" || result.Header().Get("Vary") != "Cookie" {
			t.Fatal("personal manifest must not share caches")
		}
	}
}

func TestPublicThemeManifestURL(t *testing.T) {
	handler := SPA(fstest.MapFS{"pwa/blue-light.webmanifest": {Data: []byte(`{"id":"/","icons":[]}`)}})
	req := httptest.NewRequest("GET", "/manifest.webmanifest?theme=blue-light", nil)
	result := httptest.NewRecorder()
	handler.ServeHTTP(result, req)
	if result.Code != 200 || result.Body.String() != `{"id":"/","icons":[]}` {
		t.Fatal("installation fetch without cookies must receive selected theme")
	}
}
