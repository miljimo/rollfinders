package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) ListUserPermissionsHandler(w http.ResponseWriter, r *http.Request) {
	limit := handlers.PageLimit(handlers.IntQuery(r, "limit", handlers.DefaultPageSize))
	offset := handlers.PageOffset(handlers.IntQuery(r, "offset", 0))
	out, err := s.repo.listUserPermissions(r.Context(), handlers.Param(r, "user_id"), limit, offset)
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"permission_assignments": out, "pagination": handlers.Pagination(limit, offset, len(out))})
}
