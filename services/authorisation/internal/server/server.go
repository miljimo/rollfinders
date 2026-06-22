package server

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"sort"
	"time"

	"authorisation/internal/config"
	"authorisation/internal/handlers"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

type server struct {
	cfg    config.Config
	logger *slog.Logger
	repo   *repository
}

func New(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	s := &server{cfg: opts.Config, logger: opts.Logger}
	if opts.Config.DatabaseURL != "" {
		repo, err := openRepository(context.Background(), opts.Config.DatabaseURL)
		if err != nil {
			opts.Logger.Warn("authorisation database unavailable at startup", "error", err)
		} else {
			s.repo = repo
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

	mustHandle("/healthz", []string{http.MethodGet}, s.health)
	mustHandle("/readyz", []string{http.MethodGet}, s.ready)
	mustHandle("/v1/permissions", []string{http.MethodPost}, s.createPermission, s.requireAuth)
	mustHandle("/v1/permissions", []string{http.MethodGet}, s.listPermissions, s.requireAuth)
	mustHandle("/v1/permissions/{permission_id}", []string{http.MethodGet}, s.getPermission, s.requireAuth)
	mustHandle("/v1/permissions/{permission_id}", []string{http.MethodPut}, s.updatePermission, s.requireAuth)
	mustHandle("/v1/roles", []string{http.MethodPost}, s.createRole, s.requireAuth)
	mustHandle("/v1/roles", []string{http.MethodGet}, s.listRoles, s.requireAuth)
	mustHandle("/v1/roles/{role_id}", []string{http.MethodGet}, s.getRole, s.requireAuth)
	mustHandle("/v1/roles/{role_id}", []string{http.MethodPut}, s.updateRole, s.requireAuth)
	mustHandle("/v1/roles/{role_id}/permissions", []string{http.MethodPost}, s.addRolePermission, s.requireAuth)
	mustHandle("/v1/roles/{role_id}/permissions", []string{http.MethodGet}, s.listRolePermissions, s.requireAuth)
	mustHandle("/v1/roles/{role_id}/permissions/{permission_id}", []string{http.MethodDelete}, s.removeRolePermission, s.requireAuth)
	mustHandle("/v1/users/{user_id}/roles", []string{http.MethodPost}, s.assignUserRole, s.requireAuth)
	mustHandle("/v1/users/{user_id}/roles", []string{http.MethodGet}, s.listUserRoles, s.requireAuth)
	mustHandle("/v1/users/{user_id}/roles/{assignment_id}", []string{http.MethodDelete}, s.deleteUserRole, s.requireAuth)
	mustHandle("/v1/users/{user_id}/permissions", []string{http.MethodPost}, s.assignUserPermission, s.requireAuth)
	mustHandle("/v1/users/{user_id}/permissions", []string{http.MethodGet}, s.listUserPermissions, s.requireAuth)
	mustHandle("/v1/users/{user_id}/permissions/{assignment_id}", []string{http.MethodDelete}, s.deleteUserPermission, s.requireAuth)
	mustHandle("/v1/users/{user_id}/effective-permissions", []string{http.MethodGet}, s.effectivePermissions, s.requireAuth)
	mustHandle("/v1/authorize", []string{http.MethodPost}, s.authorize, s.requireAuth)

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
		s.logger.Info("request handled", "request_id", requestIDFrom(r), "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}

func (s *server) requireAuth(next handlers.HttpHandler) handlers.HttpHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.repo == nil {
			writeError(w, r, http.StatusServiceUnavailable, "database_unavailable", "Authorisation database is not available.", nil)
			return
		}
		next(w, r)
	}
}

func (s *server) writeRepoError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, errNotFound):
		writeError(w, r, http.StatusNotFound, "not_found", "Authorisation resource was not found.", nil)
	case err != nil && err.Error() == "delegation violation":
		writeError(w, r, http.StatusForbidden, "delegation_violation", "Actor cannot assign this role level.", nil)
	default:
		s.logger.Error("authorisation data error", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "internal_error", "Authorisation request could not be completed.", nil)
	}
}

func actorFrom(r *http.Request) string {
	return cleanString(r.Header.Get("X-Actor-User-ID"))
}

var permissionCodePattern = regexp.MustCompile(`^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$`)

func validatePermissionCode(code string) bool {
	return permissionCodePattern.MatchString(code)
}

func scopeFromQuery(r *http.Request) Scope {
	q := r.URL.Query()
	return Scope{
		OrganisationID: cleanString(q.Get("organisation_id")),
		ApplicationID:  cleanString(q.Get("application_id")),
		ResourceType:   cleanString(q.Get("resource_type")),
		ResourceID:     cleanString(q.Get("resource_id")),
	}
}

func permissionsFromSet(set effectiveSet) []Permission {
	out := make([]Permission, 0, len(set.allowed))
	for code, p := range set.allowed {
		if _, denied := set.denied[code]; !denied {
			out = append(out, p)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })
	return out
}
