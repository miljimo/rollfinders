FROM golang:1.24-alpine AS build
WORKDIR /src/apps/backend_api
COPY apps/backend_api/go.mod apps/backend_api/go.sum ./
RUN go mod download
COPY apps/backend_api ./
RUN go build -o /out/authorisation-api ./cmd/services/authorisation/api
RUN go build -o /out/seed-gateway-resources ./cmd/services/authorisation/seed-gateway-resources

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/authorisation-api /app/authorisation-api
COPY --from=build /out/seed-gateway-resources /app/seed-gateway-resources
EXPOSE 8080
ENTRYPOINT ["/app/authorisation-api"]
