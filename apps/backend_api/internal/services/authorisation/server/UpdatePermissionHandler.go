package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) UpdatePermissionHandler(w http.ResponseWriter, r *http.Request) {
	var req permissionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	p, ok := permissionFromRequest(handlers.Param(r, "permission_id"), req)
	if !ok {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Permission code must use resource.action naming.", nil)
		return
	}
	updated, err := s.repo.updatePermission(r.Context(), p, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}
