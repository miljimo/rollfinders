package server

import "net/http"

type resourceRequest struct {
	ID           string `json:"id"`
	ResourceType string `json:"resource_type"`
	DisplayName  string `json:"display_name"`
}

func (s *server) listResources(w http.ResponseWriter, r *http.Request) {
	out, err := s.repo.listResources(r.Context())
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"resources": out})
}

func (s *server) createResource(w http.ResponseWriter, r *http.Request) {
	var req resourceRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	resourceType := cleanString(req.ResourceType)
	id := cleanString(req.ID)
	if id == "" {
		id = resourceType
	}
	if id == "" || resourceType == "" {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Resource id and resource_type are required.", nil)
		return
	}
	created, err := s.repo.createResource(r.Context(), Resource{ID: id, ResourceType: resourceType, DisplayName: cleanString(req.DisplayName)}, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.writeRepoError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}
