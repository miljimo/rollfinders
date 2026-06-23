package endpoints

import "net/http"

func (s *server) ready(w http.ResponseWriter, r *http.Request) {
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	results, err := db.Function(r.Context(), "academy.databaseReady")
	if err != nil || !isDatabaseReady(results) {
		if err != nil {
			s.logger.Error("academy readiness failed", "request_id", requestIDFrom(r), "error", err)
		}
		writeError(w, r, http.StatusServiceUnavailable, "not_ready", "Academy database is not ready.", nil)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ready", "service": "academy"})
}
