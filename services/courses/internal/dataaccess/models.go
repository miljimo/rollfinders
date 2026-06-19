package dataaccess

import "time"

type CourseType struct {
	ID             string    `json:"id"`
	OrganisationID string    `json:"organisation_id"`
	Name           string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	IsDefault      bool      `json:"is_default"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Course struct {
	ID              string    `json:"id"`
	OrganisationID  string    `json:"organisation_id"`
	CourseTypeID    string    `json:"course_type_id"`
	Title           string    `json:"title"`
	Description     string    `json:"description,omitempty"`
	Level           string    `json:"level,omitempty"`
	Capacity        int       `json:"capacity,omitempty"`
	Status          string    `json:"status"`
	CreatedByUserID string    `json:"created_by_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Activity struct {
	ID                 string `json:"id"`
	CourseID           string `json:"course_id"`
	Title              string `json:"title"`
	Description        string `json:"description,omitempty"`
	StartOffsetMinutes int    `json:"start_offset_minutes"`
	DurationMinutes    int    `json:"duration_minutes"`
	SortOrder          int    `json:"sort_order"`
}
