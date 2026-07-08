package server

import (
	"net/http"
	"strconv"
	"strings"

	"rollfinders/internal/services/payments/handlers"
)

func (s *server) listOutboxEvents(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	events := s.store.listOutboxEvents(strings.TrimSpace(r.URL.Query().Get("event_type")), limit)
	writeJSON(w, http.StatusOK, map[string]any{"events": events, "count": len(events)})
}

func (s *server) markOutboxEventDelivered(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(handlers.Param(r, "id"))
	if id == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Outbox event id is required.", nil)
		return
	}
	if !s.store.markOutboxDelivered(id) {
		writeError(w, r, http.StatusNotFound, "not_found", "Outbox event was not found or is already delivered.", nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "delivered"})
}
