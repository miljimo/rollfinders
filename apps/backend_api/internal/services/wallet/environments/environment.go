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
	value := env.Get(key)
	if value == "" {
		return fallback
	}
	return value
}
