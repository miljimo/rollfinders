package endpoints

import (
	"net/http"

	"academy/internal/dataaccess"
)

func (s *server) listAcademyMemberships(w http.ResponseWriter, r *http.Request) {
	userID := cleanString(r.URL.Query().Get("user_id"))
	if userID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "user_id is required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	memberships, err := dataaccess.ListAcademyMembershipsByUser(r.Context(), db, userID)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"memberships": memberships})
}
