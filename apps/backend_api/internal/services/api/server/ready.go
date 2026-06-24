package server

import "net/http"

func (s *server) ready(w http.ResponseWriter, r *http.Request) {
	report := s.dependencyReport(r.Context())
	if report.Status != "ready" {
		writeJSON(w, http.StatusServiceUnavailable, report)
		return
	}
	writeJSON(w, http.StatusOK, report)
}
