package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) GetPermissionHandler(w http.ResponseWriter, r *http.Request) {
	p, err := s.repo.getPermission(r.Context(), handlers.Param(r, "permission_id"))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, p)
}
