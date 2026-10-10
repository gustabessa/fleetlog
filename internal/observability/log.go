// Package observability provides request correlation and safe error metadata.
package observability

import (
	"context"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strings"
	"syscall"

	"github.com/aws/smithy-go"
	smithyhttp "github.com/aws/smithy-go/transport/http"
	"github.com/jackc/pgx/v5/pgconn"
)

type requestKey struct{}

func Configure() error {
	level := slog.LevelInfo
	if value := os.Getenv("LOG_LEVEL"); value != "" {
		if err := level.UnmarshalText([]byte(value)); err != nil {
			return fmt.Errorf("invalid LOG_LEVEL: use debug, info, warn or error")
		}
	}
	format := strings.ToLower(os.Getenv("LOG_FORMAT"))
	options := &slog.HandlerOptions{Level: level}
	var handler slog.Handler
	switch format {
	case "", "json":
		handler = slog.NewJSONHandler(os.Stdout, options)
	case "text":
		handler = slog.NewTextHandler(os.Stdout, options)
	default:
		return fmt.Errorf("invalid LOG_FORMAT: use json or text")
	}
	slog.SetDefault(slog.New(handler))
	return nil
}

func Log(ctx context.Context, level slog.Level, message string, args ...any) {
	if id, ok := ctx.Value(requestKey{}).(string); ok {
		args = append(args, "request_id", id)
	}
	slog.Log(ctx, level, message, args...)
}

// Error never prints arbitrary error strings: database details, OAuth responses
// and URL query strings can contain credentials or private user data.
func Error(ctx context.Context, message string, err error, args ...any) {
	if err != nil {
		args = append(args, "error_type", fmt.Sprintf("%T", err))
		var database *pgconn.PgError
		if errors.As(err, &database) {
			args = append(args, "database_code", database.Code)
		}
		var api smithy.APIError
		if errors.As(err, &api) {
			args = append(args, "storage_code", api.ErrorCode())
		}
		var response *smithyhttp.ResponseError
		if errors.As(err, &response) {
			args = append(args, "upstream_status", response.HTTPStatusCode())
		}
		var operation *smithy.OperationError
		if errors.As(err, &operation) {
			args = append(args, "service", operation.Service(), "operation", operation.Operation())
		}
		var unknownCA x509.UnknownAuthorityError
		var invalidCertificate x509.CertificateInvalidError
		var hostname x509.HostnameError
		if errors.As(err, &unknownCA) || errors.As(err, &invalidCertificate) || errors.As(err, &hostname) {
			args = append(args, "tls_failure", true)
		}
		for _, failure := range []struct {
			cause error
			name  string
		}{{syscall.ECONNREFUSED, "connection_refused"}, {syscall.ECONNRESET, "connection_reset"}, {syscall.ENETUNREACH, "network_unreachable"}} {
			if errors.Is(err, failure.cause) {
				args = append(args, failure.name, true)
			}
		}
		var dns *net.DNSError
		if errors.As(err, &dns) {
			args = append(args, "dns_failure", true)
		}
		var network net.Error
		if errors.As(err, &network) {
			args = append(args, "timeout", network.Timeout())
		}
		if errors.Is(err, context.Canceled) {
			args = append(args, "canceled", true)
		}
		if errors.Is(err, context.DeadlineExceeded) {
			args = append(args, "deadline_exceeded", true)
		}
	}
	Log(ctx, slog.LevelError, message, args...)
}

// HTTPError also works in handlers that only receive a ResponseWriter.
func HTTPError(w http.ResponseWriter, message string, err error) {
	ctx := context.Background()
	if contextual, ok := w.(interface{ LogContext() context.Context }); ok {
		ctx = contextual.LogContext()
	}
	Error(ctx, message, err)
}
