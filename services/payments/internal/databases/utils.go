package databases

import (
	"context"
	"net/url"
	"strings"
)

func WithCredential(ctx context.Context, connStr string) (DataContext, error) {
	conn := dataConnectionImpl{}

	dbName := parsePostgresDBName(connStr)

	return conn.createDataContext(ctx, dbName, connStr, nil)
}

func parsePostgresDBName(connStr string) string {
	u, err := url.Parse(connStr)
	if err == nil && u.Path != "" {
		return strings.TrimPrefix(u.Path, "/")
	}

	// Fallback for key/value DSN:
	// host=localhost user=postgres password=secret dbname=mydb sslmode=disable
	parts := strings.Fields(connStr)
	for _, part := range parts {
		if strings.HasPrefix(part, "dbname=") {
			return strings.TrimPrefix(part, "dbname=")
		}
	}

	return ""
}
