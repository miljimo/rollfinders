package endpoints

import (
	"net/http"

	"rollfinders/internal/core/generators"
	"rollfinders/internal/services/academy/dataaccess"
)

type addAcademyMembershipRequest struct {
	AcademyID string `json:"academy_id"`
	UserID    string `json:"user_id"`
}

func (s *server) addAcademyMembership(w http.ResponseWriter, r *http.Request) {
	var req addAcademyMembershipRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid academy membership JSON.", nil)
		return
	}
	req.AcademyID = cleanString(req.AcademyID)
	req.UserID = cleanString(req.UserID)
	if req.AcademyID == "" || req.UserID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "academy_id and user_id are required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	member, err := dataaccess.AddAcademyMember(r.Context(), db, generators.CreateNewId("mem", 16), req.AcademyID, req.UserID)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, member)
}
