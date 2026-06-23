package server

import (
	"net/http"

	"notification/internal/handlers"
)

type ErrorEnvelope struct {
	Error APIError `json:"error"`
}

type APIError struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	RequestID string            `json:"request_id"`
	Details   map[string]string `json:"details,omitempty"`
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code string, message string, details map[string]string) {
	handlers.WriteError(w, status, ErrorEnvelope{
		Error: APIError{
			Code:      code,
			Message:   message,
			RequestID: requestIDFrom(r),
			Details:   details,
		},
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	handlers.WriteJSON(w, status, body)
}
