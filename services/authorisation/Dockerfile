FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go build -o /out/authorisation-api ./cmd/api

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/authorisation-api /app/authorisation-api
EXPOSE 8080
ENTRYPOINT ["/app/authorisation-api"]
