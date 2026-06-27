package config

import (
	"errors"
	"net/url"
	"strings"
	"time"

	"rollfinders/internal/services/transfer/environments"
)

type Config struct {
	Port                 string
	WalletBaseURL        string
	WalletRequestTimeout time.Duration
	ReadTimeout          time.Duration
	WriteTimeout         time.Duration
	ShutdownTimeout      time.Duration
	MetricsEnabled       bool
}

func Load() (Config, error) {
	return LoadFrom(environments.New())
}

func LoadFrom(env environments.Environment) (Config, error) {
	cfg := Config{
		Port:                 env.GetWithDefault("PORT", "8080"),
		WalletBaseURL:        cleanURL(env.GetWithDefault("WALLET_PUBLIC_BASE_URL", "http://localhost:3009")),
		WalletRequestTimeout: durationOrDefault(env, "WALLET_REQUEST_TIMEOUT", 5*time.Second),
		ReadTimeout:          durationOrDefault(env, "READ_TIMEOUT", 5*time.Second),
		WriteTimeout:         durationOrDefault(env, "WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout:      durationOrDefault(env, "SHUTDOWN_TIMEOUT", 10*time.Second),
		MetricsEnabled:       env.GetWithDefault("METRICS_ENABLED", "true") != "false",
	}
	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}
	if err := validateURL(cfg.WalletBaseURL); err != nil {
		return Config{}, errors.New("WALLET_PUBLIC_BASE_URL must be a valid absolute URL")
	}
	return cfg, nil
}

func cleanURL(value string) string {
	return strings.TrimRight(strings.TrimSpace(value), "/")
}

func validateURL(value string) error {
	parsed, err := url.Parse(value)
	if err != nil {
		return err
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return errors.New("absolute URL is required")
	}
	return nil
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
