package server

import (
	"context"
	"log/slog"
	"net/http"
	"regexp"
	"sort"
	"time"

	"rollfinders/internal/services/authorisation/config"
	"rollfinders/internal/services/authorisation/handlers"
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

	mustHandle("/healthz", []string{http.MethodGet}, s.HealthHandler)
	mustHandle("/readyz", []string{http.MethodGet}, s.ReadyHandler)
	// Permissions
	mustHandle("/v1/permissions", []string{http.MethodPost}, s.CreatePermissionHandler, s.requireAuth)
	mustHandle("/v1/permissions", []string{http.MethodGet}, s.ListPermissionsHandler, s.requireAuth)
	mustHandle("/v1/permissions/{permission_id}", []string{http.MethodGet}, s.GetPermissionHandler, s.requireAuth)
	mustHandle("/v1/permissions/{permission_id}", []string{http.MethodPut}, s.UpdatePermissionHandler, s.requireAuth)

	// Resources
	mustHandle("/v1/resources", []string{http.MethodPost}, s.CreateResourceHandler, s.requireAuth)
	mustHandle("/v1/resources", []string{http.MethodGet}, s.ListResourcesHandler, s.requireAuth)
	mustHandle("/v1/roles", []string{http.MethodPost}, s.CreateRoleHandler, s.requireAuth)
	mustHandle("/v1/roles", []string{http.MethodGet}, s.ListRolesHandler, s.requireAuth)
	mustHandle("/v1/roles/{role_id}", []string{http.MethodGet}, s.GetRoleHandler, s.requireAuth)
	mustHandle("/v1/roles/{role_id}", []string{http.MethodPut}, s.UpdateRoleHandler, s.requireAuth)
	mustHandle("/v1/roles/{role_id}/permissions", []string{http.MethodPost}, s.AddRolePermissionHandler, s.requireAuth)
	mustHandle("/v1/roles/{role_id}/permissions", []string{http.MethodGet}, s.ListRolePermissionsHandler, s.requireAuth)
	mustHandle("/v1/roles/{role_id}/permissions/{permission_id}", []string{http.MethodDelete}, s.RemoveRolePermissionHandler, s.requireAuth)
	mustHandle("/v1/users/{user_id}/roles", []string{http.MethodPost}, s.AssignUserRoleHandler, s.requireAuth)
	mustHandle("/v1/users/{user_id}/roles", []string{http.MethodGet}, s.ListUserRolesHandler, s.requireAuth)
	mustHandle("/v1/users/{user_id}/roles/{assignment_id}", []string{http.MethodDelete}, s.DeleteUserRoleHandler, s.requireAuth)
	mustHandle("/v1/users/{user_id}/permissions", []string{http.MethodPost}, s.AssignUserPermissionHandler, s.requireAuth)
	mustHandle("/v1/users/{user_id}/permissions", []string{http.MethodGet}, s.ListUserPermissionsHandler, s.requireAuth)
	mustHandle("/v1/users/{user_id}/permissions/{assignment_id}", []string{http.MethodDelete}, s.DeleteUserPermissionHandler, s.requireAuth)
	mustHandle("/v1/users/{user_id}/effective-permissions", []string{http.MethodGet}, s.EffectivePermissionsHandler, s.requireAuth)

	// Authorized
	mustHandle("/v1/authorise", []string{http.MethodPost}, s.AuthorizeHandler, s.requireAuth)
	mustHandle("/v1/authorize", []string{http.MethodPost}, s.AuthorizeHandler, s.requireAuth)

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

func (s *server) logUnexpectedRepoError(r *http.Request, err error) {
	if err != nil && !isExpectedRepoError(err) {
		s.logger.Error("authorisation data error", "request_id", requestIDFrom(r), "error", err)
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
