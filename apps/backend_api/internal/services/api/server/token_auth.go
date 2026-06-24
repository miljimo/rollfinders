package server

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func (s *server) subjectIDFromRequest(r *http.Request) string {
	if value := strings.TrimSpace(r.Header.Get(actorUserIDHeader)); value != "" {
		return value
	}
	subjectID, ok := s.subjectIDFromBearer(r.Header.Get("Authorization"))
	if !ok {
		return ""
	}
	return subjectID
}

func (s *server) subjectIDFromBearer(header string) (string, bool) {
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return "", false
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, prefix))
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return "", false
	}
	unsigned := parts[0] + "." + parts[1]
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return "", false
	}
	mac := hmac.New(sha256.New, []byte(s.cfg.JWTSecret))
	_, _ = mac.Write([]byte(unsigned))
	if !hmac.Equal(signature, mac.Sum(nil)) {
		return "", false
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", false
	}
	var claims struct {
		Subject string `json:"sub"`
		Expiry  int64  `json:"exp"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", false
	}
	if strings.TrimSpace(claims.Subject) == "" || claims.Expiry <= time.Now().Unix() {
		return "", false
	}
	return strings.TrimSpace(claims.Subject), true
}
