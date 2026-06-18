package config

import (
	"errors"
	"fmt"
	"net/url"
	"time"

	"payments/internal/environments"
)

type Config struct {
	Port                     string
	DatabaseURL              string
	APIKey                   string
	StripeSecretKey          string
	StripeSecretKeyFile      string
	PublicBaseURL            string
	DefaultClientID          string
	DefaultClientName        string
	DefaultClientCallbackURL string
	MetricsEnabled           bool
	ReadTimeout              time.Duration
	WriteTimeout             time.Duration
	ShutdownTimeout          time.Duration
}

func Load() (Config, error) {
	return LoadFrom(environments.New())
}

func LoadFrom(env environments.Environment) (Config, error) {
	cfg := Config{
		Port:                     env.GetWithDefault("PORT", "8080"),
		DatabaseURL:              databaseURL(env),
		APIKey:                   env.Get("API_KEY"),
		StripeSecretKey:          firstNonEmpty(env.Get("STRIPE_SECRET_KEY"), env.Get("PAYMENT_GATEWAY_API_KEY")),
		StripeSecretKeyFile:      env.Get("STRIPE_SECRET_KEY_FILE"),
		PublicBaseURL:            env.GetWithDefault("PAYMENT_PUBLIC_BASE_URL", "http://localhost:8080"),
		DefaultClientID:          env.GetWithDefault("PAYMENT_DEFAULT_CLIENT_ID", "default"),
		DefaultClientName:        env.GetWithDefault("PAYMENT_DEFAULT_CLIENT_NAME", "Default Client"),
		DefaultClientCallbackURL: firstNonEmpty(env.Get("PAYMENT_DEFAULT_CLIENT_CALLBACK_URL"), env.Get("PAYMENT_APPLICATION_STATUS_URL")),
		MetricsEnabled:           env.GetWithDefault("METRICS_ENABLED", "true") != "false",
		ReadTimeout:              durationOrDefault(env, "READ_TIMEOUT", 5*time.Second),
		WriteTimeout:             durationOrDefault(env, "WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout:          durationOrDefault(env, "SHUTDOWN_TIMEOUT", 10*time.Second),
	}

	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}

	return cfg, nil
}

func databaseURL(env environments.Environment) string {
	if value := env.Get("DATABASE_URL"); value != "" {
		return value
	}
	host := env.Get("DB_HOST")
	name := env.Get("DB_NAME")
	user := env.GetWithDefault("DB_USER", "postgres")
	password := env.GetWithDefault("DB_PASSWORD", "postgres")
	if host == "" || name == "" {
		return ""
	}
	port := env.GetWithDefault("DB_PORT", "5432")
	credentials := url.UserPassword(user, password)
	return fmt.Sprintf("postgres://%s@%s:%s/%s?sslmode=disable", credentials.String(), host, port, url.PathEscape(name))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" && value != "__UNSET__" {
			return value
		}
	}
	return ""
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
