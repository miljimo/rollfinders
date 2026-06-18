package server

import (
	"net/http"
	"strings"

	"users/internal/handlers"
)

func (s *server) roles(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Function(r.Context(), "users.roles_list")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to list roles.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"roles": rows})
	case http.MethodPost:
		var body struct {
			Key            string `json:"key"`
			Name           string `json:"name"`
			Description    string `json:"description"`
			OrganisationID string `json:"organisationId"`
		}
		if !decodeJSON(w, r, &body) {
			return
		}
		key := strings.TrimSpace(body.Key)
		name := strings.TrimSpace(body.Name)
		if key == "" || name == "" {
			writeError(w, http.StatusBadRequest, "Role key and name are required.")
			return
		}
		if _, err := s.db.Procedure(r.Context(), `users."roleInsert"`, key, name, body.Description, strings.TrimSpace(body.OrganisationID)); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to create role.")
			return
		}
		_ = s.writeAuditLog(r.Context(), actor.ID, nil, "ROLE_CREATED", map[string]any{"role": key})
		writeJSON(w, http.StatusCreated, map[string]any{"role": key})
	}
}

func (s *server) permissions(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Function(r.Context(), "users.privileges_list")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to list permissions.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"permissions": rows})
	case http.MethodPost:
		var body struct {
			Key         string `json:"key"`
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		if !decodeJSON(w, r, &body) {
			return
		}
		key := strings.TrimSpace(body.Key)
		name := strings.TrimSpace(body.Name)
		if key == "" || name == "" || !strings.Contains(key, ".") {
			writeError(w, http.StatusBadRequest, "Permission key must use resource.action format and include a name.")
			return
		}
		if _, err := s.db.Procedure(r.Context(), `users."permissionInsert"`, key, name, body.Description); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to create permission.")
			return
		}
		_ = s.writeAuditLog(r.Context(), actor.ID, nil, "PERMISSION_CREATED", map[string]any{"permission": key})
		writeJSON(w, http.StatusCreated, map[string]any{"permission": key})
	}
}

func (s *server) rolePermissions(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	roleID := handlers.Param(r, "id")
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Function(r.Context(), "users.role_privileges_list", roleID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to list role permissions.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"permissions": rows})
	case http.MethodPost:
		var body struct {
			PermissionKey  string `json:"permissionKey"`
			OrganisationID string `json:"organisationId"`
		}
		if !decodeJSON(w, r, &body) {
			return
		}
		permissionKey := strings.TrimSpace(body.PermissionKey)
		if permissionKey == "" {
			writeError(w, http.StatusBadRequest, "Permission key is required.")
			return
		}
		if _, err := s.db.Procedure(r.Context(), `users."rolePermissionAssign"`, roleID, permissionKey, strings.TrimSpace(body.OrganisationID)); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to assign role permission.")
			return
		}
		_ = s.writeAuditLog(r.Context(), actor.ID, nil, "ROLE_PERMISSION_ASSIGNED", map[string]any{"role": roleID, "permission": permissionKey})
		writeJSON(w, http.StatusCreated, map[string]any{"permission": permissionKey})
	}
}

func (s *server) userRoles(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	userID := handlers.Param(r, "id")
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Function(r.Context(), "users.user_roles_list", userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to list user roles.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"roles": rows})
	case http.MethodPost:
		var body struct {
			RoleKey        string `json:"roleKey"`
			OrganisationID string `json:"organisationId"`
		}
		if !decodeJSON(w, r, &body) {
			return
		}
		roleKey := strings.TrimSpace(body.RoleKey)
		if roleKey == "" || !s.roleExists(r.Context(), roleKey) {
			writeError(w, http.StatusBadRequest, "Valid role is required.")
			return
		}
		if _, err := s.db.Procedure(r.Context(), `users."userRoleAssign"`, userID, roleKey, strings.TrimSpace(body.OrganisationID), actor.ID); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to assign role.")
			return
		}
		_ = s.writeAuditLog(r.Context(), actor.ID, &userID, "USER_ROLE_ASSIGNED", map[string]any{"role": roleKey, "organisationId": body.OrganisationID})
		writeJSON(w, http.StatusCreated, map[string]any{"role": roleKey})
	}
}

func (s *server) removeUserRole(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	userID := handlers.Param(r, "id")
	roleID := handlers.Param(r, "roleId")
	if _, err := s.db.Procedure(r.Context(), `users."userRoleRemove"`, userID, roleID); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to remove role.")
		return
	}
	_ = s.writeAuditLog(r.Context(), actor.ID, &userID, "USER_ROLE_REMOVED", map[string]any{"role": roleID})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *server) organisations(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Function(r.Context(), "users.organisations_list")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to list organisations.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"organisations": rows})
	case http.MethodPost:
		var body struct {
			ID     string `json:"id"`
			Name   string `json:"name"`
			Status string `json:"status"`
		}
		if !decodeJSON(w, r, &body) {
			return
		}
		id := strings.TrimSpace(body.ID)
		if id == "" {
			id = newID()
		}
		name := strings.TrimSpace(body.Name)
		status := organisationStatus(body.Status)
		if name == "" {
			writeError(w, http.StatusBadRequest, "Organisation name is required.")
			return
		}
		if _, err := s.db.Procedure(r.Context(), `users."organisationUpsert"`, id, name, status); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to create organisation.")
			return
		}
		_ = s.writeAuditLog(r.Context(), actor.ID, nil, "ORGANISATION_CREATED", map[string]any{"organisationId": id, "name": name})
		writeJSON(w, http.StatusCreated, map[string]any{"organisation": map[string]any{"id": id, "name": name, "status": status}})
	}
}

func (s *server) organisation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	id := handlers.Param(r, "id")
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.Function(r.Context(), "users.organisation_get", id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to read organisation.")
			return
		}
		if len(rows) == 0 {
			writeError(w, http.StatusNotFound, "Organisation not found.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"organisation": rows[0]})
	case http.MethodPut:
		var body struct {
			Name   string `json:"name"`
			Status string `json:"status"`
		}
		if !decodeJSON(w, r, &body) {
			return
		}
		name := strings.TrimSpace(body.Name)
		if name == "" {
			writeError(w, http.StatusBadRequest, "Organisation name is required.")
			return
		}
		status := organisationStatus(body.Status)
		if _, err := s.db.Procedure(r.Context(), `users."organisationUpsert"`, id, name, status); err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to update organisation.")
			return
		}
		_ = s.writeAuditLog(r.Context(), actor.ID, nil, "ORGANISATION_UPDATED", map[string]any{"organisationId": id, "name": name, "status": status})
		writeJSON(w, http.StatusOK, map[string]any{"organisation": map[string]any{"id": id, "name": name, "status": status}})
	}
}

func organisationStatus(value string) string {
	if strings.EqualFold(strings.TrimSpace(value), "DISABLED") {
		return "DISABLED"
	}
	return "ACTIVE"
}
