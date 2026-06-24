package server

import (
	"errors"
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
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
		Error: APIError{Code: code, Message: message, RequestID: requestIDFrom(r), Details: details},
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	handlers.WriteJSON(w, status, body)
}

func repoStatusError(err error) error {
	switch {
	case errors.Is(err, errNotFound):
		return handlers.NewStatusError(http.StatusNotFound, "not_found", "Authorisation resource was not found.", err, nil)
	case err != nil && err.Error() == "delegation violation":
		return handlers.NewStatusError(http.StatusForbidden, "delegation_violation", "Actor cannot assign this role level.", err, nil)
	default:
		return handlers.NewStatusError(http.StatusInternalServerError, "internal_error", "Authorisation request could not be completed.", err, nil)
	}
}

func isExpectedRepoError(err error) bool {
	return errors.Is(err, errNotFound) || (err != nil && err.Error() == "delegation violation")
}
