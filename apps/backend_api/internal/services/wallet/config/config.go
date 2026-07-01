package config

import (
	"errors"
	"time"

	"rollfinders/internal/core/environments"
)

type Config struct {
	Port            string
	DatabaseURL     string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
	MetricsEnabled  bool
}

func Load() (Config, error) {
	return LoadFrom(environments.New())
}

func LoadFrom(env environments.Environment) (Config, error) {
	cfg := Config{
		Port:            env.GetWithDefault("PORT", "8080"),
		DatabaseURL:     env.Get("DATABASE_URL"),
		ReadTimeout:     durationOrDefault(env, "READ_TIMEOUT", 5*time.Second),
		WriteTimeout:    durationOrDefault(env, "WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout: durationOrDefault(env, "SHUTDOWN_TIMEOUT", 10*time.Second),
		MetricsEnabled:  env.GetWithDefault("METRICS_ENABLED", "true") != "false",
	}
	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL must not be empty")
	}
	return cfg, nil
}

func durationOrDefault(env environments.Environment, key string, fallback time.Duration) time.Duration {
	value := env.Get(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}
