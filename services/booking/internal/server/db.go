package server

import (
	"context"
	"errors"
	"net/http"

	"booking/internal/databases"
)

func (s *server) dataContext(ctx context.Context) (databases.DataContext, error) {
	if s.cfg.DatabaseURL == "" {
		return nil, errors.New("database_url is not configured")
	}
	return databases.Open(ctx, "booking", s.cfg.DatabaseURL)
}

func (s *server) withDataContext(w http.ResponseWriter, r *http.Request) (databases.DataContext, bool) {
	db, err := s.dataContext(r.Context())
	if err != nil {
		s.logger.Error("database unavailable", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusServiceUnavailable, "unavailable_dependency", "Booking database is not available.", nil)
		return nil, false
	}
	return db, true
}
