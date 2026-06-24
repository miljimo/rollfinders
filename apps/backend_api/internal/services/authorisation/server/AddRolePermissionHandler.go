package server

import (
	"net/http"
	"strings"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) AddRolePermissionHandler(w http.ResponseWriter, r *http.Request) {
	var req rolePermissionRequest
	roleId := handlers.Param(r, "role_id")

	if strings.TrimSpace(roleId) == "" {
		handlers.ErrorWithStatus(w, handlers.NewStatusError(http.StatusBadRequest, "invalid_request", "role id must be provided", nil, nil), http.StatusInternalServerError)
		return
	}
	if err := decodeJSON(r, &req); err != nil || cleanString(req.PermissionID) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "permission_id is required.", nil)
		return
	}

	if err := s.repo.addRolePermission(r.Context(), handlers.Param(r, "role_id"), cleanString(req.PermissionID), actorFrom(r), requestIDFrom(r)); err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "assigned"})
}
