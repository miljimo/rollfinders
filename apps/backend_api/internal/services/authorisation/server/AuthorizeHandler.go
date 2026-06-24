package server

import (
	"net/http"

	"rollfinders/internal/services/authorisation/handlers"
)

func (s *server) AuthorizeHandler(w http.ResponseWriter, r *http.Request) {
	var req authorizeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body is invalid.", nil)
		return
	}
	resp, err := s.repo.authorize(r.Context(), cleanString(req.SubjectID), cleanString(req.Permission), Scope{
		OrganisationID: cleanString(req.OrganisationID),
		ApplicationID:  cleanString(req.ApplicationID),
		ResourceID:     cleanString(req.ResourceID),
	})
	if err != nil {
		s.logUnexpectedRepoError(r, err)
		handlers.ErrorWithStatus(w, repoStatusError(err), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
