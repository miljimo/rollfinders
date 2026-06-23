FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/notification-api ./cmd/api \
    && CGO_ENABLED=0 GOOS=linux go build -o /out/notification-worker ./cmd/worker

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
WORKDIR /app
COPY --from=build /out/notification-api /app/notification-api
COPY --from=build /out/notification-worker /app/notification-worker
USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/notification-api"]
