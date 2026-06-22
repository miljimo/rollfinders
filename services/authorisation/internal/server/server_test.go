package server

import "testing"

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
