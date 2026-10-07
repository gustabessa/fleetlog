package main

import "testing"

func TestHealthURL(t *testing.T) {
	for address, want := range map[string]string{
		":8080":          "http://127.0.0.1:8080/healthz",
		"127.0.0.1:4173": "http://127.0.0.1:4173/healthz",
		"0.0.0.0:8080":   "http://127.0.0.1:8080/healthz",
		"[::]:8080":      "http://[::1]:8080/healthz",
	} {
		t.Run(address, func(t *testing.T) {
			got, err := healthURL(address)
			if err != nil || got != want {
				t.Fatalf("got %q, %v; want %q", got, err, want)
			}
		})
	}
	if _, err := healthURL("invalid"); err == nil {
		t.Fatal("expected invalid address error")
	}
}
