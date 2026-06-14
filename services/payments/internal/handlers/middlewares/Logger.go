//go:build ignore

package middlewares

import (
	"fmt"
	"net/http"

	"example.com/events/internal/loggings"
	"example.com/events/pkg/handlers"
)

func WithLogger(handler handlers.HttpHandler) handlers.HttpHandler {

	return func(w http.ResponseWriter, r *http.Request) {

		requestId := handlers.RequestId(r)
		endpointUr := "http play"
		loggings.Instance().Info(r.Context(), fmt.Sprintf("Call Endpoint =  %s, started, request-id = %s", endpointUr, requestId))

		handler(w, r)
		loggings.Instance().Info(r.Context(), fmt.Sprintf("Endpoint request-id %s", requestId))

	}
}
