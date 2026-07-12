FROM golang:1.24-alpine AS build
WORKDIR /src/apps/backend_api
COPY apps/backend_api/go.mod apps/backend_api/go.sum ./
RUN go mod download
COPY apps/backend_api ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/usage-limits-api ./cmd/services/usage_limits/api

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
WORKDIR /app
COPY --from=build /out/usage-limits-api /app/usage-limits-api
USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/usage-limits-api"]
