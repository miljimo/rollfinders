package server

import (
	"net/http"
	"strings"
	"time"

	"rollfinders/internal/services/users/databases"
)

const accountDeletionVerificationLifetime = 24 * time.Hour

type accountDeletionRequest struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userId"`
	Source      string     `json:"source"`
	Status      string     `json:"status"`
	RequestedAt time.Time  `json:"requestedAt"`
	VerifiedAt  *time.Time `json:"verifiedAt"`
	DueAt       *time.Time `json:"dueAt"`
	CancelledAt *time.Time `json:"cancelledAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

func accountDeletionRequestFromRow(row databases.DBRow) accountDeletionRequest {
	return accountDeletionRequest{
		ID:          stringValue(row["id"]),
		UserID:      stringValue(row["user_id"]),
		Source:      stringValue(row["source"]),
		Status:      stringValue(row["status"]),
		RequestedAt: timeValue(row["requested_at"]),
		VerifiedAt:  timePtrValue(row["verified_at"]),
		DueAt:       timePtrValue(row["due_at"]),
		CancelledAt: timePtrValue(row["cancelled_at"]),
		CreatedAt:   timeValue(row["created_at"]),
		UpdatedAt:   timeValue(row["updated_at"]),
	}
}

func (s *server) accountDeletionRequestForUser(r *http.Request, userID string) (*accountDeletionRequest, error) {
	rows, err := s.db.Function(r.Context(), "users.account_deletion_request_get_active", userID)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	request := accountDeletionRequestFromRow(rows[0])
	return &request, nil
}

func (s *server) createSelfAccountDeletionRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	if _, err := s.db.Procedure(r.Context(), `users."accountDeletionRequestCreateAuthenticated"`, newID(), actor.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to create account deletion request.")
		return
	}
	request, err := s.accountDeletionRequestForUser(r, actor.ID)
	if err != nil || request == nil {
		writeError(w, http.StatusInternalServerError, "Unable to create account deletion request.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"request": request})
}

func (s *server) createEmailAccountDeletionRequest(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	genericResponse := func() {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" || !strings.Contains(email, "@") {
		genericResponse()
		return
	}
	user, err := s.findUserByIdentifier(r.Context(), email)
	if err != nil {
		genericResponse()
		return
	}
	token, tokenHash, err := passwordResetToken()
	if err != nil {
		s.logger.Error("create account deletion verification token", "error", err)
		genericResponse()
		return
	}
	expiresAt := time.Now().UTC().Add(accountDeletionVerificationLifetime)
	if _, err := s.db.Procedure(
		r.Context(),
		`users."accountDeletionRequestCreatePublic"`,
		newID(),
		user.ID,
		tokenHash,
		expiresAt,
	); err != nil {
		s.logger.Error("store account deletion verification token", "error", err)
		genericResponse()
		return
	}
	matches, err := s.db.Function(
		r.Context(),
		"users.account_deletion_request_verification_matches",
		user.ID,
		tokenHash,
	)
	if err != nil || len(matches) == 0 || !boolValue(firstValue(matches[0])) {
		genericResponse()
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"token":     token,
		"expiresAt": expiresAt,
		"user":      map[string]any{"id": user.ID, "email": user.Email, "name": user.Name},
	})
}

func (s *server) confirmAccountDeletionRequest(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	token := strings.TrimSpace(body.Token)
	if token == "" {
		writeError(w, http.StatusBadRequest, "This account deletion link is invalid or expired.")
		return
	}
	rows, err := s.db.Function(r.Context(), "users.account_deletion_request_confirm", passwordResetHash(token))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to confirm account deletion request.")
		return
	}
	if len(rows) == 0 {
		writeError(w, http.StatusBadRequest, "This account deletion link is invalid or expired.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"request": accountDeletionRequestFromRow(rows[0]),
		"user": map[string]any{
			"id":    stringValue(rows[0]["user_id"]),
			"email": stringValue(rows[0]["email"]),
			"name":  stringPtrValue(rows[0]["name"]),
		},
	})
}

func (s *server) currentAccountDeletionRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	request, err := s.accountDeletionRequestForUser(r, actor.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to load account deletion request.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"request": request})
}

func (s *server) cancelAccountDeletionRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	rows, err := s.db.Function(r.Context(), "users.account_deletion_request_cancel", actor.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to cancel account deletion request.")
		return
	}
	if len(rows) == 0 {
		writeError(w, http.StatusNotFound, "No active account deletion request was found.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"request": accountDeletionRequestFromRow(rows[0])})
}
