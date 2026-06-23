package endpoints

import (
	"net/http"

	"academy/internal/dataaccess"
)

func (s *server) removeAcademyMember(w http.ResponseWriter, r *http.Request) {
	academyID := cleanString(r.PathValue("academy_id"))
	userID := cleanString(r.PathValue("user_id"))
	if academyID == "" || userID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "academy_id and user_id are required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	removed, err := dataaccess.RemoveAcademyMember(r.Context(), db, academyID, userID)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	if !removed {
		writeError(w, r, http.StatusNotFound, "not_found", "Academy member mapping was not found.", nil)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
