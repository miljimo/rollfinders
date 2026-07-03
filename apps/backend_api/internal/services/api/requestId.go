package api

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"rollfinders/internal/services/api/domain"
)

func withRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get(domain.RequestIDHeader)
		if requestID == "" {
			requestID = newRequestID()
		}
		w.Header().Set(domain.RequestIDHeader, requestID)
		next.ServeHTTP(w, r.WithContext(contextWithRequestID(r.Context(), requestID)))
	})
}

func requestIDFrom(r *http.Request) string {
	if value, ok := r.Context().Value(requestIDContextKey).(string); ok {
		return value
	}
	return r.Header.Get(domain.RequestIDHeader)
}

func newRequestID() string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return domain.RequestIDUnknown
	}
	return domain.RequestIDPrefix + hex.EncodeToString(bytes[:])
}
