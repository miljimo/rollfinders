package config

import (
	"errors"
	"fmt"
	"net/url"
	"time"

	"rollfinders/internal/services/users/environments"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	JWTSecret            string
	DefaultUserRole      string
	SuperAdminEmail      string
	SuperAdminName       string
	SuperAdminPass       string
	AuthorisationCutover bool
	ReadTimeout          time.Duration
	WriteTimeout         time.Duration
	ShutdownTimeout      time.Duration
}

func Load() (Config, error) {
	return LoadFrom(environments.New())
}

func LoadFrom(env environments.Environment) (Config, error) {
	cfg := Config{
		Port:                 env.GetWithDefault("PORT", "8080"),
		DatabaseURL:          databaseURL(env),
		JWTSecret:            env.GetWithDefault("JWT_SECRET", "local-user-jwt-secret"),
		DefaultUserRole:      env.GetWithDefault("DEFAULT_USER_ROLE", "STANDARD_USER"),
		SuperAdminEmail:      env.GetWithDefault("SUPER_ADMIN_EMAIL", env.GetWithDefault("DEFAULT_SUPER_ADMIN_EMAIL", "admin@rollfinder.com")),
		SuperAdminName:       env.GetWithDefault("SUPER_ADMIN_NAME", env.GetWithDefault("DEFAULT_SUPER_ADMIN_NAME", "RollFinder Admin")),
		SuperAdminPass:       env.GetWithDefault("SUPER_ADMIN_PASSWORD", env.GetWithDefault("DEFAULT_SUPER_ADMIN_PASSWORD", "")),
		AuthorisationCutover: env.GetWithDefault("AUTHORISATION_CUTOVER", "false") == "true",
		ReadTimeout:          durationDefault(env, "READ_TIMEOUT", 5*time.Second),
		WriteTimeout:         durationDefault(env, "WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout:      durationDefault(env, "SHUTDOWN_TIMEOUT", 10*time.Second),
	}
	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("database configuration is required")
	}
	return cfg, nil
}

func databaseURL(env environments.Environment) string {
	if value := env.Get("DATABASE_URL"); value != "" {
		return value
	}
	host := env.Get("DB_HOST")
	name := env.Get("DB_NAME")
	if host == "" || name == "" {
		return ""
	}
	user := env.GetWithDefault("DB_USER", "postgres")
	password := env.GetWithDefault("DB_PASSWORD", "postgres")
	port := env.GetWithDefault("DB_PORT", "5432")
	return fmt.Sprintf("postgres://%s@%s:%s/%s?sslmode=disable", url.UserPassword(user, password).String(), host, port, url.PathEscape(name))
}

func durationDefault(env environments.Environment, key string, fallback time.Duration) time.Duration {
	if value := env.Get(key); value != "" {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
	}
	return fallback
}
