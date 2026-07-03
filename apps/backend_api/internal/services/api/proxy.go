package api

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	pathpkg "path"
	"strings"

	"rollfinders/internal/services/api/domain"
)

func createNewProxyHandler(baseURL string, stripPrefix string, addPrefix string) http.Handler {
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
		req.Header.Set(domain.ForwardedHostHeader, forwardedHost)
		req.Header.Set(domain.ForwardedProtoHeader, target.Scheme)
		if requestID := requestIDFrom(req); requestID != "" {
			req.Header.Set(domain.RequestIDHeader, requestID)
		}
	}
	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del(domain.RequestIDHeader)
		resp.Header.Set(domain.RollFindersGatewayHeader, domain.RollFindersGatewayValue)
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
	if !s.authoriseRequest(w, r) {
		return
	}

	path := r.URL.Path
	if handler, ok := s.routeHandlers[routeHandlerKey{Method: r.Method, Path: path}]; ok {
		handler.ServeHTTP(w, r)
		return
	}

	switch {
	case strings.HasPrefix(path, domain.AuthorisationProxyPrefix):
		s.proxies[domain.ProxyKeyAuthorisation].ServeHTTP(w, r)
	case path == domain.AuthorisationProxyPath:
		s.proxies[domain.ProxyKeyAuthorisation].ServeHTTP(w, r)
	case strings.HasPrefix(path, domain.AuthProxyPrefix), strings.HasPrefix(path, domain.V1AuthProxyPrefix), strings.HasPrefix(path, domain.V1AccountsProxyPrefix):
		s.proxies[domain.ProxyKeyUser].ServeHTTP(w, r)
	case strings.HasPrefix(path, domain.LegacyProxyPrefix):
		s.proxies[domain.ProxyKeyLegacy].ServeHTTP(w, r)
	default:
		match, ok := resolveRoute(r.Method, path)
		if !ok {
			writeError(w, r, http.StatusNotFound, domain.ErrCodeRouteNotFound, domain.ErrMessageRouteNotFound, map[string]string{"path": path})
			return
		}
		proxyKey := proxyKeyForService(match.Definition.Service)
		proxy, ok := s.proxies[proxyKey]
		if proxyKey == "" || !ok {
			writeError(w, r, http.StatusBadGateway, domain.ErrCodeServiceNotConfigured, domain.ErrMessageServiceNotConfigured, map[string]string{"service": string(match.Definition.Service)})
			return
		}
		proxy.ServeHTTP(w, r)
	}
}
