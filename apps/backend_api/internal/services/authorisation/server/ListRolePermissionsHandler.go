package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) ListRolePermissionsHandler(w http.ResponseWriter, r *http.Request) {
	out, err := s.repo.rolePermissions(r.Context(), handlers.Param(r, "role_id"))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"permissions": out})
}
