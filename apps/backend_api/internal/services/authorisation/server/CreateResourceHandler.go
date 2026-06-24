package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) CreateResourceHandler(w http.ResponseWriter, r *http.Request) {
	var req resourceRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	name := cleanString(req.Name)
	if name == "" {
		name = cleanString(req.LegacyDisplayName)
	}
	id := cleanString(req.ID)
	if id == "" {
		id = name
	}
	if id == "" || name == "" {
		writeError(w, r, http.StatusUnprocessableEntity, "validation_error", "Resource id and name are required.", nil)
		return
	}
	created, err := s.repo.createResource(r.Context(), Resource{ID: id, Name: name, Description: cleanString(req.Description), Target: cleanString(req.Target)}, actorFrom(r), requestIDFrom(r))
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}
