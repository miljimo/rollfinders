package server

import (
	"net/http"

	"rollfinders/internal/core/generators"
	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) AssignUserPermissionHandler(w http.ResponseWriter, r *http.Request) {
	var req userPermissionRequest
	if err := decodeJSON(r, &req); err != nil || cleanString(req.PermissionID) == "" || cleanString(req.AssignedBy) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "permission_id and assigned_by are required.", nil)
		return
	}
	effect := cleanString(req.Effect)
	if effect == "" {
		effect = "ALLOW"
	}
	if effect != "ALLOW" && effect != "DENY" {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "effect must be ALLOW or DENY.", nil)
		return
	}
	a := UserPermissionAssignment{
		ID:           generators.CreateNewId("perm", 16),
		UserID:       handlers.Param(r, "user_id"),
		PermissionID: cleanString(req.PermissionID),
		Effect:       effect,
		AssignedBy:   cleanString(req.AssignedBy),
		Scope: Scope{
			OrganisationID: cleanString(req.OrganisationID),
			ApplicationID:  cleanString(req.ApplicationID),
			ResourceID:     cleanString(req.ResourceID),
		},
	}
	created, err := s.repo.assignUserPermission(r.Context(), a, assignmentActor(r, a.AssignedBy), requestIDFrom(r))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}
