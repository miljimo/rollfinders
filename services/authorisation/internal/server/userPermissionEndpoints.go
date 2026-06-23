package server

import (
	"net/http"

	"authorisation/internal/handlers"
)

type userPermissionRequest struct {
	PermissionID   string `json:"permission_id"`
	Effect         string `json:"effect"`
	OrganisationID string `json:"organisation_id"`
	ApplicationID  string `json:"application_id"`
	ResourceType   string `json:"resource_type"`
	ResourceID     string `json:"resource_id"`
	AssignedBy     string `json:"assigned_by"`
}

func (s *server) assignUserPermission(w http.ResponseWriter, r *http.Request) {
	var req userPermissionRequest
	if err := decodeJSON(r, &req); err != nil || cleanString(req.PermissionID) == "" || cleanString(req.AssignedBy) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "permission_id and assigned_by are required.", nil)
		return
	}
	if cleanString(req.ResourceID) != "" && cleanString(req.ResourceType) == "" {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "resource_type is required when resource_id is provided.", nil)
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
		ID:           newID("user_perm"),
		UserID:       handlers.Param(r, "user_id"),
		PermissionID: cleanString(req.PermissionID),
		Effect:       effect,
		AssignedBy:   cleanString(req.AssignedBy),
		Scope: Scope{
			OrganisationID: cleanString(req.OrganisationID),
			ApplicationID:  cleanString(req.ApplicationID),
			ResourceType:   cleanString(req.ResourceType),
			ResourceID:     cleanString(req.ResourceID),
		},
	}
	created, err := s.repo.assignUserPermission(r.Context(), a, assignmentActor(r, a.AssignedBy), requestIDFrom(r))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (s *server) listUserPermissions(w http.ResponseWriter, r *http.Request) {
	out, err := s.repo.listUserPermissions(r.Context(), handlers.Param(r, "user_id"))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"permission_assignments": out})
}

func (s *server) deleteUserPermission(w http.ResponseWriter, r *http.Request) {
	if err := s.repo.deleteUserPermission(r.Context(), handlers.Param(r, "user_id"), handlers.Param(r, "assignment_id"), actorFrom(r), requestIDFrom(r)); err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
