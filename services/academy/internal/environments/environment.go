package environments

import "os"

type Environment interface {
	Get(key string) string
	GetWithDefault(key string, fallback string) string
}

type osEnvironment struct{}

func New() Environment {
	return osEnvironment{}
}

func (osEnvironment) Get(key string) string {
	return os.Getenv(key)
}

func (env osEnvironment) GetWithDefault(key string, fallback string) string {
	if value := env.Get(key); value != "" {
		return value
	}
	return fallback
}
