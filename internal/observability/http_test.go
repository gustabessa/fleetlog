package observability

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/aws/smithy-go"
	smithyhttp "github.com/aws/smithy-go/transport/http"
	"github.com/jackc/pgx/v5/pgconn"
)

func capture(t *testing.T) *bytes.Buffer {
	t.Helper()
	var output bytes.Buffer
	old := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, &slog.HandlerOptions{Level: slog.LevelDebug})))
	t.Cleanup(func() { slog.SetDefault(old) })
	return &output
}

func TestRequestCorrelationAndPrivacy(t *testing.T) {
	output := capture(t)
	mux := http.NewServeMux()
	mux.HandleFunc("PUT /api/items/{id}", func(w http.ResponseWriter, r *http.Request) {
		HTTPError(w, "database failed", &pgconn.PgError{Code: "23505", Message: "private-email", Detail: "private-password"})
		w.WriteHeader(503)
		w.Write([]byte("unavailable"))
	})
	request := httptest.NewRequest("PUT", "/api/items/private-id?token=private-token", strings.NewReader("private-body"))
	request.Header.Set("Authorization", "Bearer private-authorization")
	request.Header.Set("Cookie", "private-cookie")
	request.Header.Set("X-Request-ID", "private-incoming-id")
	response := httptest.NewRecorder()
	HTTP(mux).ServeHTTP(response, request)
	id := response.Header().Get("X-Request-ID")
	if len(id) != 32 || response.Code != 503 {
		t.Fatalf("response: %d %q", response.Code, id)
	}
	if strings.Contains(output.String(), "private-") {
		t.Fatalf("private data logged: %s", output.String())
	}
	decoder := json.NewDecoder(output)
	var dependency, completion map[string]any
	if err := decoder.Decode(&dependency); err != nil {
		t.Fatal(err)
	}
	if err := decoder.Decode(&completion); err != nil {
		t.Fatal(err)
	}
	if dependency["request_id"] != id || dependency["database_code"] != "23505" || completion["request_id"] != id || completion["route"] != "PUT /api/items/{id}" || completion["status"] != float64(503) || completion["response_bytes"] != float64(11) {
		t.Fatalf("unexpected logs: %v %v", dependency, completion)
	}
}

func TestRecoveryAndImplicitStatus(t *testing.T) {
	for _, panicHandler := range []bool{false, true} {
		t.Run(map[bool]string{false: "success", true: "panic"}[panicHandler], func(t *testing.T) {
			output := capture(t)
			handler := HTTP(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if panicHandler {
					panic("private-panic-value")
				}
				w.Write([]byte("ok"))
				w.WriteHeader(503) // A late status must not change the response or logged status.
			}))
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest("GET", "/", nil))
			expected := 200
			if panicHandler {
				expected = 500
			}
			if response.Code != expected || !strings.Contains(output.String(), `"status":`+map[bool]string{false: "200", true: "500"}[panicHandler]) {
				t.Fatalf("status/log mismatch: %d %s", response.Code, output.String())
			}
			if strings.Contains(output.String(), "private-panic-value") {
				t.Fatal("panic value exposed")
			}
		})
	}
}

func TestWrappedErrorsDoNotExposeURLs(t *testing.T) {
	output := capture(t)
	Error(context.Background(), "dependency failed", &url.Error{Op: "Post", URL: "https://private-user:private-password@host/?code=private-token", Err: context.DeadlineExceeded})
	if strings.Contains(output.String(), "private-") || !strings.Contains(output.String(), `"deadline_exceeded":true`) {
		t.Fatalf("unexpected log: %s", output.String())
	}
	Error(context.Background(), "dependency failed", errors.New("private-error"))
	if strings.Contains(output.String(), "private-error") {
		t.Fatal("raw error exposed")
	}
}

func TestUnwrapAndHealthLogLevel(t *testing.T) {
	output := capture(t)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := http.NewResponseController(w).Flush(); err != nil {
			t.Fatal(err)
		}
	})
	response := httptest.NewRecorder()
	HTTP(mux).ServeHTTP(response, httptest.NewRequest("GET", "/healthz", nil))
	if !response.Flushed || !strings.Contains(output.String(), `"level":"DEBUG"`) {
		t.Fatalf("flush/log: %s", output.String())
	}
}

func TestLoggingConfiguration(t *testing.T) {
	old := slog.Default()
	t.Cleanup(func() { slog.SetDefault(old) })
	for _, format := range []string{"json", "text"} {
		t.Setenv("LOG_FORMAT", format)
		t.Setenv("LOG_LEVEL", "warn")
		if err := Configure(); err != nil {
			t.Fatal(err)
		}
		if slog.Default().Enabled(context.Background(), slog.LevelInfo) {
			t.Fatal("level ignored")
		}
	}
	t.Setenv("LOG_LEVEL", "invalid")
	if Configure() == nil {
		t.Fatal("invalid level accepted")
	}
	t.Setenv("LOG_LEVEL", "info")
	t.Setenv("LOG_FORMAT", "invalid")
	if Configure() == nil {
		t.Fatal("invalid format accepted")
	}
}

func TestStorageErrorMetadata(t *testing.T) {
	output := capture(t)
	err := &smithy.OperationError{ServiceID: "S3", OperationName: "PutObject", Err: &smithyhttp.ResponseError{
		Response: &smithyhttp.Response{Response: &http.Response{StatusCode: 403}},
		Err:      &smithy.GenericAPIError{Code: "AccessDenied", Message: "private-storage-message"},
	}}
	Error(context.Background(), "S3 operation failed", err)
	var record map[string]any
	if err := json.Unmarshal(output.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record["storage_code"] != "AccessDenied" || record["upstream_status"] != float64(403) || record["operation"] != "PutObject" || strings.Contains(output.String(), "private-") {
		t.Fatalf("unexpected log: %s", output.String())
	}
}
