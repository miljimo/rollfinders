package endpoints

import (
	"net/http"

	"rollfinders/internal/services/academy/dataaccess"
)

func (s *server) removeAcademyMembership(w http.ResponseWriter, r *http.Request) {
	membershipID := cleanString(r.PathValue("membership_id"))
	if membershipID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "membership_id is required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	removed, err := dataaccess.RemoveAcademyMembership(r.Context(), db, membershipID)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	if !removed {
		writeError(w, r, http.StatusNotFound, "not_found", "Academy membership mapping was not found.", nil)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
