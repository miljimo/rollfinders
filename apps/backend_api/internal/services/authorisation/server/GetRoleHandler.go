package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) GetRoleHandler(w http.ResponseWriter, r *http.Request) {
	role, err := s.repo.getRole(r.Context(), handlers.Param(r, "role_id"))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, role)
}
