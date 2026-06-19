package config

import (
	"testing"

	"courses/internal/environments"
)

func TestLoadFromBuildsDatabaseURL(t *testing.T) {
	env := environments.New()
	_ = env.Set("DB_HOST", "db")
	_ = env.Set("DB_NAME", "rollfinder")
	_ = env.Set("DB_USER", "app")
	_ = env.Set("DB_PASSWORD", "secret")

	cfg, err := LoadFrom(env)
	if err != nil {
		t.Fatalf("LoadFrom returned error: %v", err)
	}

	if cfg.Port != "8080" {
		t.Fatalf("expected default port 8080, got %q", cfg.Port)
	}
	if cfg.DatabaseURL != "postgres://app:secret@db:5432/rollfinder?sslmode=disable" {
		t.Fatalf("unexpected database url: %q", cfg.DatabaseURL)
	}
}

func TestLoadFromPrefersDatabaseURL(t *testing.T) {
	env := environments.New()
	_ = env.Set("DATABASE_URL", "postgres://example")

	cfg, err := LoadFrom(env)
	if err != nil {
		t.Fatalf("LoadFrom returned error: %v", err)
	}

	if cfg.DatabaseURL != "postgres://example" {
		t.Fatalf("expected explicit database url, got %q", cfg.DatabaseURL)
	}
}
