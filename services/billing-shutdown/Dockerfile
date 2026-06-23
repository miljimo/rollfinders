FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/billing-shutdown ./cmd/shutdown

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
WORKDIR /app
COPY --from=build /out/billing-shutdown /app/billing-shutdown
USER appuser
ENTRYPOINT ["/app/billing-shutdown"]
