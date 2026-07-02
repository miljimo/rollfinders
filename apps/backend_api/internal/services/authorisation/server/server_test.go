package server

import (
	"os"
	"strings"
	"testing"
)

func TestValidatePermissionCode(t *testing.T) {
	t.Parallel()

	valid := []string{
		"academy.create",
		"academy.claim.approve",
		"organisation.application.manage",
	}
	for _, code := range valid {
		if !validatePermissionCode(code) {
			t.Fatalf("expected %q to be valid", code)
		}
	}

	invalid := []string{
		"",
		"academy",
		"Academy.Create",
		"academy..create",
		"academy.create.",
		"academy-create",
	}
	for _, code := range invalid {
		if validatePermissionCode(code) {
			t.Fatalf("expected %q to be invalid", code)
		}
	}
}

func TestPermissionsFromSetRemovesDeniedPermissions(t *testing.T) {
	t.Parallel()

	set := effectiveSet{
		allowed: map[string]Permission{
			"academy.update": {Code: "academy.update"},
			"booking.view":   {Code: "booking.view"},
		},
		denied: map[string]Permission{
			"academy.update": {Code: "academy.update"},
		},
	}

	got := permissionsFromSet(set)
	if len(got) != 1 || got[0].Code != "booking.view" {
		t.Fatalf("expected only booking.view after direct deny, got %#v", got)
	}
}

func TestAuthorizeChecksExplicitDenyBeforeSuperAdminFallback(t *testing.T) {
	t.Parallel()

	source, err := os.ReadFile("repository.go")
	if err != nil {
		t.Fatalf("read repository source: %v", err)
	}
	text := string(source)
	denyIndex := strings.Index(text, `Reason: "direct_deny"`)
	superAdminIndex := strings.Index(text, "hasSuperAdminRole")
	if denyIndex < 0 || superAdminIndex < 0 {
		t.Fatalf("expected authorize to keep direct deny and super admin checks")
	}
	if denyIndex > superAdminIndex {
		t.Fatalf("direct deny must be evaluated before super admin fallback")
	}
	if !strings.Contains(text, "actor_max_role_level($1)") || !strings.Contains(text, "maxLevel.Int64 >= 1000") {
		t.Fatalf("expected super admin fallback to use actor_max_role_level >= 1000")
	}
}
