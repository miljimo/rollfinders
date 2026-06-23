package server

import "context"

type contextKey string

const requestIDContextKey contextKey = "request_id"

func contextWithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDContextKey, requestID)
}
