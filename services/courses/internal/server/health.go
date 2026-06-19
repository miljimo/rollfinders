package server

import (
	"context"
	"net/http"

	"courses/internal/handlers"
)

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	handlers.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "courses"})
}

func (s *server) ready(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		handlers.WriteError(w, http.StatusServiceUnavailable, "not_ready", "Database connection is not available.")
		return
	}
	if _, err := s.db.Function(context.Background(), `courses."databaseReady"`); err != nil {
		handlers.WriteError(w, http.StatusServiceUnavailable, "not_ready", err.Error())
		return
	}
	handlers.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "courses"})
}
