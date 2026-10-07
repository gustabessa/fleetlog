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
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if strings.HasSuffix(name, ".webmanifest") && err == nil && !info.IsDir() {
			w.Header().Set("Content-Type", "application/manifest+json")
		}
		assets.ServeHTTP(w, r)
	})
}
