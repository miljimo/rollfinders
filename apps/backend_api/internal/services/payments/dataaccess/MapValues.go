package dataaccess

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"
)

func stringValue(value interface{}) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case []byte:
		return string(typed)
	default:
		return fmt.Sprint(typed)
	}
}

func int64Value(value interface{}) int64 {
	switch typed := value.(type) {
	case nil:
		return 0
	case int64:
		return typed
	case int:
		return int64(typed)
	case int32:
		return int64(typed)
	case float64:
		return int64(typed)
	case string:
		parsed, _ := strconv.ParseInt(typed, 10, 64)
		return parsed
	default:
		parsed, _ := strconv.ParseInt(fmt.Sprint(typed), 10, 64)
		return parsed
	}
}

func boolValue(value interface{}) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		parsed, _ := strconv.ParseBool(typed)
		return parsed
	default:
		parsed, _ := strconv.ParseBool(fmt.Sprint(typed))
		return parsed
	}
}

func firstValue(row map[string]interface{}) interface{} {
	for _, value := range row {
		return value
	}
	return nil
}

func timeValue(value interface{}) time.Time {
	switch typed := value.(type) {
	case time.Time:
		return typed
	case string:
		for _, layout := range []string{time.RFC3339Nano, "2006-01-02 15:04:05.999999999-07", "2006-01-02 15:04:05.999999-07"} {
			if parsed, err := time.Parse(layout, typed); err == nil {
				return parsed
			}
		}
	}
	return time.Time{}
}

func mapFromJSON(raw string) map[string]string {
	if raw == "" {
		return nil
	}
	var values map[string]string
	if err := json.Unmarshal([]byte(raw), &values); err != nil || len(values) == 0 {
		return nil
	}
	return values
}
