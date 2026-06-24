package server

import (
	"encoding/json"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code string, message string, details any) {
	body := map[string]any{
		"error": map[string]any{
			"code":       code,
			"message":    message,
			"request_id": requestIDFrom(r),
		},
	}
	if details != nil {
		body["error"].(map[string]any)["details"] = details
	}
	writeJSON(w, status, body)
}
