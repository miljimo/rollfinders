package config

import "testing"

type testEnv map[string]string

func (e testEnv) Keys() []string {
	keys := make([]string, 0, len(e))
	for key := range e {
		keys = append(keys, key)
	}
	return keys
}

func (e testEnv) ContainsKey(key string) bool { _, ok := e[key]; return ok }
func (e testEnv) Get(key string) string       { return e[key] }
func (e testEnv) GetWithDefault(key string, defaultValue string) string {
	if value := e.Get(key); value != "" {
		return value
	}
	return defaultValue
}
func (e testEnv) Set(key string, value string) error {
	e[key] = value
	return nil
}
func (e testEnv) Unset(key string, _ string) error {
	delete(e, key)
	return nil
}
func (e testEnv) Load(key string) error                     { return nil }
func (e testEnv) ReplaceAll(content string) ([]byte, error) { return []byte(content), nil }
func (e testEnv) Presents(keys []string) error              { return nil }
func (e testEnv) Int(key string) (int, error)               { return 0, nil }

func TestLoadSetsStripeVersionAndContext(t *testing.T) {
	cfg, err := LoadFrom(testEnv{
		"STRIPE_API_VERSION": "2024-09-30.acacia",
		"STRIPE_CONTEXT":     "acct_123",
	})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.StripeAPIVersion != "2024-09-30.acacia" {
		t.Fatalf("expected Stripe API version, got %q", cfg.StripeAPIVersion)
	}
	if cfg.StripeContext != "acct_123" {
		t.Fatalf("expected Stripe context, got %q", cfg.StripeContext)
	}
}

func TestLoadTreatsUnsetStripeContextAsBlank(t *testing.T) {
	cfg, err := LoadFrom(testEnv{"STRIPE_CONTEXT": "__UNSET__"})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.StripeContext != "" {
		t.Fatalf("expected blank Stripe context, got %q", cfg.StripeContext)
	}
	if cfg.StripeAPIVersion != "2024-09-30.acacia" {
		t.Fatalf("expected default Stripe API version, got %q", cfg.StripeAPIVersion)
	}
}
