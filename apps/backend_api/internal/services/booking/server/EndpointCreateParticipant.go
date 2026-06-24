package server

import (
	"net/http"

	"rollfinders/internal/services/booking/dataaccess"
	"rollfinders/internal/services/booking/handlers"
)

type participantRequest struct {
	CustomerID     string         `json:"customer_id"`
	GuestReference string         `json:"guest_reference"`
	DisplayName    string         `json:"display_name"`
	Metadata       map[string]any `json:"metadata"`
}

func (s *server) createParticipant(w http.ResponseWriter, r *http.Request) {
	if err := requireIdempotencyKey(r); err != nil {
		writeError(w, r, http.StatusBadRequest, "missing_idempotency_key", "Idempotency-Key header is required.", nil)
		return
	}
	var req participantRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid participant JSON.", nil)
		return
	}
	req.CustomerID = cleanString(req.CustomerID)
	req.GuestReference = cleanString(req.GuestReference)
	req.DisplayName = cleanString(req.DisplayName)
	if req.CustomerID == "" && req.GuestReference == "" && req.DisplayName == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "customer_id, guest_reference, or display_name is required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	participant, err := dataaccess.CreateParticipant(r.Context(), db, dataaccess.CreateParticipantInput{
		ID:             newID("participant"),
		BookingID:      handlers.Param(r, "booking_id"),
		CustomerID:     req.CustomerID,
		GuestReference: req.GuestReference,
		DisplayName:    req.DisplayName,
		Metadata:       metadataJSON(req.Metadata),
	})
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, participant)
}
