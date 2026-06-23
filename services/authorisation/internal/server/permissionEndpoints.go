package server

import (
	"net/http"
	"strings"

	"authorisation/internal/handlers"
)

type permissionRequest struct {
	Code           string `json:"code"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	OrganisationID string `json:"organisation_id"`
	ApplicationID  string `json:"application_id"`
	ResourceID     string `json:"resource_id"`
}

func (s *server) createPermission(w http.ResponseWriter, r *http.Request) {
	var req permissionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	p, ok := permissionFromRequest(newID("permission"), req)
	if !ok {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Permission code must use resource.action naming.", nil)
		return
	}
	created, err := s.repo.createPermission(r.Context(), p, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (s *server) listPermissions(w http.ResponseWriter, r *http.Request) {
	out, err := s.repo.listPermissions(r.Context())
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"permissions": out})
}

func (s *server) getPermission(w http.ResponseWriter, r *http.Request) {
	p, err := s.repo.getPermission(r.Context(), handlers.Param(r, "permission_id"))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *server) updatePermission(w http.ResponseWriter, r *http.Request) {
	var req permissionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	p, ok := permissionFromRequest(handlers.Param(r, "permission_id"), req)
	if !ok {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Permission code must use resource.action naming.", nil)
		return
	}
	updated, err := s.repo.updatePermission(r.Context(), p, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
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
	parts := strings.Split(code, ".")
	if len(parts) < 2 {
		return ""
	}
	return strings.Join(parts[:len(parts)-1], ".")
}
