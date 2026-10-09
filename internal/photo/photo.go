package photo

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fleetlog/internal/apiutil"
	"fleetlog/internal/garage"
	"fleetlog/internal/odometer"
	_ "golang.org/x/image/webp"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"time"
)

const MaxBytes = 10 * 1024 * 1024

type Service struct {
	Garage *garage.Service
	Store  Store
}

func (s *Service) Routes(m *http.ServeMux) {
	base := "/api/garages/{garageID}/vehicles/{vehicleID}/image"
	m.HandleFunc("GET "+base, s.Garage.RequireMember(s.read))
	m.HandleFunc("PUT "+base, s.Garage.RequireMember(s.authorizeUpload(s.upload)))
	m.HandleFunc("DELETE "+base, s.Garage.RequireMemberWrite(s.remove))
}

// Uploads are raw image bytes, with same-origin protection rather than the JSON write wrapper.
func (s *Service) authorizeUpload(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") != s.Garage.Auth.Origin {
			apiutil.Reply(w, 403, map[string]string{"error": "upload not allowed"})
			return
		}
		next(w, r)
	}
}
func (s *Service) ready(w http.ResponseWriter) bool {
	if s.Store == nil {
		apiutil.Reply(w, 503, map[string]string{"error": "image storage not configured"})
		return false
	}
	return true
}
func Validate(data []byte) (string, int, int, error) {
	if len(data) == 0 || len(data) > MaxBytes {
		return "", 0, 0, errors.New("image exceeds 10 MB")
	}
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || cfg.Width <= 0 || cfg.Height <= 0 || int64(cfg.Width)*int64(cfg.Height) > 20_000_000 {
		return "", 0, 0, errors.New("invalid image or image exceeds 20 megapixels")
	}
	mime := map[string]string{"jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[format]
	if mime == "" {
		return "", 0, 0, errors.New("only JPEG, PNG and WebP supported")
	}
	if _, _, err = image.Decode(bytes.NewReader(data)); err != nil {
		return "", 0, 0, errors.New("invalid image content")
	}
	return mime, cfg.Width, cfg.Height, nil
}
func (s *Service) upload(w http.ResponseWriter, r *http.Request) {
	if !s.ready(w) {
		return
	}
	g, _ := garage.FromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
	var exists int64
	if err := s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT id FROM vehicles WHERE garage_id=$1 AND id=$2`, g.ID, vid).Scan(&exists); err != nil {
		odometer.Failure(w, err)
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxBytes))
	if err != nil {
		apiutil.Reply(w, 413, map[string]string{"error": "image exceeds 10 MB"})
		return
	}
	kind, width, height, err := Validate(data)
	if err != nil {
		apiutil.Reply(w, 400, map[string]string{"error": err.Error()})
		return
	}
	random := make([]byte, 24)
	if _, err = rand.Read(random); err != nil {
		odometer.Failure(w, err)
		return
	}
	key := "vehicles/" + hex.EncodeToString(random)
	// Reserve before uploading: even an ambiguous S3 failure has a durable cleanup record.
	if _, err = s.Garage.Auth.DB.Exec(r.Context(), `INSERT INTO photo_objects(object_key,content_type,byte_size,width,height,state) VALUES($1,$2,$3,$4,$5,'pending')`, key, kind, len(data), width, height); err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = s.Store.Put(r.Context(), key, data, kind); err != nil {
		apiutil.Reply(w, 503, map[string]string{"error": "image upload failed"})
		return
	}
	tx, err := s.Garage.Auth.DB.Begin(r.Context())
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	if err = odometer.Lock(r.Context(), tx, g.ID, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `UPDATE photo_objects SET state='delete' WHERE object_key=(SELECT object_key FROM vehicle_photos WHERE vehicle_id=$1)`, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO vehicle_photos(vehicle_id,object_key) VALUES($1,$2) ON CONFLICT(vehicle_id) DO UPDATE SET object_key=excluded.object_key`, vid, key); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `UPDATE photo_objects SET state='active' WHERE object_key=$1`, key); err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, map[string]string{"version": key})
}
func (s *Service) read(w http.ResponseWriter, r *http.Request) {
	if !s.ready(w) {
		return
	}
	g, _ := garage.FromContext(r.Context())
	var key, kind string
	var size int64
	err := s.Garage.Auth.DB.QueryRow(r.Context(), `SELECT p.object_key,o.content_type,o.byte_size FROM vehicle_photos p JOIN vehicles v ON v.id=p.vehicle_id JOIN photo_objects o ON o.object_key=p.object_key WHERE v.garage_id=$1 AND v.id=$2 AND o.state='active'`, g.ID, apiutil.ID(r, "vehicleID")).Scan(&key, &kind, &size)
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	body, err := s.Store.Get(r.Context(), key)
	if err != nil {
		apiutil.Reply(w, 503, map[string]string{"error": "image unavailable"})
		return
	}
	defer body.Close()
	data, err := io.ReadAll(io.LimitReader(body, MaxBytes+1))
	if err != nil || int64(len(data)) != size {
		apiutil.Reply(w, 503, map[string]string{"error": "image unavailable"})
		return
	}
	w.Header().Set("Content-Type", kind)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	w.Write(data)
}
func (s *Service) remove(w http.ResponseWriter, r *http.Request) {
	if !s.ready(w) {
		return
	}
	g, _ := garage.FromContext(r.Context())
	vid := apiutil.ID(r, "vehicleID")
	tx, err := s.Garage.Auth.DB.Begin(r.Context())
	if err != nil {
		odometer.Failure(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	if err = odometer.Lock(r.Context(), tx, g.ID, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `UPDATE photo_objects SET state='delete' WHERE object_key=(SELECT object_key FROM vehicle_photos WHERE vehicle_id=$1)`, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if _, err = tx.Exec(r.Context(), `DELETE FROM vehicle_photos WHERE vehicle_id=$1`, vid); err != nil {
		odometer.Failure(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		odometer.Failure(w, err)
		return
	}
	apiutil.Reply(w, 200, map[string]bool{"deleted": true})
}

// Cleanup retries failed deletions after restart. Pending reservations older than
// one hour cover upload failures/crashes; active photos are never candidates.
func (s *Service) Cleanup(ctx context.Context) error {
	if s.Store == nil {
		return nil
	}
	tx, err := s.Garage.Auth.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	rows, err := tx.Query(ctx, `SELECT object_key FROM photo_objects WHERE (state='delete' OR state='pending' AND created_at<now()-interval '1 hour') AND NOT EXISTS(SELECT 1 FROM vehicle_photos WHERE vehicle_photos.object_key=photo_objects.object_key) ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED`)
	if err != nil {
		return err
	}
	keys := []string{}
	for rows.Next() {
		var key string
		if err = rows.Scan(&key); err != nil {
			rows.Close()
			return err
		}
		keys = append(keys, key)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, key := range keys {
		if err = s.Store.Delete(ctx, key); err != nil {
			continue
		}
		if _, err = tx.Exec(ctx, `DELETE FROM photo_objects WHERE object_key=$1`, key); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
func (s *Service) Run(ctx context.Context) {
	if s.Store == nil {
		return
	}
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		cleanup, cancel := context.WithTimeout(ctx, 25*time.Second)
		_ = s.Cleanup(cleanup)
		cancel()
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
