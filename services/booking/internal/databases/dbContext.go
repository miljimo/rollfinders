package databases

import "context"

type DBRow map[string]interface{}
type DBResults []DBRow
type RowsAffected int64

type DataContext interface {
	Close() error
	Name() string
	Call(ctx context.Context, procName string, params ...interface{}) (DBResults, error)
	Function(ctx context.Context, functionName string, params ...interface{}) (DBResults, error)
	Procedure(ctx context.Context, procedureName string, params ...interface{}) (RowsAffected, error)
	Query(ctx context.Context, query string, params ...interface{}) (DBResults, error)
	Execute(ctx context.Context, query string, params ...interface{}) (RowsAffected, error)
}
