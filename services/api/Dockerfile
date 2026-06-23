FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/rollfinders-api ./cmd/api

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
WORKDIR /app
COPY --from=build /out/rollfinders-api /app/rollfinders-api
USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/rollfinders-api"]
