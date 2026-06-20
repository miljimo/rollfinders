package contracts

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestBookingSchemaContainsRequiredObjects(t *testing.T) {
	root := "../../migrations"
	requiredFiles := []string{
		"schema/001_bookingSchema.sql",
		"schema/002_schemaMigrations.sql",
		"types/001_bookingTypes.sql",
		"tables/001_bookings.sql",
		"tables/002_bookingParticipants.sql",
		"tables/003_bookingStatusHistory.sql",
		"tables/004_idempotencyKeys.sql",
		"tables/005_outboxEvents.sql",
		"functions/databaseReady.sql",
		"procedures/bookingTouch.sql",
	}
	for _, name := range requiredFiles {
		if _, err := os.Stat(filepath.Join(root, name)); err != nil {
			t.Fatalf("missing migration file %s: %v", name, err)
		}
	}

	bookings, err := os.ReadFile(filepath.Join(root, "tables/001_bookings.sql"))
	if err != nil {
		t.Fatal(err)
	}
	content := string(bookings)
	required := []string{
		"CREATE TABLE IF NOT EXISTS booking.bookings",
		"customer_id text",
		"organisation_id text NOT NULL",
		"bookable_instance_id text NOT NULL",
		"payment_id text",
		"uq_booking_active_customer_instance",
		"status IN ('pending', 'payment_pending', 'confirmed')",
	}
	for _, term := range required {
		if !strings.Contains(content, term) {
			t.Fatalf("bookings schema missing %q", term)
		}
	}
}

func TestDatabaseRoutineFilesUseCamelCaseNames(t *testing.T) {
	files := routineFiles(t, "../../migrations/functions/*.sql")
	files = append(files, routineFiles(t, "../../migrations/procedures/*.sql")...)
	for _, file := range files {
		base := filepath.Base(file)
		if strings.Contains(base, "_") {
			t.Fatalf("routine filename should be camelCase, got %s", base)
		}
	}
}

func routineFiles(t *testing.T, pattern string) []string {
	t.Helper()
	files, err := filepath.Glob(pattern)
	if err != nil {
		t.Fatal(err)
	}
	return files
}
