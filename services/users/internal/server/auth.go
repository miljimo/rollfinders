package server

import (
	"net/http"
	"strings"
	"time"

	"users/internal/handlers"
)

type issuedTokens struct {
	AccessToken  string
	RefreshToken string
	SessionID    string
}

func (s *server) issueSessionTokens(r *http.Request, userID, deviceID string) (issuedTokens, error) {
	now := time.Now().UTC()
	sessionID := newID()
	refreshToken, refreshHash, err := randomToken("rft")
	if err != nil {
		return issuedTokens{}, err
	}
	if _, err := s.db.Procedure(r.Context(), `users."sessionCreate"`,
		sessionID,
		userID,
		deviceID,
		r.RemoteAddr,
		r.UserAgent(),
		now,
		now.Add(refreshTokenTTL),
	); err != nil {
		return issuedTokens{}, err
	}
	if _, err := s.db.Procedure(r.Context(), `users."refreshTokenCreate"`,
		newID(),
		sessionID,
		refreshHash,
		now.Add(refreshTokenTTL),
	); err != nil {
		return issuedTokens{}, err
	}
	accessToken, err := s.accessToken(userID, sessionID, now)
	if err != nil {
		return issuedTokens{}, err
	}
	return issuedTokens{AccessToken: accessToken, RefreshToken: refreshToken, SessionID: sessionID}, nil
}

func (s *server) register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Username  string `json:"username"`
		Password  string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	username := strings.ToLower(strings.TrimSpace(body.Username))
	if strings.TrimSpace(body.FirstName) == "" || strings.TrimSpace(body.LastName) == "" || len(body.Password) < 5 || (email == "" && username == "") {
		writeError(w, http.StatusBadRequest, "First name, last name, password, and at least one credential are required.")
		return
	}
	passwordHash, err := hashPassword(body.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to register user.")
		return
	}
	id := newID()
	displayName := strings.TrimSpace(body.FirstName + " " + body.LastName)
	if _, err := s.db.Procedure(r.Context(), `users."userRegister"`,
		id,
		strings.TrimSpace(body.FirstName),
		strings.TrimSpace(body.LastName),
		displayName,
		email,
		username,
		passwordHash,
		s.cfg.DefaultUserRole,
	); err != nil {
		writeError(w, http.StatusConflict, "Unable to register user.")
		return
	}
	user, err := s.findUserByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to register user.")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"user": publicUser(user)})
}

func (s *server) refresh(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	rows, err := s.db.Function(r.Context(), "users.refresh_token_session_get", tokenHash(body.RefreshToken))
	if err != nil || len(rows) == 0 {
		writeError(w, http.StatusUnauthorized, "Invalid refresh token.")
		return
	}
	now := time.Now().UTC()
	sessionID := stringValue(rows[0]["session_id"])
	userID := stringValue(rows[0]["user_id"])
	accessToken, err := s.accessToken(userID, sessionID, now)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to refresh token.")
		return
	}
	_, _ = s.db.Procedure(r.Context(), `users."sessionTouch"`, sessionID)
	writeJSON(w, http.StatusOK, map[string]any{"access_token": accessToken, "expires_in": int(accessTokenTTL.Seconds())})
}

func (s *server) logout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SessionID    string `json:"session_id"`
		RefreshToken string `json:"refresh_token"`
		AllDevices   bool   `json:"all_devices"`
		UserID       string `json:"user_id"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.AllDevices && strings.TrimSpace(body.UserID) != "" {
		_, _ = s.db.Procedure(r.Context(), `users."sessionsRevokeForUser"`, strings.TrimSpace(body.UserID))
	} else if strings.TrimSpace(body.SessionID) != "" {
		_, _ = s.db.Procedure(r.Context(), `users."sessionRevoke"`, strings.TrimSpace(body.SessionID))
	} else if strings.TrimSpace(body.RefreshToken) != "" {
		_, _ = s.db.Procedure(r.Context(), `users."sessionRevokeByRefreshToken"`, tokenHash(body.RefreshToken))
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *server) sessions(w http.ResponseWriter, r *http.Request) {
	userID := strings.TrimSpace(r.URL.Query().Get("user_id"))
	if userID == "" {
		writeError(w, http.StatusBadRequest, "user_id is required.")
		return
	}
	rows, err := s.db.Function(r.Context(), "users.sessions_list", userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to list sessions.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sessions": rows})
}

func (s *server) revokeSession(w http.ResponseWriter, r *http.Request) {
	sessionID := handlers.Param(r, "id")
	_, _ = s.db.Procedure(r.Context(), `users."sessionRevoke"`, sessionID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *server) changePassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UserID      string `json:"user_id"`
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if len(body.NewPassword) < 5 {
		writeError(w, http.StatusBadRequest, "Password must be at least 5 characters.")
		return
	}
	user, err := s.findUserByID(r.Context(), strings.TrimSpace(body.UserID))
	if err != nil || (body.OldPassword != "" && !verifyPassword(user.PasswordHash, body.OldPassword)) {
		writeError(w, http.StatusUnauthorized, "Invalid current password.")
		return
	}
	nextHash, err := hashPassword(body.NewPassword)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to change password.")
		return
	}
	if _, err := s.db.Procedure(r.Context(), `users."passwordChange"`, user.ID, nextHash); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to change password.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *server) mfaSetup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UserID     string `json:"user_id"`
		MethodType string `json:"method_type"`
		Secret     string `json:"secret"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	methodType := strings.ToUpper(strings.TrimSpace(body.MethodType))
	if methodType == "" {
		methodType = "TOTP"
	}
	secret := strings.TrimSpace(body.Secret)
	if secret == "" {
		var err error
		if methodType == "EMAIL_OTP" || methodType == "SMS_OTP" {
			secret, err = otpCode()
		} else {
			secret, err = mfaSecret()
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to set up MFA.")
			return
		}
	}
	methodID := newID()
	if _, err := s.db.Procedure(r.Context(), `users."mfaMethodCreate"`,
		methodID,
		strings.TrimSpace(body.UserID),
		methodType,
		secret,
	); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to set up MFA.")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"method_id": methodID, "method_type": methodType, "secret": secret, "enabled": false})
}

func (s *server) mfaVerify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		MethodID string `json:"method_id"`
		Code     string `json:"code"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.Code) == "" {
		writeError(w, http.StatusBadRequest, "MFA code is required.")
		return
	}
	rows, err := s.db.Function(r.Context(), "users.mfa_method_get", strings.TrimSpace(body.MethodID))
	if err != nil || len(rows) == 0 {
		writeError(w, http.StatusNotFound, "MFA method not found.")
		return
	}
	if !verifyMFA(stringValue(rows[0]["method_type"]), stringValue(rows[0]["secret"]), body.Code, time.Now().UTC()) {
		writeError(w, http.StatusUnauthorized, "Invalid MFA code.")
		return
	}
	_, _ = s.db.Procedure(r.Context(), `users."mfaMethodEnable"`, body.MethodID)
	writeJSON(w, http.StatusOK, map[string]bool{"verified": true})
}
