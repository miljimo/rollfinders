package server

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"
)

const passwordResetTokenBytes = 32

func passwordResetToken() (string, string, error) {
	var raw [passwordResetTokenBytes]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", "", err
	}
	token := hex.EncodeToString(raw[:])
	sum := sha256.Sum256([]byte(token))
	return token, hex.EncodeToString(sum[:]), nil
}

func passwordResetHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (s *server) requestPasswordReset(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" || !strings.Contains(email, "@") {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	user, err := s.findUserByIdentifier(r.Context(), email)
	if err != nil || user.Disabled || user.Status != statusActive {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	token, tokenHash, err := passwordResetToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to create password reset token.")
		return
	}
	expiresAt := time.Now().UTC().Add(24 * time.Hour)
	if _, err := s.db.Procedure(r.Context(), `users."passwordResetTokenCreate"`, newID(), user.ID, tokenHash, expiresAt); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to create password reset token.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"token":     token,
		"expiresAt": expiresAt,
		"user":      map[string]any{"id": user.ID, "email": user.Email, "name": user.Name},
	})
}

func (s *server) confirmPasswordReset(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.Token) == "" || len(body.Password) < 8 {
		writeError(w, http.StatusBadRequest, "Valid token and password are required.")
		return
	}
	rows, err := s.db.Function(r.Context(), "users.password_reset_token_get", passwordResetHash(body.Token))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to reset password.")
		return
	}
	if len(rows) == 0 {
		writeError(w, http.StatusBadRequest, "This password reset link is invalid or expired.")
		return
	}
	passwordHash, err := hashPassword(body.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to reset password.")
		return
	}
	userID := stringValue(rows[0]["user_id"])
	if _, err := s.db.Procedure(r.Context(), `users."passwordResetComplete"`, stringValue(rows[0]["id"]), userID, passwordHash); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to reset password.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":   true,
		"user": map[string]any{"id": userID, "email": stringValue(rows[0]["email"]), "name": stringPtrValue(rows[0]["name"])},
	})
}

func (s *server) validatePasswordReset(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	rows, err := s.db.Function(r.Context(), "users.password_reset_token_valid", passwordResetHash(body.Token))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to validate password reset token.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"valid": len(rows) > 0 && boolValue(firstValue(rows[0]))})
}
