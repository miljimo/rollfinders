package server

type userPermissionRequest struct {
	PermissionID   string `json:"permission_id"`
	Effect         string `json:"effect"`
	OrganisationID string `json:"organisation_id"`
	ApplicationID  string `json:"application_id"`
	ResourceID     string `json:"resource_id"`
	AssignedBy     string `json:"assigned_by"`
}
