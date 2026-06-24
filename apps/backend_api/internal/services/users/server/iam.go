package server

import (
	"net/http"
	"strings"

	gatewayroutes "rollfinders/internal/core/routes"
	"rollfinders/internal/services/users/handlers"
)

func (s *server) organisations(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		limit := pageSize(r.URL.Query().Get("pageSize"))
		offset := positiveInt(r.URL.Query().Get("offset"), 0)
		rows, err := s.db.Function(r.Context(), "users.organisations_list", limit, offset)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to list organisations.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"organisations": rows, "pagination": pagination(limit, offset, len(rows))})
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
	id := handlers.Param(r, string(gatewayroutes.ParamOrganisationId))
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
