package server

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAuthorisationHandlerFilesMatchHandlerFunctionNames(t *testing.T) {
	files, err := filepath.Glob("*Handler.go")
	if err != nil {
		t.Fatal(err)
	}
	if len(files) == 0 {
		t.Fatal("expected authorisation handler files")
	}
	for _, file := range files {
		source, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		name := strings.TrimSuffix(filepath.Base(file), ".go")
		expected := "func (s *server) " + name + "("
		if !strings.Contains(string(source), expected) {
			t.Fatalf("%s must define %s", file, expected)
		}
	}
}
