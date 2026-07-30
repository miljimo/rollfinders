package server

import (
	"os"
	"strings"
	"testing"
)

func TestCoreMigrationRunsRoleReconciliation(t *testing.T) {
	t.Parallel()

	core, err := os.ReadFile("../migrations/001_core_schema.sql")
	if err != nil {
		t.Fatalf("read core migration: %v", err)
	}
	if !strings.Contains(string(core), `\ir 023_backfill_missing_standard_user_roles.sql`) {
		t.Fatal("core migration must run the missing-role reconciliation")
	}

	reconciliation, err := os.ReadFile("../migrations/023_backfill_missing_standard_user_roles.sql")
	if err != nil {
		t.Fatalf("read role reconciliation: %v", err)
	}
	source := string(reconciliation)
	for _, expected := range []string{
		"standard_role.key = 'STANDARD_USER'",
		"platform_user.is_protected = false",
		"NOT EXISTS",
		"existing_assignment.user_id = platform_user.id",
		"'app_rollfinders'",
		"ON CONFLICT DO NOTHING",
	} {
		if !strings.Contains(source, expected) {
			t.Fatalf("role reconciliation must contain %q", expected)
		}
	}
}
