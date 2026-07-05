package endpoints

import (
	"net/http"

	"rollfinders/internal/core/generators"
	"rollfinders/internal/services/academy/dataaccess"
)

type addAcademyMemberRequest struct {
	UserID string `json:"user_id"`
}

func (s *server) addAcademyMember(w http.ResponseWriter, r *http.Request) {
	academyID := cleanString(r.PathValue("academy_id"))
	var req addAcademyMemberRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid academy member JSON.", nil)
		return
	}
	req.UserID = cleanString(req.UserID)
	if academyID == "" || req.UserID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "academy_id and user_id are required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	member, err := dataaccess.AddAcademyMember(r.Context(), db, generators.CreateNewId("mem", 16), academyID, req.UserID)
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, member)
}
