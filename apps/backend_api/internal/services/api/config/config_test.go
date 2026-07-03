package config

import (
	"testing"
	"time"
)

type fakeEnv map[string]string

func (f fakeEnv) Keys() []string {
	keys := make([]string, 0, len(f))
	for key := range f {
		keys = append(keys, key)
	}
	return keys
}

func (f fakeEnv) ContainsKey(key string) bool {
	_, ok := f[key]
	return ok
}

func (f fakeEnv) Get(key string) string {
	return f[key]
}

func (f fakeEnv) Set(key string, value string) error {
	f[key] = value
	return nil
}

func (f fakeEnv) Unset(key string, _ string) error {
	delete(f, key)
	return nil
}

func (f fakeEnv) Load(key string) error {
	return nil
}

func (f fakeEnv) ReplaceAll(content string) ([]byte, error) {
	return []byte(content), nil
}

func (f fakeEnv) Presents(keys []string) error {
	return nil
}

func (f fakeEnv) Int(key string) (int, error) {
	return 0, nil
}

func (f fakeEnv) GetWithDefault(key string, fallback string) string {
	if value := f.Get(key); value != "" {
		return value
	}
	return fallback
}

func TestLoadFromUsesSingleBaseUrlPerService(t *testing.T) {
	cfg, err := LoadFrom(fakeEnv{
		"PORT":                          "9000",
		"DB_NAME":                       "rollfinder",
		"DB_USER":                       "postgres",
		"DB_PASSWORD":                   "postgres",
		"DB_HOST":                       "db",
		"DB_PORT":                       "5432",
		"READ_TIMEOUT":                  "3s",
		"WRITE_TIMEOUT":                 "4s",
		"SHUTDOWN_TIMEOUT":              "5s",
		"USER_PUBLIC_BASE_URL":          "http://users:8080/",
		"AUTHORISATION_PUBLIC_BASE_URL": "http://authorisation:8080/",
		"ACADEMY_PUBLIC_BASE_URL":       "http://academy:8080/",
		"ORGANISATION_PUBLIC_BASE_URL":  "http://organisation:8080/",
		"COURSE_PUBLIC_BASE_URL":        "http://courses:8080/",
		"BOOKING_PUBLIC_BASE_URL":       "http://booking:8080/",
		"PAYMENT_PUBLIC_BASE_URL":       "http://payments:8080/",
		"LEGACY_NEXT_PUBLIC_BASE_URL":   "http://app:3000/",
	})
	if err != nil {
		t.Fatalf("LoadFrom returned error: %v", err)
	}
	if cfg.Port != "9000" {
		t.Fatalf("expected port 9000, got %s", cfg.Port)
	}
	if cfg.PaymentBaseURL != "http://payments:8080" {
		t.Fatalf("expected clean payment URL, got %s", cfg.PaymentBaseURL)
	}
	if cfg.DatabaseURL != "postgres://postgres:postgres@db:5432/rollfinder?sslmode=disable" {
		t.Fatalf("unexpected database URL: %s", cfg.DatabaseURL)
	}
	if cfg.ReadTimeout != 3*time.Second || cfg.WriteTimeout != 4*time.Second || cfg.ShutdownTimeout != 5*time.Second {
		t.Fatalf("durations were not parsed correctly: %#v", cfg)
	}
}

func TestLoadFromRejectsInvalidBaseUrl(t *testing.T) {
	_, err := LoadFrom(fakeEnv{"PAYMENT_PUBLIC_BASE_URL": "payments:8080"})
	if err == nil {
		t.Fatal("expected invalid absolute URL error")
	}
}
