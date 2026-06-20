package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

type contextKey string

const paramsContextKey contextKey = "route_params"

var supportedMethods = map[string]struct{}{
	http.MethodGet:     {},
	http.MethodHead:    {},
	http.MethodPost:    {},
	http.MethodPut:     {},
	http.MethodPatch:   {},
	http.MethodDelete:  {},
	http.MethodConnect: {},
	http.MethodOptions: {},
	http.MethodTrace:   {},
}

type Params map[string]string
type HttpHandler func(http.ResponseWriter, *http.Request)

type Router struct {
	routes      []*Route
	middlewares []MiddlewareFunc
	endPoint    *url.URL
}

func (r *Router) Handle(pattern string, methods []string, handler HttpHandler) (*Route, error) {
	pattern = r.normalizePath(pattern)
	if pattern == "" {
		return nil, errors.New("pattern cannot be empty")
	}
	if handler == nil {
		return nil, errors.New("handler cannot be nil")
	}

	regex, params, err := r.compilePattern(pattern)
	if err != nil {
		return nil, err
	}

	rt := &Route{
		pattern:    pattern,
		regex:      regex,
		paramNames: params,
		handler:    handler,
		methods:    make(map[string]struct{}),
	}
	if len(methods) > 0 {
		if err := rt.setMethods(methods...); err != nil {
			return nil, err
		}
	}
	r.routes = append(r.routes, rt)
	return rt, nil
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	allowed := make([]string, 0)
	for _, route := range r.routes {
		if route.matchPath(req.URL.Path) {
			if !route.matchMethod(req.Method) {
				allowed = append(allowed, route.allowedMethods())
				continue
			}
			route.Handler()(w, req)
			return
		}
	}
	if len(allowed) > 0 {
		w.Header().Set("Allow", strings.Join(allowed, ", "))
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	http.NotFound(w, req)
}

func (r *Router) compilePattern(pattern string) (*regexp.Regexp, []string, error) {
	var params []string
	re := regexp.MustCompile(`\{([a-zA-Z0-9_]+)\}`)
	regexPattern := re.ReplaceAllStringFunc(pattern, func(match string) string {
		name := strings.Trim(match, "{}")
		params = append(params, name)
		return `([^/]+)`
	})
	compiled, err := regexp.Compile("^" + regexPattern + "$")
	if err != nil {
		return nil, nil, err
	}
	return compiled, params, nil
}

func (r *Router) normalizePath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return path
}

func paramsFrom(r *http.Request) Params {
	params, _ := r.Context().Value(paramsContextKey).(Params)
	return params
}

func Param(r *http.Request, key string) string {
	return paramsFrom(r)[key]
}

func contextWithParams(ctx context.Context, params Params) context.Context {
	return context.WithValue(ctx, paramsContextKey, params)
}
