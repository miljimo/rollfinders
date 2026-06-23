package endpoints

import (
	"net/http"

	"academy/internal/dataaccess"
)

func (s *server) getAcademy(w http.ResponseWriter, r *http.Request) {
	academyID := cleanString(r.PathValue("academy_id"))
	if academyID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "academy_id is required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	academy, err := dataaccess.GetAcademy(r.Context(), db, academyID)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, academy)
}
