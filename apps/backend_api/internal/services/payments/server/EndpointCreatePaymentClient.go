package server

import "net/http"

func (s *server) createPaymentClient(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, false)
	if !ok {
		return
	}
	req, details := decodeCreatePaymentClient(raw)
	if len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Client registration validation failed.", details)
		return
	}
	client := s.store.createPaymentClient(req)
	writeJSON(w, http.StatusCreated, client)
}
