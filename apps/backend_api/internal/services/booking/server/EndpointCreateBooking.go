package server

import (
	"net/http"

	"rollfinders/internal/services/booking/dataaccess"
)

type createBookingRequest struct {
	BookableType       string         `json:"bookable_type"`
	BookableID         string         `json:"bookable_id"`
	BookableInstanceID string         `json:"bookable_instance_id"`
	CustomerID         string         `json:"customer_id"`
	GuestReference     string         `json:"guest_reference"`
	OrganisationID     string         `json:"organisation_id"`
	ParticipantCount   int64          `json:"participant_count"`
	PaymentRequired    bool           `json:"payment_required"`
	Metadata           map[string]any `json:"metadata"`
}

func (s *server) createBooking(w http.ResponseWriter, r *http.Request) {
	if err := requireIdempotencyKey(r); err != nil {
		writeError(w, r, http.StatusBadRequest, "missing_idempotency_key", "Idempotency-Key header is required.", nil)
		return
	}
	var req createBookingRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid booking JSON.", nil)
		return
	}
	req.BookableType = cleanString(req.BookableType)
	req.BookableID = cleanString(req.BookableID)
	req.BookableInstanceID = cleanString(req.BookableInstanceID)
	req.CustomerID = cleanString(req.CustomerID)
	req.GuestReference = cleanString(req.GuestReference)
	req.OrganisationID = cleanString(req.OrganisationID)
	if req.ParticipantCount == 0 {
		req.ParticipantCount = 1
	}
	if req.BookableType == "" || req.BookableID == "" || req.BookableInstanceID == "" || req.OrganisationID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "bookable_type, bookable_id, bookable_instance_id, and organisation_id are required.", nil)
		return
	}
	if req.CustomerID == "" && req.GuestReference == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "customer_id or guest_reference is required.", nil)
		return
	}
	if req.ParticipantCount < 1 {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "participant_count must be greater than zero.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	id := newID("booking")
	booking, err := dataaccess.CreateBooking(r.Context(), db, dataaccess.CreateBookingInput{
		ID:                 id,
		Reference:          "RF-" + id,
		BookableType:       req.BookableType,
		BookableID:         req.BookableID,
		BookableInstanceID: req.BookableInstanceID,
		CustomerID:         req.CustomerID,
		GuestReference:     req.GuestReference,
		OrganisationID:     req.OrganisationID,
		ParticipantCount:   req.ParticipantCount,
		Metadata:           metadataJSON(req.Metadata),
		PaymentRequired:    req.PaymentRequired,
	})
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, booking)
}
