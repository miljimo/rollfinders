package dataaccess

import (
	"database/sql"
	"fmt"
	"rollfinders/internal/services/wallet/domain"
	"strings"
	"time"

	"rollfinders/internal/core/databases"
)

func First(rows databases.DBResults) (databases.DBRow, error) {
	if len(rows) == 0 {
		return nil, sql.ErrNoRows
	}
	return rows[0], nil
}

func WalletFromFirst(rows databases.DBResults) (domain.Wallet, error) {
	row, err := First(rows)
	if err != nil {
		return domain.Wallet{}, err
	}
	return WalletFromRow(row), nil
}

func WalletFromRow(row databases.DBRow) domain.Wallet {
	return domain.Wallet{
		ID:        String(row, "id"),
		Type:      domain.WalletType(String(row, "wallet_type")),
		OwnerID:   String(row, "owner_id"),
		Currency:  domain.Currency(String(row, "currency")),
		Status:    domain.WalletStatus(String(row, "status")),
		CreatedAt: Time(row, "created_at"),
		UpdatedAt: Time(row, "updated_at"),
	}
}

func WalletTotal(row databases.DBRow) int {
	return int(Int64(row, "total_count"))
}

func LinkedAccountFromRow(row databases.DBRow) domain.LinkedAccount {
	return domain.LinkedAccount{
		ID:                String(row, "id"),
		WalletID:          String(row, "wallet_id"),
		Provider:          domain.LinkedAccountProvider(String(row, "provider")),
		ProviderAccountID: String(row, "provider_account_id"),
		ConnectionType:    domain.LinkedAccountConnectionType(String(row, "connection_type")),
		Status:            domain.LinkedAccountStatus(String(row, "status")),
		DisplayName:       String(row, "display_name"),
		ExternalReference: String(row, "external_reference"),
		Currency:          domain.Currency(String(row, "currency")),
		ConnectedWallets:  int(Int64(row, "connected_wallet_count")),
		CreatedAt:         Time(row, "created_at"),
		UpdatedAt:         Time(row, "updated_at"),
	}
}

func BalanceFromFirst(rows databases.DBResults) (domain.Balance, error) {
	row, err := First(rows)
	if err != nil {
		return domain.Balance{}, err
	}
	return domain.Balance{
		WalletID:  String(row, "wallet_id"),
		Currency:  domain.Currency(String(row, "currency")),
		Available: Int64(row, "available_balance"),
		Reserved:  Int64(row, "reserved_balance"),
		Balance:   Int64(row, "balance"),
	}, nil
}

func TransactionFromFirst(rows databases.DBResults) (domain.Transaction, error) {
	row, err := First(rows)
	if err != nil {
		return domain.Transaction{}, err
	}
	return TransactionFromRow(row), nil
}

func TransactionFromRow(row databases.DBRow) domain.Transaction {
	return domain.Transaction{
		ID:                  String(row, "id"),
		Type:                domain.TransactionType(String(row, "type")),
		Status:              domain.TransactionStatus(String(row, "status")),
		Amount:              Int64(row, "amount"),
		Currency:            domain.Currency(String(row, "currency")),
		SourceWalletID:      String(row, "source_wallet_id"),
		DestinationWalletID: String(row, "destination_wallet_id"),
		ReferenceType:       String(row, "reference_type"),
		ReferenceID:         String(row, "reference_id"),
		IdempotencyKey:      String(row, "idempotency_key"),
		OriginalTransaction: String(row, "original_transaction_id"),
		CreatedAt:           Time(row, "created_at"),
	}
}

func StatementFromRow(row databases.DBRow) domain.Statement {
	return domain.Statement{
		ID:            String(row, "id"),
		TransactionID: String(row, "transaction_id"),
		WalletID:      String(row, "wallet_id"),
		Debit:         Int64(row, "debit_amount"),
		Credit:        Int64(row, "credit_amount"),
		Currency:      domain.Currency(String(row, "currency")),
		Description:   String(row, "description"),
		CreatedAt:     Time(row, "created_at"),
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

func NormalizeCurrency(currency string) string {
	if strings.EqualFold(strings.TrimSpace(currency), string(domain.CurrencyPoints)) {
		return string(domain.CurrencyPoints)
	}
	return strings.ToUpper(strings.TrimSpace(currency))
}
