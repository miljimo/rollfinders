FROM golang:1.24-alpine AS build
WORKDIR /src
COPY apps/backend_api/go.mod apps/backend_api/go.sum ./
RUN go mod download
COPY apps/backend_api ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/transfer-api ./cmd/services/transfer/api

FROM alpine:3.20
RUN adduser -D -H appuser
COPY --from=build /out/transfer-api /app/transfer-api
USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/transfer-api"]
