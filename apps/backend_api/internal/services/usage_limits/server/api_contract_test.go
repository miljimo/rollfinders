package server

import (
	"os"
	"strings"
	"testing"
)

func TestUsageLimitsSchemaKeepsGenericQuotaTables(t *testing.T) {
	schema, err := os.ReadFile("../migrations/001_core_schema.sql")
	if err != nil {
		t.Fatalf("read schema: %v", err)
	}
	source := string(schema)
	required := []string{
		"CREATE TABLE IF NOT EXISTS usage_limits.usage_limit_rules",
		"CREATE TABLE IF NOT EXISTS usage_limits.usage_counters",
		"CREATE TABLE IF NOT EXISTS usage_limits.usage_reservations",
		"CREATE TABLE IF NOT EXISTS usage_limits.usage_limit_overrides",
		"CREATE TABLE IF NOT EXISTS usage_limits.usage_audit_events",
		"subscription_plan_id text NOT NULL",
		"idempotency_key text NOT NULL UNIQUE",
	}
	for _, fragment := range required {
		if !strings.Contains(source, fragment) {
			t.Fatalf("schema missing %q", fragment)
		}
	}
	forbidden := []string{"courses_count", "bookings_count", "users_count", "usage_plans", "owner_usage_plans"}
	for _, fragment := range forbidden {
		if strings.Contains(source, fragment) {
			t.Fatalf("schema must not introduce domain-specific or second-plan table fragment %q", fragment)
		}
	}
}

func TestUsageLimitsServerRegistersPlannedEndpoints(t *testing.T) {
	sourceBytes, err := os.ReadFile("server.go")
	if err != nil {
		t.Fatalf("read server: %v", err)
	}
	source := string(sourceBytes)
	required := []string{
		"POST /v1/usage-limits/check",
		"POST /v1/usage-limits/reservations",
		"POST /v1/usage-limits/reservations/{reservation_id}/confirm",
		"POST /v1/usage-limits/reservations/{reservation_id}/release",
		"POST /v1/usage-limits/increment",
		"POST /v1/usage-limits/decrement",
		"GET /v1/usage-limits/owners/{owner_type}/{owner_id}",
	}
	for _, fragment := range required {
		if !strings.Contains(source, fragment) {
			t.Fatalf("server missing endpoint %q", fragment)
		}
	}
}
