package server

import "net/http"

func requestIDFrom(r *http.Request) string {
	return requestIDFromContext(r.Context())
}
