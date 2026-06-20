package server

import (
	"net/http"

	"booking/internal/dataaccess"
	"booking/internal/handlers"
)

func (s *server) listParticipants(w http.ResponseWriter, r *http.Request) {
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	items, err := dataaccess.ListParticipants(r.Context(), db, handlers.Param(r, "booking_id"))
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}
