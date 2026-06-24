package server

import "net/http"

type userRoleRequest struct {
	RoleID         string `json:"role_id"`
	OrganisationID string `json:"organisation_id"`
	ApplicationID  string `json:"application_id"`
	ResourceID     string `json:"resource_id"`
	AssignedBy     string `json:"assigned_by"`
}

func assignmentActor(r *http.Request, assignedBy string) string {
	if actor := actorFrom(r); actor != "" {
		return actor
	}
	return assignedBy
}
