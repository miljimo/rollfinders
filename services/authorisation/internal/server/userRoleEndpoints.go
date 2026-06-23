package server

import (
	"net/http"

	"authorisation/internal/handlers"
)

type userRoleRequest struct {
	RoleID         string `json:"role_id"`
	OrganisationID string `json:"organisation_id"`
	ApplicationID  string `json:"application_id"`
	ResourceType   string `json:"resource_type"`
	ResourceID     string `json:"resource_id"`
	AssignedBy     string `json:"assigned_by"`
}

func (s *server) assignUserRole(w http.ResponseWriter, r *http.Request) {
	var req userRoleRequest
	if err := decodeJSON(r, &req); err != nil || cleanString(req.RoleID) == "" || cleanString(req.AssignedBy) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "role_id and assigned_by are required.", nil)
		return
	}
	if cleanString(req.ResourceID) != "" && cleanString(req.ResourceType) == "" {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "resource_type is required when resource_id is provided.", nil)
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
			ResourceType:   cleanString(req.ResourceType),
			ResourceID:     cleanString(req.ResourceID),
		},
	}
	created, err := s.repo.assignUserRole(r.Context(), a, assignmentActor(r, a.AssignedBy), requestIDFrom(r))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (s *server) listUserRoles(w http.ResponseWriter, r *http.Request) {
	out, err := s.repo.listUserRoles(r.Context(), handlers.Param(r, "user_id"))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"role_assignments": out})
}

func (s *server) deleteUserRole(w http.ResponseWriter, r *http.Request) {
	if err := s.repo.deleteUserRole(r.Context(), handlers.Param(r, "user_id"), handlers.Param(r, "assignment_id"), actorFrom(r), requestIDFrom(r)); err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func assignmentActor(r *http.Request, assignedBy string) string {
	if actor := actorFrom(r); actor != "" {
		return actor
	}
	return assignedBy
}
