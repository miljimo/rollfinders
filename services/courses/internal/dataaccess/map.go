package dataaccess

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"
)

func stringValue(row map[string]interface{}, key string) string {
	if value, ok := row[key]; ok && value != nil {
		return fmt.Sprint(value)
	}
	return ""
}

func boolValue(row map[string]interface{}, key string) bool {
	switch value := row[key].(type) {
	case bool:
		return value
	case string:
		parsed, _ := strconv.ParseBool(value)
		return parsed
	default:
		return false
	}
}

func intValue(row map[string]interface{}, key string) int {
	switch value := row[key].(type) {
	case int:
		return value
	case int64:
		return int(value)
	case float64:
		return int(value)
	case string:
		parsed, _ := strconv.Atoi(value)
		return parsed
	default:
		return 0
	}
}

func floatValue(row map[string]interface{}, key string) float64 {
	switch value := row[key].(type) {
	case float64:
		return value
	case float32:
		return float64(value)
	case int:
		return float64(value)
	case int64:
		return float64(value)
	case string:
		parsed, _ := strconv.ParseFloat(value, 64)
		return parsed
	default:
		return 0
	}
}

func timeValue(row map[string]interface{}, key string) time.Time {
	switch value := row[key].(type) {
	case time.Time:
		return value
	case string:
		for _, layout := range []string{time.RFC3339Nano, "2006-01-02 15:04:05.999999-07", "2006-01-02 15:04:05"} {
			if parsed, err := time.Parse(layout, value); err == nil {
				return parsed
			}
		}
	}
	return time.Time{}
}

func mapValue(row map[string]interface{}, key string) map[string]interface{} {
	value, ok := row[key]
	if !ok || value == nil {
		return map[string]interface{}{}
	}
	switch typed := value.(type) {
	case map[string]interface{}:
		return typed
	case []byte:
		var parsed map[string]interface{}
		if json.Unmarshal(typed, &parsed) == nil {
			return parsed
		}
	case string:
		var parsed map[string]interface{}
		if json.Unmarshal([]byte(typed), &parsed) == nil {
			return parsed
		}
	}
	return map[string]interface{}{}
}

func courseTypeFromRow(row map[string]interface{}) CourseType {
	return CourseType{
		ID:             stringValue(row, "id"),
		OrganisationID: stringValue(row, "organisation_id"),
		Name:           stringValue(row, "name"),
		Description:    stringValue(row, "description"),
		IsDefault:      boolValue(row, "is_default"),
		CreatedAt:      timeValue(row, "created_at"),
		UpdatedAt:      timeValue(row, "updated_at"),
	}
}

func courseFromRow(row map[string]interface{}) Course {
	return Course{
		ID:                  stringValue(row, "id"),
		OrganisationID:      stringValue(row, "organisation_id"),
		CourseTypeID:        stringValue(row, "course_type_id"),
		Title:               stringValue(row, "title"),
		Description:         stringValue(row, "description"),
		Level:               stringValue(row, "level"),
		Capacity:            intValue(row, "capacity"),
		PriceAmount:         floatValue(row, "price_amount"),
		Currency:            stringValue(row, "currency"),
		Status:              stringValue(row, "status"),
		CreatedByUserID:     stringValue(row, "created_by_user_id"),
		IntegrationMetadata: mapValue(row, "integration_metadata"),
		CreatedAt:           timeValue(row, "created_at"),
		UpdatedAt:           timeValue(row, "updated_at"),
	}
}

func activityFromRow(row map[string]interface{}) Activity {
	return Activity{
		ID:                 stringValue(row, "id"),
		CourseID:           stringValue(row, "course_id"),
		Title:              stringValue(row, "title"),
		ActivityType:       stringValue(row, "activity_type"),
		Description:        stringValue(row, "description"),
		StartOffsetMinutes: intValue(row, "start_offset_minutes"),
		DurationMinutes:    intValue(row, "duration_minutes"),
		SortOrder:          intValue(row, "sort_order"),
	}
}
