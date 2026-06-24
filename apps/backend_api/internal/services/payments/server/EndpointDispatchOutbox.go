package server

import "net/http"

func (s *server) dispatchOutbox(w http.ResponseWriter, r *http.Request) {
	count := s.store.dispatchOutbox(100)
	s.logger.Info("outbox dispatch completed", "dispatched", count)
	writeJSON(w, http.StatusOK, map[string]int{"dispatched": count})
}
