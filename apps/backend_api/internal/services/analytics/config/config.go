package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"time"
)

type Config struct {
	Port            string
	DatabaseURL     string
	APIKey          string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Port:            env("PORT", "8080"),
		DatabaseURL:     databaseURL(),
		APIKey:          os.Getenv("ANALYTICS_API_KEY"),
		ReadTimeout:     duration("READ_TIMEOUT", 5*time.Second),
		WriteTimeout:    duration("WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout: duration("SHUTDOWN_TIMEOUT", 10*time.Second),
	}
	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("database configuration is required")
	}
	return cfg, nil
}

func databaseURL() string {
	if value := os.Getenv("DATABASE_URL"); value != "" {
		return value
	}
	host := os.Getenv("DB_HOST")
	name := os.Getenv("DB_NAME")
	if host == "" || name == "" {
		return ""
	}
	user := env("DB_USER", "postgres")
	password := env("DB_PASSWORD", "postgres")
	port := env("DB_PORT", "5432")
	return fmt.Sprintf("postgres://%s@%s:%s/%s?sslmode=disable", url.UserPassword(user, password), host, port, url.PathEscape(name))
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func duration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}
