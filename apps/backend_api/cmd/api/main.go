package main

import (
	"log/slog"
	"os"
)

func main() {
	runGateway(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
}
