package server

import (
	"net/http"

	"rollfinders/internal/services/booking/dataaccess"
	"rollfinders/internal/services/booking/handlers"
)

func (s *server) getBooking(w http.ResponseWriter, r *http.Request) {
	id := handlers.Param(r, "booking_id")
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	booking, err := dataaccess.GetBooking(r.Context(), db, id)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, booking)
}
