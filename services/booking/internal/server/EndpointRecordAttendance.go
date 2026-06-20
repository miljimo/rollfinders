package server

import (
	"net/http"

	"booking/internal/dataaccess"
	"booking/internal/handlers"
)

type attendanceRequest struct {
	AttendanceStatus string `json:"attendance_status"`
}

func (s *server) recordAttendance(w http.ResponseWriter, r *http.Request) {
	if err := requireIdempotencyKey(r); err != nil {
		writeError(w, r, http.StatusBadRequest, "missing_idempotency_key", "Idempotency-Key header is required.", nil)
		return
	}
	var req attendanceRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid attendance JSON.", nil)
		return
	}
	req.AttendanceStatus = cleanString(req.AttendanceStatus)
	if req.AttendanceStatus == "" {
		req.AttendanceStatus = "present"
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	participant, err := dataaccess.RecordAttendance(r.Context(), db, handlers.Param(r, "booking_id"), handlers.Param(r, "participant_id"), req.AttendanceStatus)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, participant)
}
