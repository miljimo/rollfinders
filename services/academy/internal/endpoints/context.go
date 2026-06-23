package endpoints

import (
	"net/http"

	"academy/internal/databases"
)

func (s *server) withDataContext(w http.ResponseWriter, r *http.Request) (databases.DataContext, bool) {
	if s.cfg.DatabaseURL == "" {
		writeError(w, r, http.StatusServiceUnavailable, "database_not_configured", "Academy database is not configured.", nil)
		return nil, false
	}
	db, err := databases.Open(r.Context(), "academy", s.cfg.DatabaseURL)
	if err != nil {
		s.logger.Error("academy database unavailable", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Academy database is not available.", nil)
		return nil, false
	}
	return db, true
}
