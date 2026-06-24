package dataaccess

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"rollfinders/internal/services/academy/databases"
)

func stringValue(row databases.DBRow, key string) string {
	if value, ok := row[key]; ok && value != nil {
		return fmt.Sprint(value)
	}
	return ""
}

func boolValue(row databases.DBRow, key string) bool {
	if value, ok := row[key]; ok && value != nil {
		switch typed := value.(type) {
		case bool:
			return typed
		case string:
			return typed == "true"
		}
	}
	return false
}

func timeValue(row databases.DBRow, key string) time.Time {
	if value, ok := row[key]; ok && value != nil {
		switch typed := value.(type) {
		case time.Time:
			return typed
		case string:
			parsed, _ := time.Parse(time.RFC3339Nano, typed)
			return parsed
		}
	}
	return time.Time{}
}

func floatPointerValue(row databases.DBRow, key string) *float64 {
	if value, ok := row[key]; ok && value != nil {
		switch typed := value.(type) {
		case float64:
			return &typed
		case string:
			parsed, err := strconv.ParseFloat(typed, 64)
			if err == nil {
				return &parsed
			}
		case []byte:
			parsed, err := strconv.ParseFloat(string(typed), 64)
			if err == nil {
				return &parsed
			}
		}
	}
	return nil
}

func settingsValue(row databases.DBRow) map[string]any {
	result := map[string]any{}
	raw, ok := row["settings"]
	if !ok || raw == nil {
		return result
	}
	switch typed := raw.(type) {
	case map[string]any:
		return typed
	case string:
		_ = json.Unmarshal([]byte(typed), &result)
	case []byte:
		_ = json.Unmarshal(typed, &result)
	}
	return result
}

func academyFromRow(row databases.DBRow) Academy {
	return Academy{
		ID:                 stringValue(row, "id"),
		OrganisationID:     stringValue(row, "organisation_id"),
		ApplicationID:      stringValue(row, "application_id"),
		Name:               stringValue(row, "name"),
		Slug:               stringValue(row, "slug"),
		Description:        stringValue(row, "description"),
		ContactEmail:       stringValue(row, "contact_email"),
		ContactPhone:       stringValue(row, "contact_phone"),
		WebsiteURL:         stringValue(row, "website_url"),
		ImageURL:           stringValue(row, "image_url"),
		AddressLine1:       stringValue(row, "address_line1"),
		AddressLine2:       stringValue(row, "address_line2"),
		City:               stringValue(row, "city"),
		Region:             stringValue(row, "region"),
		Postcode:           stringValue(row, "postcode"),
		Country:            stringValue(row, "country"),
		Latitude:           floatPointerValue(row, "latitude"),
		Longitude:          floatPointerValue(row, "longitude"),
		ListingStatus:      stringValue(row, "listing_status"),
		VerificationStatus: stringValue(row, "verification_status"),
		IsFeatured:         boolValue(row, "is_featured"),
		Settings:           settingsValue(row),
		CreatedAt:          timeValue(row, "created_at"),
		UpdatedAt:          timeValue(row, "updated_at"),
	}
}

func academyMemberFromRow(row databases.DBRow) AcademyMember {
	return AcademyMember{
		ID:        stringValue(row, "id"),
		AcademyID: stringValue(row, "academy_id"),
		UserID:    stringValue(row, "user_id"),
		CreatedAt: timeValue(row, "created_at"),
		UpdatedAt: timeValue(row, "updated_at"),
	}
}
