package server

import (
	"net/http"

	"authorisation/internal/handlers"
)

type rolePermissionRequest struct {
	PermissionID string `json:"permission_id"`
}

func (s *server) addRolePermission(w http.ResponseWriter, r *http.Request) {
	var req rolePermissionRequest
	if err := decodeJSON(r, &req); err != nil || cleanString(req.PermissionID) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "permission_id is required.", nil)
		return
	}
	if err := s.repo.addRolePermission(r.Context(), handlers.Param(r, "role_id"), cleanString(req.PermissionID), actorFrom(r), requestIDFrom(r)); err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "assigned"})
}

func (s *server) listRolePermissions(w http.ResponseWriter, r *http.Request) {
	out, err := s.repo.rolePermissions(r.Context(), handlers.Param(r, "role_id"))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"permissions": out})
}

func (s *server) removeRolePermission(w http.ResponseWriter, r *http.Request) {
	if err := s.repo.removeRolePermission(r.Context(), handlers.Param(r, "role_id"), handlers.Param(r, "permission_id"), actorFrom(r), requestIDFrom(r)); err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
