package server

import (
	"fmt"
	"testing"

	"github.com/lib/pq"
)

func TestIsUniqueViolationDetectsWrappedPostgresErrors(t *testing.T) {
	err := fmt.Errorf("call users.userInsert: %w", &pq.Error{Code: "23505"})

	if !isUniqueViolation(err) {
		t.Fatal("expected wrapped postgres unique violations to be detected")
	}
}

func TestIsUniqueViolationIgnoresOtherPostgresErrors(t *testing.T) {
	err := fmt.Errorf("call users.userInsert: %w", &pq.Error{Code: "23503"})

	if isUniqueViolation(err) {
		t.Fatal("did not expect non-unique postgres errors to be treated as duplicates")
	}
}
