package config

import (
	"errors"
	"time"

	"payments/internal/environments"
)

type Config struct {
	Port                        string
	DatabaseURL                 string
	APIKey                      string
	PublicBaseURL               string
	ApplicationPaymentStatusURL string
	MetricsEnabled              bool
	ReadTimeout                 time.Duration
	WriteTimeout                time.Duration
	ShutdownTimeout             time.Duration
}

func Load() (Config, error) {
	return LoadFrom(environments.New())
}

func LoadFrom(env environments.Environment) (Config, error) {
	cfg := Config{
		Port:                        env.GetWithDefault("PORT", "8080"),
		DatabaseURL:                 env.Get("DATABASE_URL"),
		APIKey:                      env.Get("API_KEY"),
		PublicBaseURL:               env.GetWithDefault("PAYMENT_PUBLIC_BASE_URL", "http://localhost:8080"),
		ApplicationPaymentStatusURL: env.GetWithDefault("PAYMENT_APPLICATION_STATUS_URL", "http://localhost:3000/payments/status"),
		MetricsEnabled:              env.GetWithDefault("METRICS_ENABLED", "true") != "false",
		ReadTimeout:                 durationOrDefault(env, "READ_TIMEOUT", 5*time.Second),
		WriteTimeout:                durationOrDefault(env, "WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout:             durationOrDefault(env, "SHUTDOWN_TIMEOUT", 10*time.Second),
	}

	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
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
