package config

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"rollfinders/internal/services/api/environments"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	ReadTimeout          time.Duration
	WriteTimeout         time.Duration
	ShutdownTimeout      time.Duration
	ApplicationID        string
	JWTSecret            string
	UserBaseURL          string
	AuthorisationBaseURL string
	AcademyBaseURL       string
	OrganisationBaseURL  string
	CourseBaseURL        string
	BookingBaseURL       string
	PaymentBaseURL       string
	SubscriptionBaseURL  string
	WalletBaseURL        string
	TransferBaseURL      string
	PricingBaseURL       string
	LegacyNextBaseURL    string
}

func Load() (Config, error) {
	return LoadFrom(environments.New())
}

func LoadFrom(env environments.Environment) (Config, error) {
	cfg := Config{
		Port:                 env.GetWithDefault("PORT", "8080"),
		DatabaseURL:          databaseURL(env),
		ReadTimeout:          durationOrDefault(env, "READ_TIMEOUT", 10*time.Second),
		WriteTimeout:         durationOrDefault(env, "WRITE_TIMEOUT", 30*time.Second),
		ShutdownTimeout:      durationOrDefault(env, "SHUTDOWN_TIMEOUT", 10*time.Second),
		ApplicationID:        env.GetWithDefault("ROLLFINDERS_APPLICATION_ID", "app_rollfinders"),
		JWTSecret:            env.GetWithDefault("JWT_SECRET", "local-user-jwt-secret"),
		UserBaseURL:          cleanURL(env.GetWithDefault("USER_PUBLIC_BASE_URL", "http://localhost:3001")),
		AuthorisationBaseURL: cleanURL(env.GetWithDefault("AUTHORISATION_PUBLIC_BASE_URL", "http://localhost:8085")),
		AcademyBaseURL:       cleanURL(env.GetWithDefault("ACADEMY_PUBLIC_BASE_URL", "http://localhost:3006")),
		OrganisationBaseURL:  cleanURL(env.GetWithDefault("ORGANISATION_PUBLIC_BASE_URL", "http://localhost:8086")),
		CourseBaseURL:        cleanURL(env.GetWithDefault("COURSE_PUBLIC_BASE_URL", "http://localhost:3004")),
		BookingBaseURL:       cleanURL(env.GetWithDefault("BOOKING_PUBLIC_BASE_URL", "http://localhost:3005")),
		PaymentBaseURL:       cleanURL(env.GetWithDefault("PAYMENT_PUBLIC_BASE_URL", "http://localhost:3002")),
		SubscriptionBaseURL:  cleanURL(env.GetWithDefault("SUBSCRIPTION_PUBLIC_BASE_URL", "http://localhost:3008")),
		WalletBaseURL:        cleanURL(env.GetWithDefault("WALLET_PUBLIC_BASE_URL", "http://localhost:3009")),
		TransferBaseURL:      cleanURL(env.GetWithDefault("TRANSFER_PUBLIC_BASE_URL", "http://localhost:3010")),
		PricingBaseURL:       cleanURL(env.GetWithDefault("PRICING_PUBLIC_BASE_URL", "http://localhost:3011")),
		LegacyNextBaseURL:    cleanURL(env.GetWithDefault("LEGACY_NEXT_PUBLIC_BASE_URL", "http://localhost:3000")),
	}
	if cfg.Port == "" {
		return Config{}, errors.New("PORT must not be empty")
	}
	for name, value := range cfg.serviceURLs() {
		if err := validateURL(value); err != nil {
			return Config{}, errors.New(name + " must be a valid absolute URL")
		}
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

func (c Config) serviceURLs() map[string]string {
	return map[string]string{
		"USER_PUBLIC_BASE_URL":          c.UserBaseURL,
		"AUTHORISATION_PUBLIC_BASE_URL": c.AuthorisationBaseURL,
		"ACADEMY_PUBLIC_BASE_URL":       c.AcademyBaseURL,
		"ORGANISATION_PUBLIC_BASE_URL":  c.OrganisationBaseURL,
		"COURSE_PUBLIC_BASE_URL":        c.CourseBaseURL,
		"BOOKING_PUBLIC_BASE_URL":       c.BookingBaseURL,
		"PAYMENT_PUBLIC_BASE_URL":       c.PaymentBaseURL,
		"SUBSCRIPTION_PUBLIC_BASE_URL":  c.SubscriptionBaseURL,
		"WALLET_PUBLIC_BASE_URL":        c.WalletBaseURL,
		"TRANSFER_PUBLIC_BASE_URL":      c.TransferBaseURL,
		"PRICING_PUBLIC_BASE_URL":       c.PricingBaseURL,
		"LEGACY_NEXT_PUBLIC_BASE_URL":   c.LegacyNextBaseURL,
	}
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
