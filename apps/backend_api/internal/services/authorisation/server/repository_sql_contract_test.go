package server

import (
	"os"
	"path/filepath"
	"regexp"
	"testing"
)

func TestAuthorisationRuntimeUsesDatabaseFunctions(t *testing.T) {
	forbidden := []*regexp.Regexp{
		regexp.MustCompile(`(?is)\bINSERT\s+INTO\b`),
		regexp.MustCompile(`(?is)\bUPDATE\s+[a-z_]+\b`),
		regexp.MustCompile(`(?is)\bDELETE\s+FROM\b`),
		regexp.MustCompile(`(?is)\bJOIN\s+[a-z_]+\b`),
		regexp.MustCompile(`(?is)\bFROM\s+(permissions|resources|roles|role_permissions|user_roles|user_permissions|authorisation_audit_events)\b`),
	}

	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range files {
		if file == "repository_sql_contract_test.go" {
			continue
		}
		source, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		for _, pattern := range forbidden {
			if pattern.Match(source) {
				t.Fatalf("%s contains table-level SQL matching %q; use an authorisation database function instead", file, pattern.String())
			}
		}
	}
}
