package environments

import (
	"fmt"
	"os"
	"regexp"
	"strconv"
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

type impEnvironment struct {
	values map[string]string
	re     *regexp.Regexp
}

func (environ *impEnvironment) Keys() []string {
	keys := make([]string, 0, len(environ.values))
	for key := range environ.values {
		keys = append(keys, key)
	}
	return keys
}

func (environ *impEnvironment) ContainsKey(key string) bool {
	_, ok := environ.values[key]
	return ok
}

func (environ *impEnvironment) Get(key string) string {
	if environ.ContainsKey(key) {
		return environ.values[key]
	}
	if val, ok := os.LookupEnv(key); ok {
		environ.values[key] = val
		return val
	}
	return ""
}

func (environ *impEnvironment) GetWithDefault(key string, defaultValue string) string {
	val := environ.Get(key)
	if strings.TrimSpace(val) == "" {
		return defaultValue
	}
	return val
}

func (environ *impEnvironment) Set(key string, value string) error {
	if _, ok := os.LookupEnv(key); ok {
		if err := os.Setenv(key, value); err != nil {
			return err
		}
	}
	environ.values[key] = value
	return nil
}

func (environ *impEnvironment) Unset(key string, value string) error {
	delete(environ.values, key)
	return os.Unsetenv(key)
}

func (environ *impEnvironment) ReplaceAll(content string) ([]byte, error) {
	re := regexp.MustCompile(`\$\{([^}]+)\}`)
	content = re.ReplaceAllStringFunc(content, func(match string) string {
		key := strings.TrimSpace(re.FindStringSubmatch(match)[1])
		return os.Getenv(key)
	})
	return []byte(content), nil
}

func (environ *impEnvironment) Load(key string) error {
	if environ.ContainsKey(key) {
		return nil
	}
	if val, ok := os.LookupEnv(key); ok {
		return environ.Set(key, val)
	}
	return fmt.Errorf("environment variable key = '%s'; not found", key)
}

func (environ *impEnvironment) Presents(keys []string) error {
	if len(keys) == 0 {
		return fmt.Errorf("no keys provided")
	}
	missing := ""
	for _, key := range keys {
		if err := environ.Load(key); err != nil {
			missing += fmt.Sprintf("'%s': not found\n", strings.ToUpper(key))
		}
	}
	if missing != "" {
		return fmt.Errorf("environment variables not presented \n%s", missing)
	}
	return nil
}

func (environ *impEnvironment) Int(key string) (int, error) {
	val := environ.Get(key)
	if strings.TrimSpace(val) == "" {
		return 0, fmt.Errorf("empty string provided for %s", key)
	}
	return strconv.Atoi(val)
}

func New() Environment {
	return &impEnvironment{
		re:     regexp.MustCompile(`\$\{([^}]+)\}`),
		values: make(map[string]string),
	}
}
