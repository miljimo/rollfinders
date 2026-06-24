package server

import gatewayroutes "rollfinders/internal/core/routes"

type permissionRequest struct {
	Code           string `json:"code"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	OrganisationID string `json:"organisation_id"`
	ApplicationID  string `json:"application_id"`
	ResourceID     string `json:"resource_id"`
}

func permissionFromRequest(id string, req permissionRequest) (Permission, bool) {
	code := cleanString(req.Code)
	if !validatePermissionCode(code) || cleanString(req.Name) == "" {
		return Permission{}, false
	}
	resourceID := cleanString(req.ResourceID)
	if resourceID == "" {
		resourceID = resourceIDFromPermissionCode(code)
	}
	return Permission{
		ID:             id,
		Code:           code,
		Name:           cleanString(req.Name),
		Description:    cleanString(req.Description),
		OrganisationID: cleanString(req.OrganisationID),
		ApplicationID:  cleanString(req.ApplicationID),
		ResourceID:     resourceID,
	}, true
}

func resourceIDFromPermissionCode(code string) string {
	return gatewayroutes.StableResourceID(code)
}
