package config

import (
	"errors"
	"fmt"
	"net/url"
	"time"

	"rollfinders/internal/services/academy/environments"
)

type Config struct {
	Port            string
	DatabaseURL     string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

func Load() (Config, error) {
	return LoadFrom(environments.New())
}

func LoadFrom(env environments.Environment) (Config, error) {
	cfg := Config{
		Port:            env.GetWithDefault("PORT", "8080"),
		DatabaseURL:     databaseURL(env),
		ReadTimeout:     durationOrDefault(env, "READ_TIMEOUT", 5*time.Second),
		WriteTimeout:    durationOrDefault(env, "WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout: durationOrDefault(env, "SHUTDOWN_TIMEOUT", 10*time.Second),
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
	return fmt.Sprintf("postgres://%s@%s:%s/%s?sslmode=disable", url.UserPassword(user, password).String(), host, port, url.PathEscape(name))
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
