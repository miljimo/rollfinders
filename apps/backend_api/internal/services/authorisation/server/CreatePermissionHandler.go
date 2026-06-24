package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) CreatePermissionHandler(w http.ResponseWriter, r *http.Request) {
	var req permissionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	p, ok := permissionFromRequest(newID("permission"), req)
	if !ok {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Permission code must use resource.action naming.", nil)
		return
	}
	created, err := s.repo.createPermission(r.Context(), p, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}
