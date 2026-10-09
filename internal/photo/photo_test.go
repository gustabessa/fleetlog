package photo_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fleetlog/internal/photo"
	"fleetlog/internal/testutil"
	"fleetlog/internal/vehicle"
	"fmt"
	"image"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func TestPhotoIntegration(t *testing.T) {
	a := testutil.New(t)
	var mu sync.Mutex
	objects := map[string][]byte{}
	failDelete := false
	failPut := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Authorization"), "AWS4-HMAC-SHA256") || !strings.HasPrefix(r.URL.Path, "/private/vehicles/") {
			t.Error("unsigned or invalid S3 request", r.URL.Path)
			w.WriteHeader(403)
			return
		}
		mu.Lock()
		defer mu.Unlock()
		switch r.Method {
		case "PUT":
			b, _ := io.ReadAll(r.Body)
			objects[r.URL.Path] = b
			if failPut {
				w.WriteHeader(500)
			}
		case "GET":
			b, ok := objects[r.URL.Path]
			if !ok {
				w.WriteHeader(404)
				return
			}
			w.Write(b)
		case "DELETE":
			if failDelete {
				w.WriteHeader(500)
				return
			}
			delete(objects, r.URL.Path)
			w.WriteHeader(204)
		}
	}))
	defer server.Close()
	store, err := photo.NewS3(server.URL, "us-east-1", "private", "test-key", "test-secret", true)
	if err != nil {
		t.Fatal(err)
	}
	s := &photo.Service{Garage: a.Garage, Store: store}
	s.Routes(a.Mux)
	(&vehicle.Service{Garage: a.Garage}).Routes(a.Mux)
	base := fmt.Sprintf("/api/garages/%d/vehicles", a.GarageID)
	w := a.Request("POST", base, `{"name":"Car","initialKm":0}`)
	var v vehicle.Vehicle
	json.Unmarshal(w.Body.Bytes(), &v)
	url := fmt.Sprintf("%s/%d/image", base, v.ID)
	var b bytes.Buffer
	png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 2, 2)))
	w = a.Request("PUT", url, "<svg>bad</svg>")
	if w.Code != 400 {
		t.Fatal("bad image accepted", w.Code)
	}
	noteResponse := a.Request("POST", fmt.Sprintf("%s/%d/notes", base, v.ID), `{"content":"Photo note"}`)
	if noteResponse.Code != 200 {
		t.Fatal(noteResponse.Code, noteResponse.Body.String())
	}
	noteID := noteResponse.Header().Get("X-Note-ID")
	noteURL := fmt.Sprintf("%s/%d/notes/%s/image", base, v.ID, noteID)
	if w = a.Request("PUT", noteURL, b.String()); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if w = a.Request("GET", noteURL, ""); w.Code != 200 || !bytes.Equal(w.Body.Bytes(), b.Bytes()) {
		t.Fatal("note image read failed", w.Code)
	}
	if err = s.Cleanup(context.Background()); err != nil {
		t.Fatal(err)
	}
	if w = a.Request("GET", noteURL, ""); w.Code != 200 {
		t.Fatal("cleanup deleted active note", w.Code)
	}
	if w = a.Request("PUT", fmt.Sprintf("%s/%d/notes/%s/image", base, v.ID+100, noteID), b.String()); w.Code != 404 {
		t.Fatal("note isolation failed", w.Code)
	}
	if w = a.Request("DELETE", fmt.Sprintf("%s/%d/notes/%s", base, v.ID, noteID), `{}`); w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if err = s.Cleanup(context.Background()); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		w = a.Request("PUT", url, b.String())
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
	}
	w = a.Request("GET", url, "")
	if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), b.Bytes()) || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal(w.Code, w.Body.String())
	}
	mu.Lock()
	failDelete = true
	mu.Unlock()
	if err = s.Cleanup(context.Background()); err != nil {
		t.Fatal(err)
	}
	var count int
	a.Auth.DB.QueryRow(context.Background(), `SELECT count(*) FROM photo_objects WHERE state='delete'`).Scan(&count)
	if count != 1 {
		t.Fatal("cleanup not retained", count)
	}
	mu.Lock()
	failDelete = false
	mu.Unlock()
	if err = s.Cleanup(context.Background()); err != nil {
		t.Fatal(err)
	}
	w = a.Request("DELETE", url, `{}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	if err = s.Cleanup(context.Background()); err != nil {
		t.Fatal(err)
	}
	mu.Lock()
	remaining := len(objects)
	mu.Unlock()
	if remaining != 0 {
		t.Fatal("orphaned images", remaining)
	}
	mu.Lock()
	failPut = true
	mu.Unlock()
	w = a.Request("PUT", url, b.String())
	if w.Code != 503 {
		t.Fatal(w.Code, w.Body.String())
	}
	a.Auth.DB.Exec(context.Background(), `UPDATE photo_objects SET created_at=now()-interval '2 hours' WHERE state='pending'`)
	mu.Lock()
	failPut = false
	mu.Unlock()
	if err = s.Cleanup(context.Background()); err != nil {
		t.Fatal(err)
	}
	mu.Lock()
	remaining = len(objects)
	mu.Unlock()
	if remaining != 0 {
		t.Fatal("failed upload orphan", remaining)
	}
	w = a.Request("GET", fmt.Sprintf("/api/garages/%d/vehicles/%d/image", a.GarageID+99, v.ID), "")
	if w.Code != 404 {
		t.Fatal("image isolation failed", w.Code)
	}
}
func TestImageLimits(t *testing.T) {
	var b bytes.Buffer
	png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 2, 2)))
	mime, w, h, err := photo.Validate(b.Bytes())
	if err != nil || mime != "image/png" || w != 2 || h != 2 {
		t.Fatal(mime, w, h, err)
	}
	if _, _, _, err = photo.Validate(b.Bytes()[:20]); err == nil {
		t.Fatal("truncated image accepted")
	}
	if _, _, _, err = photo.Validate(make([]byte, photo.MaxBytes+1)); err == nil {
		t.Fatal("large image accepted")
	}
}
