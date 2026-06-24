package config

import (
	"errors"
	"os"
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
	cfg := Config{
		Port:            env("PORT", "8080"),
		ReadTimeout:     durationEnv("READ_TIMEOUT", 10*time.Second),
		WriteTimeout:    durationEnv("WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout: durationEnv("SHUTDOWN_TIMEOUT", 10*time.Second),
		APIKey:          env("SERVICE_API_KEY", ""),
	}
	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}
	return cfg, nil
}

func env(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		parsed, err := time.ParseDuration(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}
