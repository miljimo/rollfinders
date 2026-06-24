package server

import (
	"net/http"
	"strconv"

	"rollfinders/internal/services/booking/dataaccess"
	"rollfinders/internal/services/booking/handlers"
)

func (s *server) listParticipants(w http.ResponseWriter, r *http.Request) {
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	limit := intQuery(r.URL.Query().Get("limit"), 10)
	offset := intQuery(r.URL.Query().Get("offset"), 0)
	items, err := dataaccess.ListParticipants(r.Context(), db, handlers.Param(r, "booking_id"), limit, offset)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items), "pagination": pagination(limit, offset, len(items))})
}

func intQuery(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
