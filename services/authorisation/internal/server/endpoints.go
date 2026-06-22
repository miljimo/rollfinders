package server

import (
	"net/http"

	"authorisation/internal/handlers"
)

type permissionRequest struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Level       int    `json:"level"`
}

func (s *server) createPermission(w http.ResponseWriter, r *http.Request) {
	var req permissionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	p, ok := permissionFromRequest(newID("perm"), req)
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
	level := req.Level
	if level == 0 {
		level = 100
	}
	code := cleanString(req.Code)
	if !validatePermissionCode(code) || cleanString(req.Name) == "" {
		return Permission{}, false
	}
	return Permission{ID: id, Code: code, Name: cleanString(req.Name), Description: cleanString(req.Description), Level: level}, true
}

type roleRequest struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Level       int    `json:"level"`
	Assignable  *bool  `json:"assignable"`
	SystemRole  bool   `json:"system_role"`
}

func (s *server) createRole(w http.ResponseWriter, r *http.Request) {
	var req roleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	role, ok := roleFromRequest(newID("role"), req)
	if !ok {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Role key and name are required.", nil)
		return
	}
	created, err := s.repo.createRole(r.Context(), role, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (s *server) listRoles(w http.ResponseWriter, r *http.Request) {
	out, err := s.repo.listRoles(r.Context())
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"roles": out})
}

func (s *server) getRole(w http.ResponseWriter, r *http.Request) {
	role, err := s.repo.getRole(r.Context(), handlers.Param(r, "role_id"))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, role)
}

func (s *server) updateRole(w http.ResponseWriter, r *http.Request) {
	var req roleRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	role, ok := roleFromRequest(handlers.Param(r, "role_id"), req)
	if !ok {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Role key and name are required.", nil)
		return
	}
	updated, err := s.repo.updateRole(r.Context(), role, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func roleFromRequest(id string, req roleRequest) (Role, bool) {
	key := cleanString(req.Key)
	name := cleanString(req.Name)
	if key == "" || name == "" {
		return Role{}, false
	}
	level := req.Level
	if level == 0 {
		level = 100
	}
	assignable := true
	if req.Assignable != nil {
		assignable = *req.Assignable
	}
	return Role{ID: id, Key: key, Name: name, Description: cleanString(req.Description), Level: level, Assignable: assignable, SystemRole: req.SystemRole}, true
}

type rolePermissionRequest struct {
	PermissionID string `json:"permission_id"`
}

func (s *server) addRolePermission(w http.ResponseWriter, r *http.Request) {
	var req rolePermissionRequest
	if err := decodeJSON(r, &req); err != nil || cleanString(req.PermissionID) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "permission_id is required.", nil)
		return
	}
	if err := s.repo.addRolePermission(r.Context(), handlers.Param(r, "role_id"), cleanString(req.PermissionID), actorFrom(r), requestIDFrom(r)); err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "assigned"})
}

func (s *server) listRolePermissions(w http.ResponseWriter, r *http.Request) {
	out, err := s.repo.rolePermissions(r.Context(), handlers.Param(r, "role_id"))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"permissions": out})
}

func (s *server) removeRolePermission(w http.ResponseWriter, r *http.Request) {
	if err := s.repo.removeRolePermission(r.Context(), handlers.Param(r, "role_id"), handlers.Param(r, "permission_id"), actorFrom(r), requestIDFrom(r)); err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
