package databases

import (
	"context"
	"database/sql"
	"fmt"
)

type dataConnectionImpl struct{}

func (connector *dataConnectionImpl) initial(ctx context.Context, db *sql.DB) error {
	db.SetConnMaxLifetime(0)
	db.SetMaxIdleConns(MAX_DB_IDLE_CONNECTIONS)
	db.SetMaxOpenConns(MAX_DB_OPEN_CONNECTION)
	pingCtx, cancel := context.WithTimeout(ctx, DEFAULT_CONNECTION_TIMEOUT)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		return fmt.Errorf("database connection failed: %w", err)
	}
	return nil
}

func (connector *dataConnectionImpl) createDataContext(ctx context.Context, dbName string, connString string, createFunc func(ctx context.Context, db *sql.DB) (DataContext, error)) (DataContext, error) {
	sqlDB, err := sql.Open(POSTGRES_DRIVER, connString)
	if err != nil {
		return nil, fmt.Errorf("unable to open postgres connection: %w", err)
	}
	if err := connector.initial(ctx, sqlDB); err != nil {
		_ = sqlDB.Close()
		return nil, err
	}
	if createFunc != nil {
		dataCtx, err := createFunc(ctx, sqlDB)
		if err != nil {
			_ = sqlDB.Close()
			return nil, err
		}
		return dataCtx, nil
	}
	return &dataContextImpl{db: sqlDB, name: dbName}, nil
}
