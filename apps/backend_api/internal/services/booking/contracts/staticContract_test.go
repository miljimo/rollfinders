package contracts

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestOpenApiContractUsesGenericBookingTerms(t *testing.T) {
	data, err := os.ReadFile(repoPath(t, "docs", "services", "booking", "api", "openApi.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	content := string(data)
	required := []string{
		"bookable_type",
		"bookable_id",
		"bookable_instance_id",
		"customer_id",
		"guest_reference",
		"organisation_id",
		"payment_id",
		"Idempotency-Key",
		"duplicate_booking",
		"invalid_status_transition",
		"invalid_payment_link",
		"unauthorized",
		"unavailable_dependency",
	}
	for _, term := range required {
		if !strings.Contains(content, term) {
			t.Fatalf("OpenAPI contract missing %q", term)
		}
	}
	forbidden := []string{"stripe", "paypal", "academy_id", "course_id"}
	for _, term := range forbidden {
		if strings.Contains(strings.ToLower(content), term) {
			t.Fatalf("OpenAPI contract should not contain provider or RollFinders-specific core field %q", term)
		}
	}
}

func repoPath(t *testing.T, parts ...string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test path")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..", "..", ".."))
	return filepath.Join(append([]string{root}, parts...)...)
}
