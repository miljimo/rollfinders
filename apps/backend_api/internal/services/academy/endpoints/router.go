package endpoints

import "net/http"

type httpHandler func(http.ResponseWriter, *http.Request)

type router struct {
	mux *http.ServeMux
}

func (r *router) Handle(pattern string, methods []string, handler httpHandler) error {
	if r.mux == nil {
		r.mux = http.NewServeMux()
	}
	for _, method := range methods {
		r.mux.HandleFunc(method+" "+pattern, handler)
	}
	return nil
}

func (r *router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	if r.mux == nil {
		http.NotFound(w, req)
		return
	}
	r.mux.ServeHTTP(w, req)
}
