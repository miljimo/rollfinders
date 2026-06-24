package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) EffectivePermissionsHandler(w http.ResponseWriter, r *http.Request) {
	set, err := s.repo.effectivePermissions(r.Context(), handlers.Param(r, "user_id"), scopeFromQuery(r))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"permissions": permissionsFromSet(set)})
}
