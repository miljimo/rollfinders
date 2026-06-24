package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) RemoveRolePermissionHandler(w http.ResponseWriter, r *http.Request) {
	if err := s.repo.removeRolePermission(r.Context(), handlers.Param(r, "role_id"), handlers.Param(r, "permission_id"), actorFrom(r), requestIDFrom(r)); err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
