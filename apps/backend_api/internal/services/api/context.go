package api

import (
	"context"

	"rollfinders/internal/services/api/domain"
)

type contextKey string

const requestIDContextKey contextKey = domain.ContextKeyRequestID

func contextWithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDContextKey, requestID)
}
