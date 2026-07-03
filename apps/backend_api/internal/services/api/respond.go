package api

import (
	"encoding/json"
	"net/http"

	"rollfinders/internal/services/api/domain"
)

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code string, message string, details any) {
	body := map[string]any{
		domain.JSONKeyError: map[string]any{
			domain.JSONKeyCode:      code,
			domain.JSONKeyMessage:   message,
			domain.JSONKeyRequestID: requestIDFrom(r),
		},
	}
	if details != nil {
		body[domain.JSONKeyError].(map[string]any)[domain.JSONKeyDetails] = details
	}
	writeJSON(w, status, body)
}
