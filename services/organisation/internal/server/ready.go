package server

import "net/http"

func (s *server) ready(w http.ResponseWriter, r *http.Request) {
	if s.cfg.DatabaseURL == "" {
		writeError(w, r, http.StatusServiceUnavailable, "not_ready", "Organisation database is not configured.")
		return
	}
	if s.repo == nil {
		writeError(w, r, http.StatusServiceUnavailable, "not_ready", "Organisation database is not available.")
		return
	}
	if err := s.repo.ready(r.Context()); err != nil {
		s.logger.Warn("organisation readiness check failed", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusServiceUnavailable, "not_ready", "Organisation database is not ready.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ready", "service": "organisation"})
}
