package dataaccess

import "time"

type Booking struct {
	ID                 string         `json:"id"`
	Reference          string         `json:"reference"`
	BookableType       string         `json:"bookable_type"`
	BookableID         string         `json:"bookable_id"`
	BookableInstanceID string         `json:"bookable_instance_id"`
	CustomerID         string         `json:"customer_id,omitempty"`
	GuestReference     string         `json:"guest_reference,omitempty"`
	OrganisationID     string         `json:"organisation_id"`
	PaymentID          string         `json:"payment_id,omitempty"`
	Status             string         `json:"status"`
	ParticipantCount   int64          `json:"participant_count"`
	Metadata           map[string]any `json:"metadata"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

type Participant struct {
	ID                string         `json:"id"`
	BookingID         string         `json:"booking_id"`
	CustomerID        string         `json:"customer_id,omitempty"`
	GuestReference    string         `json:"guest_reference,omitempty"`
	DisplayName       string         `json:"display_name,omitempty"`
	ParticipantStatus string         `json:"participant_status"`
	AttendanceStatus  string         `json:"attendance_status"`
	Metadata          map[string]any `json:"metadata"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

type BookingList struct {
	Items []Booking `json:"items"`
	Count int       `json:"count"`
}

type CreateBookingInput struct {
	ID                 string
	Reference          string
	BookableType       string
	BookableID         string
	BookableInstanceID string
	CustomerID         string
	GuestReference     string
	OrganisationID     string
	ParticipantCount   int64
	Metadata           string
	PaymentRequired    bool
}

type ListBookingsFilter struct {
	CustomerID         string
	OrganisationID     string
	BookableType       string
	BookableID         string
	BookableInstanceID string
	PaymentID          string
	Status             string
	Limit              int
}

type CreateParticipantInput struct {
	ID             string
	BookingID      string
	CustomerID     string
	GuestReference string
	DisplayName    string
	Metadata       string
}
