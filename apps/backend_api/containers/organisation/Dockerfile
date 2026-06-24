FROM golang:1.24-alpine AS build
WORKDIR /src/apps/backend_api
COPY apps/backend_api/go.mod apps/backend_api/go.sum ./
RUN go mod download
COPY apps/backend_api ./
RUN go build -o /out/organisation-api ./cmd/services/organisation/api

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/organisation-api /app/organisation-api
EXPOSE 8080
ENTRYPOINT ["/app/organisation-api"]
