package endpoints

import "rollfinders/internal/services/academy/databases"

func isDatabaseReady(results databases.DBResults) bool {
	if len(results) == 0 {
		return false
	}
	value, ok := results[0]["ready"].(bool)
	return ok && value
}
