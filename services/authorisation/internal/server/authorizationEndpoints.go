package server

import (
	"net/http"

	"authorisation/internal/handlers"
)

func (s *server) authorize(w http.ResponseWriter, r *http.Request) {
	var req authorizeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	if cleanString(req.ResourceID) != "" && cleanString(req.ResourceType) == "" {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "resourceType is required when resourceId is provided.", nil)
		return
	}
	resp, err := s.repo.authorize(r.Context(), cleanString(req.SubjectID), cleanString(req.Permission), Scope{
		OrganisationID: cleanString(req.OrganisationID),
		ApplicationID:  cleanString(req.ApplicationID),
		ResourceType:   cleanString(req.ResourceType),
		ResourceID:     cleanString(req.ResourceID),
	})
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *server) effectivePermissions(w http.ResponseWriter, r *http.Request) {
	set, err := s.repo.effectivePermissions(r.Context(), handlers.Param(r, "user_id"), scopeFromQuery(r))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"permissions": permissionsFromSet(set)})
}
