FROM node:22.23.3-alpine AS frontend
WORKDIR /build/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM golang:1.27.1-alpine AS backend
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY internal/ internal/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /fleetlog ./cmd/fleetlog

FROM alpine:3.23
RUN apk add --no-cache ca-certificates && addgroup -S fleetlog && adduser -S -G fleetlog fleetlog
WORKDIR /app
COPY --from=backend /fleetlog /app/fleetlog
COPY --from=frontend /build/web/dist/fleetlog/browser /app/web
ENV HTTP_ADDR=:8080 STATIC_DIR=/app/web
USER fleetlog
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD ["/app/fleetlog", "healthcheck"]
ENTRYPOINT ["/app/fleetlog"]
