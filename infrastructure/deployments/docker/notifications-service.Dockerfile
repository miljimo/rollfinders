FROM golang:1.24-alpine AS build
WORKDIR /src/apps/backend_api
COPY apps/backend_api/go.mod apps/backend_api/go.sum ./
RUN go mod download
COPY apps/backend_api ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/notifications-service ./cmd/services/notification/api \
    && CGO_ENABLED=0 GOOS=linux go build -o /out/notifications-worker ./cmd/services/notification/worker

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
WORKDIR /app
COPY --from=build /out/notifications-service /app/notifications-service
COPY --from=build /out/notifications-worker /app/notifications-worker
USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/notifications-service"]
