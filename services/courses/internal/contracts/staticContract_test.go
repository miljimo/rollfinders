package contracts

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func read(t *testing.T, path string) string {
	t.Helper()
	content, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(content)
}

func TestCoreMigrationIncludesProcedureFirstShape(t *testing.T) {
	source := read(t, "../../migrations/001_coreSchema.sql")
	required := []string{
		`\ir schema/001_courseSchema.sql`,
		`SET search_path TO courses, public;`,
		`\ir schema/002_schemaMigrations.sql`,
		`\ir types/001_courseTypes.sql`,
		`\ir tables/001_courseTypes.sql`,
		`\ir functions/001_databaseReady.sql`,
		`\ir procedures/001_courseTypeUpsert.sql`,
		`INSERT INTO schema_migrations(version) VALUES ('001_coreSchema')`,
		`ON CONFLICT (version) DO NOTHING`,
	}
	for _, expected := range required {
		if !strings.Contains(source, expected) {
			t.Fatalf("expected core migration to contain %q", expected)
		}
	}
}

func TestMigrationsDoNotModifyPublicRollfindersTables(t *testing.T) {
	for _, dir := range []string{"../../migrations/schema", "../../migrations/types", "../../migrations/tables", "../../migrations/functions", "../../migrations/procedures"} {
		err := filepath.WalkDir(dir, func(path string, entry os.DirEntry, err error) error {
			if err != nil || entry.IsDir() || !strings.HasSuffix(path, ".sql") {
				return err
			}
			source := strings.ToUpper(read(t, path))
			for _, forbidden := range []string{"ALTER TABLE PUBLIC.", "DROP TABLE PUBLIC.", "CREATE TABLE PUBLIC.", "INSERT INTO PUBLIC."} {
				if strings.Contains(source, forbidden) {
					t.Fatalf("%s must not contain %s", path, forbidden)
				}
			}
			return nil
		})
		if err != nil {
			t.Fatalf("walk %s: %v", dir, err)
		}
	}
}

func TestFunctionsDoNotPerformBusinessWrites(t *testing.T) {
	err := filepath.WalkDir("../../migrations/functions", func(path string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() || !strings.HasSuffix(path, ".sql") {
			return err
		}
		source := strings.ToUpper(read(t, path))
		for _, forbidden := range []string{"INSERT INTO", "UPDATE ", "DELETE FROM", "CALL "} {
			if strings.Contains(source, forbidden) {
				t.Fatalf("%s should be read-only and must not contain %s", path, forbidden)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk functions: %v", err)
	}
}

func TestServerAndHandlersDoNotContainInlineSqlWrites(t *testing.T) {
	for _, dir := range []string{"../server", "../handlers"} {
		err := filepath.WalkDir(dir, func(path string, entry os.DirEntry, err error) error {
			if err != nil || entry.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
				return err
			}
			source := strings.ToUpper(read(t, path))
			for _, forbidden := range []string{"INSERT INTO", "UPDATE COURSES.", "DELETE FROM", "DB.EXEC", ".EXEC("} {
				if strings.Contains(source, forbidden) {
					t.Fatalf("%s must not contain inline SQL write token %s", path, forbidden)
				}
			}
			return nil
		})
		if err != nil {
			t.Fatalf("walk %s: %v", dir, err)
		}
	}
}
