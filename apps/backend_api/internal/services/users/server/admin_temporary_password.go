package server

import (
	"net/http"
	"strings"

	gatewayroutes "rollfinders/internal/core/routes"
	"rollfinders/internal/services/users/handlers"
)

const (
	minimumTemporaryPasswordLength = 8
	maximumTemporaryPasswordLength = 128
	maximumPasswordChangeReason    = 500
)

func (s *server) setAdminTemporaryPassword(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	targetID := handlers.Param(r, string(gatewayroutes.ParamUserId))
	target, err := s.findUserByID(r.Context(), targetID)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found.")
		return
	}
	if actor.ID == target.ID || target.IsProtected {
		writeError(w, http.StatusForbidden, "This user's password cannot be changed through user administration.")
		return
	}

	var body struct {
		TemporaryPassword string `json:"temporary_password"`
		Reason            string `json:"reason"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	reason := strings.TrimSpace(body.Reason)
	if len(body.TemporaryPassword) < minimumTemporaryPasswordLength || len(body.TemporaryPassword) > maximumTemporaryPasswordLength {
		writeError(w, http.StatusBadRequest, "Temporary password must be between 8 and 128 characters.")
		return
	}
	if reason == "" || len(reason) > maximumPasswordChangeReason {
		writeError(w, http.StatusBadRequest, "A reason of no more than 500 characters is required.")
		return
	}

	passwordHash, err := hashPassword(body.TemporaryPassword)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to set temporary password.")
		return
	}
	auditID := newID()
	if _, err := s.db.Procedure(
		r.Context(),
		`users."adminTemporaryPasswordSet"`,
		auditID,
		actor.ID,
		target.ID,
		passwordHash,
		reason,
	); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to set temporary password.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"auditId": auditID,
		"user":    publicUser(target),
	})
}
