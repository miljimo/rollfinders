package server

import (
	"encoding/json"
	"net/http"
	"strings"
)

func decodeJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func cleanString(value string) string {
	return strings.TrimSpace(value)
}
