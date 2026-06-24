package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) DeleteUserPermissionHandler(w http.ResponseWriter, r *http.Request) {
	if err := s.repo.deleteUserPermission(r.Context(), handlers.Param(r, "user_id"), handlers.Param(r, "assignment_id"), actorFrom(r), requestIDFrom(r)); err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
