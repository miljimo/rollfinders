FROM golang:1.24-alpine AS build
WORKDIR /src/apps/backend_api
COPY apps/backend_api/go.mod apps/backend_api/go.sum ./
RUN go mod download
COPY apps/backend_api ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/academy-api ./cmd/services/academy/api

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
WORKDIR /app
COPY --from=build /out/academy-api /app/academy-api
USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/academy-api"]
