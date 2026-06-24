package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) UpdateRoleHandler(w http.ResponseWriter, r *http.Request) {
	var req roleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	role, ok := roleFromRequest(handlers.Param(r, "role_id"), req)
	if !ok {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Role key and name are required.", nil)
		return
	}
	updated, err := s.repo.updateRole(r.Context(), role, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}
