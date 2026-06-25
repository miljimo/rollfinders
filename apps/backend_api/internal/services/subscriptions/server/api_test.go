package server

import (
	"os"
	"strings"
	"testing"
)

func TestInferPlanChangeType(t *testing.T) {
	tests := []struct {
		name string
		from Plan
		to   Plan
		want string
	}{
		{
			name: "upgrade when target costs more",
			from: Plan{ID: "starter", PriceMinor: 2900},
			to:   Plan{ID: "pro", PriceMinor: 7900},
			want: "upgrade",
		},
		{
			name: "downgrade when target costs less",
			from: Plan{ID: "pro", PriceMinor: 7900},
			to:   Plan{ID: "starter", PriceMinor: 2900},
			want: "downgrade",
		},
		{
			name: "switch when target has same price",
			from: Plan{ID: "monthly-a", PriceMinor: 2900},
			to:   Plan{ID: "monthly-b", PriceMinor: 2900},
			want: "switch",
		},
		{
			name: "switch when target is current plan",
			from: Plan{ID: "pro", PriceMinor: 7900},
			to:   Plan{ID: "pro", PriceMinor: 7900},
			want: "switch",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := inferPlanChangeType(tt.from, tt.to); got != tt.want {
				t.Fatalf("inferPlanChangeType() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestValidPlanChangeType(t *testing.T) {
	for _, value := range []string{"subscribe", "upgrade", "downgrade", "switch", "cancel", "reactivate"} {
		if !validPlanChangeType(value) {
			t.Fatalf("validPlanChangeType(%q) = false, want true", value)
		}
	}
	for _, value := range []string{"", "pause", "UPGRADE"} {
		if validPlanChangeType(value) {
			t.Fatalf("validPlanChangeType(%q) = true, want false", value)
		}
	}
}

func TestFeatureNameUniqueWithinProductServiceContract(t *testing.T) {
	schema, err := os.ReadFile("../../../../migrations/subscriptions/001_core_schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	repository, err := os.ReadFile("repository.go")
	if err != nil {
		t.Fatal(err)
	}
	schemaSource := string(schema)
	repositorySource := string(repository)
	if !strings.Contains(schemaSource, "subscriptions_product_features_product_name_key") {
		t.Fatal("product feature schema must enforce a unique feature name per product service")
	}
	if !strings.Contains(schemaSource, "product_features(product_id, lower(name))") {
		t.Fatal("product feature uniqueness must be scoped to product_id and case-insensitive name")
	}
	if !strings.Contains(repositorySource, "AND lower(name) = lower($2)") || !strings.Contains(repositorySource, "return ProductFeature{}, errDuplicate") {
		t.Fatal("repository must reject duplicate feature names in the same product service before upsert")
	}
}
