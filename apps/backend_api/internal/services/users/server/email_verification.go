package server

import (
	"net/http"
	"strings"
	"time"
)

func (s *server) requestEmailVerification(w http.ResponseWriter, r *http.Request) {
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
	if err != nil || user.EmailStatus != "PENDING_VERIFICATION" {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	token, tokenHash, err := passwordResetToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to create email verification token.")
		return
	}
	expiresAt := time.Now().UTC().Add(24 * time.Hour)
	if _, err := s.db.Procedure(r.Context(), `users."emailVerificationTokenCreate"`, newID(), user.ID, tokenHash, expiresAt); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to create email verification token.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"token":     token,
		"expiresAt": expiresAt,
		"user":      map[string]any{"id": user.ID, "email": user.Email, "name": user.Name},
	})
}

func (s *server) confirmEmailVerification(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.Token) == "" {
		writeError(w, http.StatusBadRequest, "Verification token is required.")
		return
	}
	if _, err := s.db.Procedure(r.Context(), `users."emailVerificationComplete"`, passwordResetHash(body.Token)); err != nil {
		writeError(w, http.StatusBadRequest, "This email verification link is invalid or expired.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
