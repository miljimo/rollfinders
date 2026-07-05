package endpoints

import (
	"log/slog"
	"net/http"
	"time"

	"rollfinders/internal/services/academy/config"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

type server struct {
	cfg    config.Config
	logger *slog.Logger
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{cfg: opts.Config, logger: opts.Logger}
	router := &router{}

	mustHandle := func(pattern string, methods []string, handler httpHandler) {
		if err := router.Handle(pattern, methods, handler); err != nil {
			panic(err)
		}
	}

	mustHandle("/healthz", []string{http.MethodGet}, s.health)
	mustHandle("/readyz", []string{http.MethodGet}, s.ready)
	mustHandle("/v1/academies", []string{http.MethodPost}, s.createAcademy)
	mustHandle("/v1/academies", []string{http.MethodGet}, s.listAcademies)
	mustHandle("/v1/academies/{academy_id}", []string{http.MethodGet}, s.getAcademy)
	mustHandle("/v1/academies/{academy_id}", []string{http.MethodPatch}, s.updateAcademyProfile)
	mustHandle("/v1/academies/{academy_id}", []string{http.MethodDelete}, s.deleteAcademy)
	mustHandle("/v1/academies/{academy_id}/members", []string{http.MethodGet}, s.listAcademyMembers)
	mustHandle("/v1/academies/{academy_id}/members", []string{http.MethodPost}, s.addAcademyMember)
	mustHandle("/v1/academies/{academy_id}/members/{user_id}", []string{http.MethodDelete}, s.removeAcademyMember)
	mustHandle("/v1/memberships", []string{http.MethodGet}, s.listAcademyMemberships)
	mustHandle("/v1/memberships", []string{http.MethodPost}, s.addAcademyMembership)
	mustHandle("/v1/memberships/{membership_id}", []string{http.MethodDelete}, s.removeAcademyMembership)

	return withRequestID(s.accessLog(router))
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (s *server) accessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		s.logger.Info("request handled",
			"request_id", requestIDFrom(r),
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}
