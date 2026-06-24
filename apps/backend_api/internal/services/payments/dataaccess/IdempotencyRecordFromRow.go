package dataaccess

func IdempotencyRecordFromRow(row map[string]interface{}) IdempotencyRecord {
	return IdempotencyRecord{
		Fingerprint: stringValue(row["request_fingerprint"]),
		StatusCode:  int(int64Value(row["status_code"])),
		Response:    stringValue(row["response_body"]),
	}
}
