package config

import (
	"errors"
	"rollfinders/internal/core/environments"
	"time"
)

type Config struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
	APIKey          string
}

func Load() (Config, error) {
	env := environments.New()
	cfg := Config{
		Port:            env.GetWithDefault("PORT", "8080"),
		ReadTimeout:     durationEnv(env.Get("READ_TIMEOUT"), 10*time.Second),
		WriteTimeout:    durationEnv(env.Get("WRITE_TIMEOUT"), 10*time.Second),
		ShutdownTimeout: durationEnv(env.Get("SHUTDOWN_TIMEOUT"), 10*time.Second),
		APIKey:          env.GetWithDefault("SERVICE_API_KEY", ""),
	}
	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}
	return cfg, nil
}

func durationEnv(value string, fallback time.Duration) time.Duration {
	if value != "" {
		parsed, err := time.ParseDuration(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}
