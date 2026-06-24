package endpoints

import (
	"net/http"

	"rollfinders/internal/services/academy/dataaccess"
)

func (s *server) updateAcademyProfile(w http.ResponseWriter, r *http.Request) {
	academyID := cleanString(r.PathValue("academy_id"))
	if academyID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "academy_id is required.", nil)
		return
	}
	var req academyProfileRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid academy profile JSON.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	academy, err := dataaccess.UpdateAcademyProfile(r.Context(), db, dataaccess.UpdateAcademyProfileInput{
		ID:                 academyID,
		Name:               cleanString(req.Name),
		Description:        cleanString(req.Description),
		ContactEmail:       cleanString(req.ContactEmail),
		ContactPhone:       cleanString(req.ContactPhone),
		WebsiteURL:         cleanString(req.WebsiteURL),
		ImageURL:           cleanString(req.ImageURL),
		AddressLine1:       cleanString(req.AddressLine1),
		AddressLine2:       cleanString(req.AddressLine2),
		City:               cleanString(req.City),
		Region:             cleanString(req.Region),
		Postcode:           cleanString(req.Postcode),
		Country:            cleanString(req.Country),
		Latitude:           req.Latitude,
		Longitude:          req.Longitude,
		VerificationStatus: cleanString(req.VerificationStatus),
		IsFeatured:         req.IsFeatured,
		SettingsJSON:       jsonPayload(req.Settings),
	})
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, academy)
}
