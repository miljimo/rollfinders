package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) AssignUserRoleHandler(w http.ResponseWriter, r *http.Request) {
	var req userRoleRequest
	if err := decodeJSON(r, &req); err != nil || cleanString(req.RoleID) == "" || cleanString(req.AssignedBy) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "role_id and assigned_by are required.", nil)
		return
	}
	a := UserRoleAssignment{
		ID:         newID("user_role"),
		UserID:     handlers.Param(r, "user_id"),
		RoleID:     cleanString(req.RoleID),
		AssignedBy: cleanString(req.AssignedBy),
		Scope: Scope{
			OrganisationID: cleanString(req.OrganisationID),
			ApplicationID:  cleanString(req.ApplicationID),
			ResourceID:     cleanString(req.ResourceID),
		},
	}
	created, err := s.repo.assignUserRole(r.Context(), a, assignmentActor(r, a.AssignedBy), requestIDFrom(r))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}
