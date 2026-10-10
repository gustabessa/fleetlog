package observability

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type responseWriter struct {
	http.ResponseWriter
	ctx    context.Context
	status int
	bytes  int
}

func (w *responseWriter) LogContext() context.Context { return w.ctx }
func (w *responseWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }
func (w *responseWriter) WriteHeader(status int) {
	if status >= 100 && status < 200 && status != http.StatusSwitchingProtocols {
		w.ResponseWriter.WriteHeader(status)
		return
	}
	if w.status != 0 {
		return
	}
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}
func (w *responseWriter) Write(data []byte) (int, error) {
	if w.status == 0 {
		w.WriteHeader(http.StatusOK)
	}
	n, err := w.ResponseWriter.Write(data)
	w.bytes += n
	if err != nil {
		Error(w.ctx, "HTTP response write failed", err)
	}
	return n, err
}

func HTTP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		var random [16]byte
		if _, err := rand.Read(random[:]); err != nil {
			Error(r.Context(), "request ID generation failed", err)
			http.Error(w, "service unavailable", 503)
			return
		}
		id := hex.EncodeToString(random[:])
		r = r.WithContext(context.WithValue(r.Context(), requestKey{}, id))
		w.Header().Set("X-Request-ID", id)
		response := &responseWriter{ResponseWriter: w, ctx: r.Context()}
		defer func() {
			if recovered := recover(); recovered != nil {
				if recovered == http.ErrAbortHandler {
					panic(recovered)
				}
				Log(r.Context(), slog.LevelError, "HTTP handler panic", "panic_type", fmt.Sprintf("%T", recovered))
				if response.status != 0 {
					panic(http.ErrAbortHandler)
				}
				http.Error(response, "internal server error", http.StatusInternalServerError)
			}
			status := response.status
			if status == 0 {
				status = http.StatusOK
			}
			// Log route templates, never query strings, callback codes or user paths.
			route := r.Pattern
			if route == "" {
				route = "unmatched"
			}
			level := slog.LevelInfo
			if status >= 500 {
				level = slog.LevelError
			} else if status >= 400 {
				level = slog.LevelWarn
			}
			if status < 400 && (route == "GET /healthz" || route == "GET /readyz" || route == "/") {
				level = slog.LevelDebug
			}
			Log(r.Context(), level, "HTTP request completed", "method", r.Method, "route", route, "status", status, "duration_ms", float64(time.Since(start).Microseconds())/1000, "response_bytes", response.bytes)
		}()
		next.ServeHTTP(response, r)
	})
}
