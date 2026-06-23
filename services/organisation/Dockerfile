FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go build -o /out/organisation-api ./cmd/api

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/organisation-api /app/organisation-api
EXPOSE 8080
ENTRYPOINT ["/app/organisation-api"]
