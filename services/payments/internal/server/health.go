package server

import (
	"net"
	"net/http"
	"net/url"
	"time"
)

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) ready(w http.ResponseWriter, r *http.Request) {
	if s.cfg.DatabaseURL == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "not_ready",
			"reason": "DATABASE_URL is not configured",
		})
		return
	}
	if s.cfg.APIKey == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "not_ready",
			"reason": "API_KEY is not configured",
		})
		return
	}

	address, err := postgresAddress(s.cfg.DatabaseURL)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "not_ready",
			"reason": "DATABASE_URL is invalid",
		})
		return
	}

	conn, err := net.DialTimeout("tcp", address, 2*time.Second)
	if err != nil {
		s.logger.Warn("postgres readiness check failed", "error", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "not_ready",
			"reason": "postgres is unreachable",
		})
		return
	}
	_ = conn.Close()

	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func postgresAddress(rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	host := parsed.Hostname()
	port := parsed.Port()
	if port == "" {
		port = "5432"
	}
	return net.JoinHostPort(host, port), nil
}
