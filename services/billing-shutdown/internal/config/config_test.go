package config

import "testing"

func TestLoadRequiresApprovalForProduction(t *testing.T) {
	t.Setenv("TARGET_ENVIRONMENT", "production")
	t.Setenv("COST_SHUTDOWN_APPROVED", "false")

	_, err := Load()
	if err == nil {
		t.Fatal("expected approval error")
	}
}

func TestLoadAcceptsApprovedProductionShutdown(t *testing.T) {
	t.Setenv("TARGET_ENVIRONMENT", "production")
	t.Setenv("COST_SHUTDOWN_APPROVED", "true")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected config to load: %v", err)
	}
	if cfg.DryRun != true {
		t.Fatal("expected dry run to default to true")
	}
	if cfg.ECSCluster != "rollfinder-production" {
		t.Fatalf("unexpected ecs cluster: %s", cfg.ECSCluster)
	}
}

func TestLoadRejectsNonProductionTarget(t *testing.T) {
	t.Setenv("TARGET_ENVIRONMENT", "dev")
	t.Setenv("COST_SHUTDOWN_APPROVED", "true")

	_, err := Load()
	if err == nil {
		t.Fatal("expected non-production target error")
	}
}
