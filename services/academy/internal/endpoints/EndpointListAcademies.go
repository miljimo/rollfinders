package endpoints

import (
	"net/http"
	"strconv"

	"academy/internal/dataaccess"
)

func (s *server) listAcademies(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	limit := intQuery(query.Get("limit"), 50)
	offset := intQuery(query.Get("offset"), 0)
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	academies, err := dataaccess.ListAcademies(r.Context(), db, cleanString(query.Get("organisation_id")), cleanString(query.Get("q")), limit, offset)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"academies": academies})
}

func intQuery(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
