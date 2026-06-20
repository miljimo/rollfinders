package config

import "testing"

type testEnv map[string]string

func (e testEnv) Keys() []string                            { return nil }
func (e testEnv) ContainsKey(key string) bool               { _, ok := e[key]; return ok }
func (e testEnv) Get(key string) string                     { return e[key] }
func (e testEnv) Set(key string, value string) error        { e[key] = value; return nil }
func (e testEnv) Unset(key string, _ string) error          { delete(e, key); return nil }
func (e testEnv) Load(key string) error                     { return nil }
func (e testEnv) ReplaceAll(content string) ([]byte, error) { return []byte(content), nil }
func (e testEnv) Presents(keys []string) error              { return nil }
func (e testEnv) Int(key string) (int, error)               { return 0, nil }
func (e testEnv) GetWithDefault(key string, defaultValue string) string {
	if value := e.Get(key); value != "" {
		return value
	}
	return defaultValue
}

func TestLoadBuildsDatabaseURLFromParts(t *testing.T) {
	cfg, err := LoadFrom(testEnv{
		"DB_HOST":     "db",
		"DB_NAME":     "rollfinder",
		"DB_USER":     "booking",
		"DB_PASSWORD": "secret",
		"DB_PORT":     "15432",
	})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DatabaseURL != "postgres://booking:secret@db:15432/rollfinder?sslmode=disable" {
		t.Fatalf("unexpected database URL %q", cfg.DatabaseURL)
	}
}

func TestLoadDatabaseURLTakesPrecedence(t *testing.T) {
	cfg, err := LoadFrom(testEnv{"DATABASE_URL": "postgres://example"})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.DatabaseURL != "postgres://example" {
		t.Fatalf("expected explicit DATABASE_URL, got %q", cfg.DatabaseURL)
	}
}
