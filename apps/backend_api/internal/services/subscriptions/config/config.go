package config

import (
	"errors"
	"fmt"
	"net/url"
	"time"

	"rollfinders/internal/services/subscriptions/environments"
)

type Config struct {
	Port               string
	DatabaseURL        string
	EnvironmentName    string
	StripeSecretKey    string
	StripeAPIVersion   string
	CheckoutSuccessURL string
	CheckoutCancelURL  string
	ReadTimeout        time.Duration
	WriteTimeout       time.Duration
	ShutdownTimeout    time.Duration
}

func Load() (Config, error) {
	return LoadFrom(environments.New())
}

func LoadFrom(env environments.Environment) (Config, error) {
	cfg := Config{
		Port:             env.GetWithDefault("PORT", "8080"),
		DatabaseURL:      databaseURL(env),
		EnvironmentName:  env.GetWithDefault("ENVIRONMENT_NAME", env.GetWithDefault("APP_ENV", "local")),
		StripeSecretKey:  firstNonEmpty(env.Get("STRIPE_SECRET_KEY"), env.Get("PAYMENT_GATEWAY_API_KEY")),
		StripeAPIVersion: env.GetWithDefault("STRIPE_API_VERSION", "2024-09-30.acacia"),
		CheckoutSuccessURL: firstNonEmpty(
			env.Get("SUBSCRIPTION_CHECKOUT_SUCCESS_URL"),
			env.Get("PAYMENT_DEFAULT_CLIENT_CALLBACK_URL"),
			"http://localhost:3000/dashboard/subscriptions?billing=success",
		),
		CheckoutCancelURL: firstNonEmpty(
			env.Get("SUBSCRIPTION_CHECKOUT_CANCEL_URL"),
			"http://localhost:3000/dashboard/subscriptions?billing=cancelled",
		),
		ReadTimeout:     durationOrDefault(env, "READ_TIMEOUT", 5*time.Second),
		WriteTimeout:    durationOrDefault(env, "WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout: durationOrDefault(env, "SHUTDOWN_TIMEOUT", 10*time.Second),
	}
	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}
	return cfg, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
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
