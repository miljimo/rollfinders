package server

import (
	"strings"
)

func cleanString(value string) string {
	return strings.TrimSpace(value)
}
