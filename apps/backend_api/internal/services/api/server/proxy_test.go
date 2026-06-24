package server

import "testing"

func TestRewritePathKeepsDomainServicePaths(t *testing.T) {
	got := rewritePath("/v1/bookings/booking_123", "", "")
	if got != "/v1/bookings/booking_123" {
		t.Fatalf("unexpected rewrite: %s", got)
	}
}

func TestRewritePathMapsNamespacedAuthorisationRoutes(t *testing.T) {
	got := rewritePath("/v1/authorisation/authorize", "/v1/authorisation", "/v1")
	if got != "/v1/authorize" {
		t.Fatalf("unexpected rewrite: %s", got)
	}
}

func TestRewritePathMapsLegacyRoutes(t *testing.T) {
	got := rewritePath("/legacy/api/admin/users", "/legacy", "")
	if got != "/api/admin/users" {
		t.Fatalf("unexpected rewrite: %s", got)
	}
}
