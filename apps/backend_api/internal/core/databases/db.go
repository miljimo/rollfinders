package databases

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

const (
	DEFAULT_CONNECTION_TIMEOUT = 1 * time.Second
	DB_PROCEDURE_TIMEOUT       = 15 * time.Second
	POSTGRES_DRIVER            = "postgres"
	MAX_DB_IDLE_CONNECTIONS    = 3
	MAX_DB_OPEN_CONNECTION     = 3
)

type Credential interface {
	String() string
}

type dataContextImpl struct {
	db   *sql.DB
	name string
}

func (dc *dataContextImpl) Close() error {
	if dc.db != nil {
		return dc.db.Close()
	}
	return nil
}

func (dc *dataContextImpl) Name() string {
	return dc.name
}

func (dc *dataContextImpl) fetch(rows *sql.Rows) (DBResults, error) {
	results := DBResults{}

	columns, err := rows.Columns()
	if err != nil {
		return results, err
	}

	for rows.Next() {
		values := make([]interface{}, len(columns))
		pointers := make([]interface{}, len(columns))

		for i := range values {
			pointers[i] = &values[i]
		}

		if err := rows.Scan(pointers...); err != nil {
			return results, err
		}

		row := make(map[string]interface{})

		for i, col := range columns {
			val := values[i]

			if b, ok := val.([]byte); ok {
				val = string(b)
			}

			row[strings.ToLower(col)] = val
		}

		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return results, err
	}

	return results, nil
}

func (dc *dataContextImpl) createParameterPlaceholder(params ...interface{}) string {
	if len(params) == 0 {
		return "()"
	}

	placeholders := make([]string, len(params))
	for i := range params {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	return fmt.Sprintf("(%s)", strings.Join(placeholders, ","))
}

func (dc *dataContextImpl) Call(ctx context.Context, procName string, params ...interface{}) (DBResults, error) {
	return dc.Function(ctx, procName, params...)
}

func (dc *dataContextImpl) Function(ctx context.Context, functionName string, params ...interface{}) (DBResults, error) {
	if functionName == "" {
		return nil, errors.New("function name is required")
	}

	placeholders := dc.createParameterPlaceholder(params...)

	query := fmt.Sprintf("SELECT * FROM %s%s", functionName, placeholders)

	return dc.Query(ctx, query, params...)
}

func (dc *dataContextImpl) Procedure(ctx context.Context, procedureName string, params ...interface{}) (RowsAffected, error) {
	if procedureName == "" {
		return 0, errors.New("procedure name is required")
	}

	placeholders := dc.createParameterPlaceholder(params...)
	query := fmt.Sprintf("CALL %s%s", procedureName, placeholders)

	return dc.Execute(ctx, query, params...)
}

func (dc *dataContextImpl) Query(ctx context.Context, query string, params ...interface{}) (DBResults, error) {
	if dc == nil || dc.db == nil {
		return nil, errors.New("postgres client object must not be nil")
	}

	ctx, cancel := context.WithTimeout(ctx, DB_PROCEDURE_TIMEOUT)
	defer cancel()

	rows, err := dc.db.QueryContext(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return dc.fetch(rows)
}

func (dc *dataContextImpl) Execute(ctx context.Context, query string, params ...interface{}) (RowsAffected, error) {
	if dc == nil || dc.db == nil {
		return 0, errors.New("postgres client object must not be nil")
	}

	ctx, cancel := context.WithTimeout(ctx, DB_PROCEDURE_TIMEOUT)
	defer cancel()

	result, err := dc.db.ExecContext(ctx, query, params...)
	if err != nil {
		return 0, fmt.Errorf("db exec error: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}

	return RowsAffected(rows), nil
}
