package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

type Route struct {
	pattern    string
	regex      *regexp.Regexp
	paramNames []string
	handler    HttpHandler
	methods    map[string]struct{}
}

func (rt *Route) setMethods(methods ...string) error {
	for _, method := range methods {
		method = strings.ToUpper(strings.TrimSpace(method))
		if _, ok := supportedMethods[method]; !ok {
			return fmt.Errorf("method %s is not supported", method)
		}
		rt.methods[method] = struct{}{}
	}
	return nil
}

func (rt *Route) matchMethod(method string) bool {
	if len(rt.methods) == 0 {
		return true
	}
	_, ok := rt.methods[method]
	return ok
}

func (rt *Route) allowedMethods() string {
	methods := make([]string, 0, len(rt.methods))
	for method := range rt.methods {
		methods = append(methods, method)
	}
	return strings.Join(methods, ", ")
}

func (rt *Route) Handler() HttpHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		if !rt.matchMethod(r.Method) {
			w.Header().Set("Allow", rt.allowedMethods())
			WriteError(w, http.StatusMethodNotAllowed, map[string]any{
				"error": map[string]string{
					"code":    "method_not_allowed",
					"message": fmt.Sprintf("Method '%s' is not allowed.", r.Method),
				},
			})
			return
		}
		ctx := contextWithParams(r.Context(), rt.Parameters(w, r))
		rt.handler(w, r.WithContext(ctx))
	}
}

func (rt *Route) Parameters(w http.ResponseWriter, r *http.Request) Params {
	params := make(Params)
	matches := rt.regex.FindStringSubmatch(r.URL.Path)
	if matches == nil {
		WriteError(w, http.StatusNotFound, map[string]any{
			"error": map[string]string{
				"code":    "not_found",
				"message": "Route was not found.",
			},
		})
		return params
	}
	for i, name := range rt.paramNames {
		params[name] = matches[i+1]
	}
	return params
}

func (rt *Route) Use(middlewares ...MiddlewareFunc) {
	if len(middlewares) == 0 {
		return
	}
	rt.handler = WithMiddleware(rt.handler).Apply(middlewares...)
}

func (rt *Route) matchPath(path string) bool {
	return rt.regex.MatchString(path)
}
