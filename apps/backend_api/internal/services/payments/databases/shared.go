package databases

import (
	"context"

	platform "rollfinders/internal/core/databases"
)

const (
	DEFAULT_CONNECTION_TIMEOUT = platform.DEFAULT_CONNECTION_TIMEOUT
	DB_PROCEDURE_TIMEOUT       = platform.DB_PROCEDURE_TIMEOUT
	POSTGRES_DRIVER            = platform.POSTGRES_DRIVER
	MAX_DB_IDLE_CONNECTIONS    = platform.MAX_DB_IDLE_CONNECTIONS
	MAX_DB_OPEN_CONNECTION     = platform.MAX_DB_OPEN_CONNECTION
)

type RowsAffected = platform.RowsAffected
type DBRow = platform.DBRow
type DBResults = platform.DBResults
type DataContext = platform.DataContext
type Credential = platform.Credential

func WithCredential(ctx context.Context, connStr string) (DataContext, error) {
	return platform.WithCredential(ctx, connStr)
}

func New(ctx context.Context, dbName string, connStr string) (DataContext, error) {
	return platform.New(ctx, dbName, connStr)
}

func Open(ctx context.Context, dbName string, connStr string) (DataContext, error) {
	return platform.Open(ctx, dbName, connStr)
}
