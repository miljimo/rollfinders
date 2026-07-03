package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"

	"rollfinders/internal/services/api/config"
)

func TestSubjectIDFromBearerAcceptsValidAccessToken(t *testing.T) {
	s := &server{cfg: config.Config{JWTSecret: "test-secret"}}
	token := signedTestToken(t, "user_123", "test-secret", time.Now().Add(time.Minute))

	subject, ok := s.subjectIDFromBearer("Bearer " + token)
	if !ok {
		t.Fatal("expected token to be accepted")
	}
	if subject != "user_123" {
		t.Fatalf("unexpected subject: %q", subject)
	}
}

func TestSubjectIDFromBearerRejectsInvalidSignature(t *testing.T) {
	s := &server{cfg: config.Config{JWTSecret: "test-secret"}}
	token := signedTestToken(t, "user_123", "wrong-secret", time.Now().Add(time.Minute))

	if _, ok := s.subjectIDFromBearer("Bearer " + token); ok {
		t.Fatal("expected invalid signature to be rejected")
	}
}

func signedTestToken(t *testing.T, subject string, secret string, expiry time.Time) string {
	t.Helper()
	header, err := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	if err != nil {
		t.Fatal(err)
	}
	claims, err := json.Marshal(map[string]any{"sub": subject, "exp": expiry.Unix()})
	if err != nil {
		t.Fatal(err)
	}
	unsigned := base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(claims)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(unsigned))
	return unsigned + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
