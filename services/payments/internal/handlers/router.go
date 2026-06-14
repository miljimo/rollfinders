package handlers

import (
	"context"
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
	handlers   map[string]HttpHandler
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

func (rt *Route) setHandler(method string, handler HttpHandler) error {
	method = strings.ToUpper(strings.TrimSpace(method))
	if _, ok := supportedMethods[method]; !ok {
		return fmt.Errorf("method %s is not supported", method)
	}
	if rt.handlers == nil {
		rt.handlers = make(map[string]HttpHandler)
	}
	rt.handlers[method] = handler
	rt.methods[method] = struct{}{}
	return nil
}

func (rt *Route) getHandler(method string) HttpHandler {
	if rt.handlers != nil {
		if h, ok := rt.handlers[method]; ok {
			return h
		}
	}
	return rt.handler
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

func (rt *Route) Parameters(w http.ResponseWriter, r *http.Request) Params {
	params := make(Params, 0)
	matches := rt.regex.FindStringSubmatch(r.URL.Path)
	if matches == nil {
		http.NotFound(w, r)
		return params
	}
	for i, name := range rt.paramNames {
		params[name] = matches[i+1]
	}
	return params
}

func (rt *Route) Handler() HttpHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		if !rt.matchMethod(r.Method) {
			w.Header().Set("Allow", rt.allowedMethods())
			http.Error(w, fmt.Sprintf("method '%s' not allowed", r.Method), http.StatusMethodNotAllowed)
			return
		}
		ctx := context.WithValue(r.Context(), paramsContextKey, rt.Parameters(w, r))
		handler := rt.getHandler(r.Method)
		handler(w, r.WithContext(ctx))
	}
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
