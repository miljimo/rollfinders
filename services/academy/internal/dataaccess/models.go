package dataaccess

import "time"

type Academy struct {
	ID                 string         `json:"id"`
	OrganisationID     string         `json:"organisation_id,omitempty"`
	ApplicationID      string         `json:"application_id,omitempty"`
	Name               string         `json:"name"`
	Slug               string         `json:"slug"`
	Description        string         `json:"description,omitempty"`
	ContactEmail       string         `json:"contact_email,omitempty"`
	ContactPhone       string         `json:"contact_phone,omitempty"`
	WebsiteURL         string         `json:"website_url,omitempty"`
	ImageURL           string         `json:"image_url,omitempty"`
	AddressLine1       string         `json:"address_line1,omitempty"`
	AddressLine2       string         `json:"address_line2,omitempty"`
	City               string         `json:"city,omitempty"`
	Region             string         `json:"region,omitempty"`
	Postcode           string         `json:"postcode,omitempty"`
	Country            string         `json:"country"`
	Latitude           *float64       `json:"latitude,omitempty"`
	Longitude          *float64       `json:"longitude,omitempty"`
	ListingStatus      string         `json:"listing_status"`
	VerificationStatus string         `json:"verification_status"`
	IsFeatured         bool           `json:"is_featured"`
	Settings           map[string]any `json:"settings"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

type AcademyMember struct {
	ID        string    `json:"id"`
	AcademyID string    `json:"academy_id"`
	UserID    string    `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateAcademyInput struct {
	ID                 string
	OrganisationID     string
	ApplicationID      string
	Name               string
	Slug               string
	Description        string
	ContactEmail       string
	ContactPhone       string
	WebsiteURL         string
	ImageURL           string
	AddressLine1       string
	AddressLine2       string
	City               string
	Region             string
	Postcode           string
	Country            string
	Latitude           *float64
	Longitude          *float64
	VerificationStatus string
	IsFeatured         bool
	SettingsJSON       string
}

type UpdateAcademyProfileInput struct {
	ID                 string
	Name               string
	Description        string
	ContactEmail       string
	ContactPhone       string
	WebsiteURL         string
	ImageURL           string
	AddressLine1       string
	AddressLine2       string
	City               string
	Region             string
	Postcode           string
	Country            string
	Latitude           *float64
	Longitude          *float64
	VerificationStatus string
	IsFeatured         bool
	SettingsJSON       string
}
