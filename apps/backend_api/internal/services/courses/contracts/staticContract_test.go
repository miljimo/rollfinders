package contracts

import (
	"os"
	"path/filepath"
	"runtime"
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
	source := read(t, repoPath(t, "apps", "backend_api", "migrations", "courses", "001_coreSchema.sql"))
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
	for _, dir := range []string{
		repoPath(t, "apps", "backend_api", "migrations", "courses", "schema"),
		repoPath(t, "apps", "backend_api", "migrations", "courses", "types"),
		repoPath(t, "apps", "backend_api", "migrations", "courses", "tables"),
		repoPath(t, "apps", "backend_api", "migrations", "courses", "functions"),
		repoPath(t, "apps", "backend_api", "migrations", "courses", "procedures"),
	} {
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

func TestRollfindersCompatibilityUsesPlatformCourseTypeIds(t *testing.T) {
	source := read(t, repoPath(t, "apps", "backend_api", "migrations", "courses", "rollfinders", "001_publicCourseCompatibilityViews.sql"))
	if !strings.Contains(source, `CREATE OR REPLACE FUNCTION public."rollfindersCourseTypeId"`) {
		t.Fatal("expected RollFinders compatibility course type id function")
	}
	if !strings.Contains(source, `SELECT 'platform_' || trim`) {
		t.Fatal("RollFinders compatibility course type ids must use canonical platform ids")
	}
	if strings.Contains(source, `SELECT regexp_replace('rollfinders_' || p_course_type`) {
		t.Fatal("RollFinders compatibility course type ids must not use legacy organisation-scoped ids")
	}
}

func TestFunctionsDoNotPerformBusinessWrites(t *testing.T) {
	err := filepath.WalkDir(repoPath(t, "apps", "backend_api", "migrations", "courses", "functions"), func(path string, entry os.DirEntry, err error) error {
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
	for _, dir := range []string{
		repoPath(t, "apps", "backend_api", "internal", "services", "courses", "server"),
		repoPath(t, "apps", "backend_api", "internal", "services", "courses", "handlers"),
	} {
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

func repoPath(t *testing.T, parts ...string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test path")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..", "..", ".."))
	return filepath.Join(append([]string{root}, parts...)...)
}
