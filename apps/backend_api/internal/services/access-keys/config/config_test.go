package config

import "testing"

func TestLoadUsesExistingEnvironmentVariables(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("SERVICE_API_KEY", "test-key")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if cfg.Port != "9090" {
		t.Fatalf("expected PORT to be preserved, got %q", cfg.Port)
	}
	if cfg.APIKey != "test-key" {
		t.Fatalf("expected SERVICE_API_KEY to be preserved")
	}
}
