package endpoints

import (
	"encoding/json"
	"net/http"

	"academy/internal/dataaccess"
)

type academyProfileRequest struct {
	OrganisationID     string         `json:"organisation_id"`
	ApplicationID      string         `json:"application_id"`
	Name               string         `json:"name"`
	Slug               string         `json:"slug"`
	Description        string         `json:"description"`
	ContactEmail       string         `json:"contact_email"`
	ContactPhone       string         `json:"contact_phone"`
	WebsiteURL         string         `json:"website_url"`
	ImageURL           string         `json:"image_url"`
	AddressLine1       string         `json:"address_line1"`
	AddressLine2       string         `json:"address_line2"`
	City               string         `json:"city"`
	Region             string         `json:"region"`
	Postcode           string         `json:"postcode"`
	Country            string         `json:"country"`
	Latitude           *float64       `json:"latitude"`
	Longitude          *float64       `json:"longitude"`
	VerificationStatus string         `json:"verification_status"`
	IsFeatured         bool           `json:"is_featured"`
	Settings           map[string]any `json:"settings"`
}

func (s *server) createAcademy(w http.ResponseWriter, r *http.Request) {
	var req academyProfileRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "Request body must be valid academy JSON.", nil)
		return
	}
	req.Name = cleanString(req.Name)
	req.Slug = cleanString(req.Slug)
	if req.Name == "" || req.Slug == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "name and slug are required.", nil)
		return
	}
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()

	academy, err := dataaccess.CreateAcademy(r.Context(), db, dataaccess.CreateAcademyInput{
		ID:                 newID("academy"),
		OrganisationID:     cleanString(req.OrganisationID),
		ApplicationID:      cleanString(req.ApplicationID),
		Name:               req.Name,
		Slug:               req.Slug,
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
	writeJSON(w, http.StatusCreated, academy)
}

func jsonPayload(value map[string]any) string {
	if value == nil {
		return "{}"
	}
	data, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(data)
}
