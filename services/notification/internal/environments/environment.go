package environments

import (
	"os"
	"strings"
)

type Environment interface {
	Keys() []string
	ContainsKey(key string) bool
	Get(key string) string
	GetWithDefault(key string, defaultValue string) string
	Set(key string, value string) error
	Unset(key string, value string) error
	Load(key string) error
	ReplaceAll(content string) ([]byte, error)
	Presents(keys []string) error
	Int(key string) (int, error)
}

type environment struct{}

func New() Environment {
	return environment{}
}

func (e environment) Keys() []string {
	return os.Environ()
}

func (e environment) ContainsKey(key string) bool {
	_, ok := os.LookupEnv(key)
	return ok
}

func (e environment) Get(key string) string {
	return os.Getenv(key)
}

func (e environment) GetWithDefault(key string, defaultValue string) string {
	if value := e.Get(key); value != "" {
		return value
	}
	return defaultValue
}

func (e environment) Set(key string, value string) error {
	return os.Setenv(key, value)
}

func (e environment) Unset(key string, _ string) error {
	return os.Unsetenv(key)
}

func (e environment) Load(key string) error {
	if key == "" {
		return nil
	}
	return nil
}

func (e environment) ReplaceAll(content string) ([]byte, error) {
	for _, item := range os.Environ() {
		parts := strings.SplitN(item, "=", 2)
		if len(parts) == 2 {
			content = strings.ReplaceAll(content, "${"+parts[0]+"}", parts[1])
		}
	}
	return []byte(content), nil
}

func (e environment) Presents(keys []string) error {
	return nil
}

func (e environment) Int(key string) (int, error) {
	return 0, nil
}
