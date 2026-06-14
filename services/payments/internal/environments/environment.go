package environments

import (
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
)

type VariableNotFoundError struct {
	key string
}

func (e *VariableNotFoundError) Error() string {
	return fmt.Sprintf("environment variable key = '%s'; not found", e.key)
}

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
	// Data Converters
	Int(key string) (int, error)
}

type impEnvironment struct {
	values map[string]string
	re     *regexp.Regexp
}

func (environ *impEnvironment) Keys() []string {
	var keys []string
	for key, _ := range environ.values {
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
	val, ok := os.LookupEnv(key)
	if ok {
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

	_, ok := os.LookupEnv(key)
	if ok {
		os.Setenv(key, value)
		environ.values[key] = value
		return nil
	}
	environ.values[key] = value
	return nil
}

func (environ *impEnvironment) Unset(key string, value string) error {
	if environ.ContainsKey(key) {
		delete(environ.values, key)
	}
	return os.Unsetenv(key)
}

func (environ *impEnvironment) ReplaceAll(content string) ([]byte, error) {
	re := regexp.MustCompile(`\$\{([^}]+)\}`)
	content = re.ReplaceAllStringFunc(content, func(match string) string {
		key := strings.TrimSpace(re.FindStringSubmatch(match)[1])
		val, ok := os.LookupEnv(key)
		if !ok {
			fmt.Println("Missing environment variables = ", key)
		}
		return val
	})
	return []byte(content), nil
}

func (environ *impEnvironment) Load(key string) error {
	if environ.ContainsKey(key) {
		return nil
	}
	val, ok := os.LookupEnv(key)
	if ok {
		return environ.Set(key, val)
	}

	return &VariableNotFoundError{key: key}

}

func (environ *impEnvironment) Int(key string) (int, error) {
	val := environ.Get(key)
	if strings.TrimSpace(val) == "" {
		return 0, fmt.Errorf("Empty string provided for %s", key)
	}
	return strconv.Atoi(val)
}

func (environ *impEnvironment) Presents(keys []string) error {
	errMessages := ""
	if len(keys) == 0 {
		return fmt.Errorf("No keys provided")
	}
	for _, key := range keys {
		err := environ.Load(key)
		if err != nil {
			errMessages += fmt.Sprintf("'%s': %s\n", strings.ToUpper(key), "not found")
		}
	}
	if errMessages != "" {
		return fmt.Errorf("Environment variables not presented \n%s", errMessages)
	}
	return nil
}

/*************************************
**************************************/
var instance *impEnvironment = nil

func New() Environment {
	if instance == nil {
		instance = &impEnvironment{
			re:     regexp.MustCompile(`\$\{([^}]+)\}`),
			values: make(map[string]string, 0),
		}

	}
	return instance
}

func Keys(content string) []string {
	re := regexp.MustCompile(`\$\{([^}]+)\}`)
	var keys []string = make([]string, 0)
	for _, m := range re.FindAllStringSubmatch(content, -1) {
		keys = append(keys, m[1])
	}
	return keys

}

// The function will load an
func FromString(content string) Environment {
	environ := New()

	if (strings.Trim(content, " ")) == "" {
		return environ
	}

	keys := Keys(content)
	for _, key := range keys {
		err := environ.Load(key)
		if err != nil {
			fmt.Println(err)
			continue
		}

	}
	return environ
}

// Help functions
