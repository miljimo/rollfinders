package dataaccess

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"rollfinders/internal/services/booking/databases"
)

func firstRow(rows databases.DBResults) (databases.DBRow, error) {
	if len(rows) == 0 {
		return nil, ErrNotFound
	}
	return rows[0], nil
}

func stringValue(row databases.DBRow, key string) string {
	if value, ok := row[key]; ok && value != nil {
		return fmt.Sprint(value)
	}
	return ""
}

func intValue(row databases.DBRow, key string) int64 {
	value, ok := row[key]
	if !ok || value == nil {
		return 0
	}
	switch typed := value.(type) {
	case int64:
		return typed
	case int:
		return int64(typed)
	case int32:
		return int64(typed)
	case float64:
		return int64(typed)
	default:
		parsed, _ := strconv.ParseInt(fmt.Sprint(typed), 10, 64)
		return parsed
	}
}

func timeValue(row databases.DBRow, key string) time.Time {
	value, ok := row[key]
	if !ok || value == nil {
		return time.Time{}
	}
	if parsed, ok := value.(time.Time); ok {
		return parsed
	}
	parsed, _ := time.Parse(time.RFC3339Nano, fmt.Sprint(value))
	return parsed
}

func metadataValue(row databases.DBRow) map[string]any {
	raw := stringValue(row, "metadata")
	if raw == "" {
		return map[string]any{}
	}
	var metadata map[string]any
	if err := json.Unmarshal([]byte(raw), &metadata); err != nil {
		return map[string]any{}
	}
	return metadata
}

func bookingFromRow(row databases.DBRow) Booking {
	return Booking{
		ID:                 stringValue(row, "id"),
		Reference:          stringValue(row, "reference"),
		BookableType:       stringValue(row, "bookable_type"),
		BookableID:         stringValue(row, "bookable_id"),
		BookableInstanceID: stringValue(row, "bookable_instance_id"),
		CustomerID:         stringValue(row, "customer_id"),
		GuestReference:     stringValue(row, "guest_reference"),
		OrganisationID:     stringValue(row, "organisation_id"),
		PaymentID:          stringValue(row, "payment_id"),
		Status:             stringValue(row, "status"),
		ParticipantCount:   intValue(row, "participant_count"),
		Metadata:           metadataValue(row),
		CreatedAt:          timeValue(row, "created_at"),
		UpdatedAt:          timeValue(row, "updated_at"),
	}
}

func participantFromRow(row databases.DBRow) Participant {
	return Participant{
		ID:                stringValue(row, "id"),
		BookingID:         stringValue(row, "booking_id"),
		CustomerID:        stringValue(row, "customer_id"),
		GuestReference:    stringValue(row, "guest_reference"),
		DisplayName:       stringValue(row, "display_name"),
		ParticipantStatus: stringValue(row, "participant_status"),
		AttendanceStatus:  stringValue(row, "attendance_status"),
		Metadata:          metadataValue(row),
		CreatedAt:         timeValue(row, "created_at"),
		UpdatedAt:         timeValue(row, "updated_at"),
	}
}
