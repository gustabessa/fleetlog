package httpserver

import (
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// SPA serves real assets and falls back only for browser navigation routes.
func SPA(files fs.FS) http.Handler {
	assets := http.FileServer(http.FS(files))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if name == "" || name == "." {
			name = "index.html"
		}
		if name == "manifest.webmanifest" {
			w.Header().Set("Vary", "Cookie")
			w.Header().Set("Cache-Control", "private, no-store")
			// Public theme URL also works for OS installation fetches without cookies.
			theme := r.URL.Query().Get("theme")
			if theme == "" {
				if cookie, cookieErr := r.Cookie("fleetlog_pwa_theme"); cookieErr == nil {
					theme = cookie.Value
				}
			}
			if validPWATheme(theme) {
				if content, readErr := fs.ReadFile(files, "pwa/"+theme+".webmanifest"); readErr == nil {
					w.Header().Set("Content-Type", "application/manifest+json")
					w.Header().Set("X-Content-Type-Options", "nosniff")
					if r.Method == http.MethodGet {
						_, _ = w.Write(content)
					}
					return
				}
			}
		}
		info, err := fs.Stat(files, name)
		if err != nil || info.IsDir() {
			if path.Ext(name) != "" || !strings.Contains(r.Header.Get("Accept"), "text/html") {
				http.NotFound(w, r)
				return
			}
			clone := r.Clone(r.Context())
			clone.URL.Path = "/"
			r = clone
		}
		// Revalidate entrypoints and worker manifests; Angular manages hashed assets.
		w.Header().Set("Cache-Control", "no-cache")
		if name == "manifest.webmanifest" {
			w.Header().Set("Cache-Control", "private, no-store")
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if strings.HasSuffix(name, ".webmanifest") && err == nil && !info.IsDir() {
			w.Header().Set("Content-Type", "application/manifest+json")
		}
		assets.ServeHTTP(w, r)
	})
}

func validPWATheme(value string) bool {
	parts := strings.Split(value, "-")
	if len(parts) != 2 || (parts[1] != "light" && parts[1] != "dark") {
		return false
	}
	for _, palette := range []string{"original", "orange", "blue", "violet", "green", "rose", "amber", "cyan", "red", "lime", "mono", "copper"} {
		if parts[0] == palette {
			return true
		}
	}
	return false
}
