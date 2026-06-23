package server

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	pathpkg "path"
	"strings"
)

func newProxy(baseURL string, stripPrefix string, addPrefix string) http.Handler {
	target, err := url.Parse(baseURL)
	if err != nil {
		panic(err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		forwardedHost := req.Host
		originalPath := req.URL.Path
		originalDirector(req)
		req.URL.Path = rewritePath(originalPath, stripPrefix, addPrefix)
		req.URL.RawPath = ""
		req.Host = target.Host
		req.Header.Set("X-Forwarded-Host", forwardedHost)
		req.Header.Set("X-Forwarded-Proto", target.Scheme)
		if requestID := requestIDFrom(req); requestID != "" {
			req.Header.Set(requestIDHeader, requestID)
		}
	}
	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del(requestIDHeader)
		resp.Header.Set("X-RollFinders-Gateway", "api")
		return nil
	}
	return proxy
}

func rewritePath(requestPath string, stripPrefix string, addPrefix string) string {
	next := requestPath
	if stripPrefix != "" {
		next = strings.TrimPrefix(requestPath, stripPrefix)
	}
	if next == "" {
		next = "/"
	}
	if !strings.HasPrefix(next, "/") {
		next = "/" + next
	}
	if addPrefix == "" {
		return next
	}
	return pathpkg.Join("/", addPrefix, next)
}

func (s *server) route(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	switch {
	case strings.HasPrefix(path, "/v1/authorisation/"):
		s.proxies["authorisation"].ServeHTTP(w, r)
	case path == "/v1/authorisation":
		s.proxies["authorisation"].ServeHTTP(w, r)
	case strings.HasPrefix(path, "/auth/"), strings.HasPrefix(path, "/v1/auth/"), strings.HasPrefix(path, "/v1/accounts/"):
		s.proxies["user"].ServeHTTP(w, r)
	case strings.HasPrefix(path, "/v1/users"):
		s.proxies["user"].ServeHTTP(w, r)
	case strings.HasPrefix(path, "/v1/academies"), strings.HasPrefix(path, "/v1/memberships"):
		s.proxies["academy"].ServeHTTP(w, r)
	case strings.HasPrefix(path, "/v1/organisations"), strings.HasPrefix(path, "/v1/applications"):
		s.proxies["organisation"].ServeHTTP(w, r)
	case strings.HasPrefix(path, "/v1/courses"), strings.HasPrefix(path, "/v1/course-types"):
		s.proxies["course"].ServeHTTP(w, r)
	case strings.HasPrefix(path, "/v1/bookings"):
		s.proxies["booking"].ServeHTTP(w, r)
	case strings.HasPrefix(path, "/v1/payments"), strings.HasPrefix(path, "/v1/checkouts"), strings.HasPrefix(path, "/v1/refunds"), strings.HasPrefix(path, "/v1/payout"):
		s.proxies["payment"].ServeHTTP(w, r)
	case strings.HasPrefix(path, "/legacy/"):
		s.proxies["legacy"].ServeHTTP(w, r)
	default:
		writeError(w, r, http.StatusNotFound, "route_not_found", "No API route is registered for this path.", map[string]string{"path": path})
	}
}
