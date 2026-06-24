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

func (e osEnvironment) GetWithDefault(key string, fallback string) string {
	if value := e.Get(key); value != "" {
		return value
	}
	return fallback
}
