package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) CreateRoleHandler(w http.ResponseWriter, r *http.Request) {
	var req roleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	role, ok := roleFromRequest(newID("role"), req)
	if !ok {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Role key and name are required.", nil)
		return
	}
	created, err := s.repo.createRole(r.Context(), role, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}
