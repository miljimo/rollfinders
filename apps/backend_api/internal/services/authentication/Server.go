package authentication

import (
	"log/slog"
	"sync"
)

type Service struct {
	logger slog.Logger
	mu     sync.Mutex
}
