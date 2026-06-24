package server

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

const requestIDHeader = "X-Request-ID"

func withRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get(requestIDHeader)
		if requestID == "" {
			requestID = newRequestID()
		}
		w.Header().Set(requestIDHeader, requestID)
		next.ServeHTTP(w, r.WithContext(contextWithRequestID(r.Context(), requestID)))
	})
}

func requestIDFrom(r *http.Request) string {
	if value, ok := r.Context().Value(requestIDContextKey).(string); ok {
		return value
	}
	return r.Header.Get(requestIDHeader)
}

func newRequestID() string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "request_unknown"
	}
	return "req_" + hex.EncodeToString(bytes[:])
}
