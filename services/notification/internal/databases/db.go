package databases

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

const (
	defaultConnectionTimeout = time.Second
	postgresDriver           = "postgres"
	maxDBIdleConnections     = 3
	maxDBOpenConnections     = 3
)

func Open(ctx context.Context, connString string) (*sql.DB, error) {
	db, err := sql.Open(postgresDriver, connString)
	if err != nil {
		return nil, fmt.Errorf("unable to open postgres connection: %w", err)
	}

	db.SetConnMaxLifetime(0)
	db.SetMaxIdleConns(maxDBIdleConnections)
	db.SetMaxOpenConns(maxDBOpenConnections)

	pingCtx, cancel := context.WithTimeout(ctx, defaultConnectionTimeout)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("database connection failed: %w", err)
	}

	return db, nil
}
