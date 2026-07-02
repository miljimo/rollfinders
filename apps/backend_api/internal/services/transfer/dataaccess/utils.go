package dataaccess

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"rollfinders/internal/core/databases"
	"rollfinders/internal/services/transfer/domain"
)

func postgresID(prefix string) string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return prefix + "_" + time.Now().UTC().Format("20060102150405.000000000")
	}
	return prefix + "_" + hex.EncodeToString(bytes[:])
}

func First(rows databases.DBResults) (databases.DBRow, error) {
	if len(rows) == 0 {
		return nil, sql.ErrNoRows
	}
	return rows[0], nil
}

func TransferFromFirst(rows databases.DBResults) (*domain.Transfer, error) {
	row, err := First(rows)
	if err != nil {
		return nil, err
	}
	transfer := TransferFromRow(row)
	return &transfer, nil
}

func TransferFromRow(row databases.DBRow) domain.Transfer {
	return domain.Transfer{
		ID:                  String(row, "id"),
		Status:              String(row, "status"),
		SourceWalletID:      String(row, "source_wallet_id"),
		DestinationWalletID: String(row, "destination_wallet_id"),
		Amount:              Int64(row, "amount"),
		Currency:            String(row, "currency"),
		ReferenceType:       String(row, "reference_type"),
		ReferenceID:         String(row, "reference_id"),
		Description:         String(row, "description"),
		IdempotencyKey:      String(row, "idempotency_key"),
		FailureReason:       String(row, "failure_reason"),
		CreatedAt:           Time(row, "created_at"),
		UpdatedAt:           Time(row, "updated_at"),
	}
}

func String(row databases.DBRow, key string) string {
	value := row[key]
	if value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return text
	}
	return fmt.Sprint(value)
}

func Int64(row databases.DBRow, key string) int64 {
	switch value := row[key].(type) {
	case int64:
		return value
	case int:
		return int64(value)
	case int32:
		return int64(value)
	case float64:
		return int64(value)
	default:
		return 0
	}
}

func Time(row databases.DBRow, key string) time.Time {
	if value, ok := row[key].(time.Time); ok {
		return value
	}
	return time.Time{}
}

func clampLimit(limit int) int {
	if limit <= 0 {
		return 100
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func maxInt(value int, minimum int) int {
	if value < minimum {
		return minimum
	}
	return value
}
