package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"rollfinders/internal/services/courses/config"
	"rollfinders/internal/services/courses/databases"
	"rollfinders/internal/services/courses/handlers"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
	DB     databases.DataContext
}

type server struct {
	cfg    config.Config
	logger *slog.Logger
	db     databases.DataContext
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{cfg: opts.Config, logger: opts.Logger, db: opts.DB}
	if s.db == nil && opts.Config.DatabaseURL != "" {
		db, err := databases.New(context.Background(), "courses", opts.Config.DatabaseURL)
		if err != nil {
			opts.Logger.Error("courses database unavailable at startup", "error", err)
		} else {
			s.db = db
		}
	}

	router := &handlers.Router{}
	mustHandle := func(pattern string, methods []string, handler handlers.HttpHandler, middleware ...handlers.MiddlewareFunc) {
		if len(middleware) > 0 {
			handler = handlers.WithMiddleware(handler).Apply(middleware...)
		}
		if _, err := router.Handle(pattern, methods, handler); err != nil {
			panic(err)
		}
	}

	auth := s.requireAuth
	courseTypeAdmin := s.requirePlatformCourseTypeAdmin
	mustHandle("/healthz", []string{http.MethodGet}, s.health)
	mustHandle("/readyz", []string{http.MethodGet}, s.ready)
	mustHandle("/v1/course-types", []string{http.MethodGet}, s.listCourseTypes, auth)
	mustHandle("/v1/course-types", []string{http.MethodPost}, s.createCourseType, auth, courseTypeAdmin)
	mustHandle("/v1/course-types/{id}", []string{http.MethodGet}, s.getCourseType, auth)
	mustHandle("/v1/course-types/{id}", []string{http.MethodPut}, s.updateCourseType, auth, courseTypeAdmin)
	mustHandle("/v1/course-types/{id}", []string{http.MethodDelete}, s.deleteCourseType, auth, courseTypeAdmin)
	mustHandle("/v1/courses", []string{http.MethodGet}, s.listCourses, auth)
	mustHandle("/v1/courses", []string{http.MethodPost}, s.createCourse, auth)
	mustHandle("/v1/courses/{id}", []string{http.MethodGet}, s.getCourse, auth)
	mustHandle("/v1/courses/{id}", []string{http.MethodPut}, s.updateCourse, auth)
	mustHandle("/v1/courses/{id}", []string{http.MethodDelete}, s.deleteCourse, auth)
	mustHandle("/v1/courses/{id}/activities", []string{http.MethodGet}, s.listActivities, auth)
	mustHandle("/v1/courses/{id}/activities", []string{http.MethodPost}, s.createActivity, auth)
	mustHandle("/v1/activities/{id}", []string{http.MethodPut}, s.updateActivity, auth)
	mustHandle("/v1/activities/{id}", []string{http.MethodDelete}, s.deleteActivity, auth)

	return s.accessLog(router)
}

func (s *server) requireDB(w http.ResponseWriter) bool {
	if s.db == nil {
		handlers.WriteError(w, http.StatusServiceUnavailable, "database_unavailable", "Database connection is not available.")
		return false
	}
	return true
}

func newUUID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return ""
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	dst := make([]byte, 36)
	hex.Encode(dst[0:8], b[0:4])
	dst[8] = '-'
	hex.Encode(dst[9:13], b[4:6])
	dst[13] = '-'
	hex.Encode(dst[14:18], b[6:8])
	dst[18] = '-'
	hex.Encode(dst[19:23], b[8:10])
	dst[23] = '-'
	hex.Encode(dst[24:], b[10:])
	return string(dst)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func validateRequired(fields map[string]string) error {
	for name, value := range fields {
		if strings.TrimSpace(value) == "" {
			return errors.New(name + " is required")
		}
	}
	return nil
}
