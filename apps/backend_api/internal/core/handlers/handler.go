package handlers

import (
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

const (
	DEFAULT_PARAM_REGEX string = `\{([a-zA-Z0-9_]+)\}`
)

func (r *Router) compilePattern(pattern string) (*regexp.Regexp, []string, error) {
	var params []string

	re := regexp.MustCompile(DEFAULT_PARAM_REGEX)

	regexPattern := re.ReplaceAllStringFunc(pattern, func(match string) string {
		name := strings.Trim(match, "{}")
		params = append(params, name)
		return `([^/]+)`
	})

	regexPattern = "^" + regexPattern + "$"

	compiled, err := regexp.Compile(regexPattern)
	if err != nil {
		return nil, nil, err
	}

	return compiled, params, nil
}

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

	for _, existingRoute := range r.routes {
		if existingRoute.pattern == pattern {

			if len(methods) > 0 {
				for _, method := range methods {
					if err := existingRoute.setHandler(method, handler); err != nil {
						return nil, err
					}
				}
			}
			return existingRoute, nil
		}
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
	// defer func() {
	// 	err := recover()
	// 	if err != nil {
	// 		ErrorWithStatus(w, err.(error), http.StatusInternalServerError)
	// 		panic(err)
	// 	}
	// }()

	for _, route := range r.routes {
		if route.matchPath(req.URL.Path) {
			route.Handler()(w, req)
			return
		}
	}

	http.NotFound(w, req)
}

var DefaultRouter = &Router{}
