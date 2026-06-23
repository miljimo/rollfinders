package contracts

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestAcademyMembersDoesNotStoreRoles(t *testing.T) {
	content := readRepoFile(t, "services", "academy", "migrations", "tables", "003_academyMembers.sql")
	for _, forbidden := range []string{" role ", "member" + "_role", "owner", "admin", "coach"} {
		if strings.Contains(strings.ToLower(content), forbidden) {
			t.Fatalf("academy_members must only map academy_id to user_id; found forbidden token %q", forbidden)
		}
	}
}

func TestEndpointHandlersAreSplitByFile(t *testing.T) {
	endpointDir := repoPath(t, "services", "academy", "internal", "endpoints")
	entries, err := os.ReadDir(endpointDir)
	if err != nil {
		t.Fatalf("read endpoints: %v", err)
	}
	endpointFiles := 0
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "Endpoint") && strings.HasSuffix(entry.Name(), ".go") {
			endpointFiles++
		}
	}
	if endpointFiles < 7 {
		t.Fatalf("expected endpoint handlers to be split into separate files, found %d", endpointFiles)
	}
}

func readRepoFile(t *testing.T, parts ...string) string {
	t.Helper()
	data, err := os.ReadFile(repoPath(t, parts...))
	if err != nil {
		t.Fatalf("read file: %v", err)
	}
	return string(data)
}

func repoPath(t *testing.T, parts ...string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test path")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", ".."))
	return filepath.Join(append([]string{root}, parts...)...)
}
