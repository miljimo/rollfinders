package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/url"
	"os"
	"time"

	"github.com/lib/pq"

	gatewayroutes "rollfinders/internal/core/routes"
	"rollfinders/internal/services/authorisation/config"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}
	if cfg.DatabaseURL == "" {
		logger.Error("DATABASE_URL or DB_HOST/DB_NAME is required")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	db, err := sql.Open("postgres", authorisationSchemaURL(cfg.DatabaseURL))
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	if err := db.PingContext(ctx); err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}

	resources := gatewayroutes.GatewayResourceCatalog()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		logger.Error("failed to begin resource seed transaction", "error", err)
		os.Exit(1)
	}
	for permissionName, resource := range resources {
		resourceID := gatewayroutes.StableResourceID(string(permissionName))
		if _, err := tx.ExecContext(ctx, `SELECT gateway_resource_seed($1, $2, $3, $4)`,
			resourceID, resource.Name, resource.Description, resource.Target); err != nil {
			_ = tx.Rollback()
			logger.Error("failed to seed gateway resource", "resource_id", resourceID, "resource_key", permissionName, "error", err)
			os.Exit(1)
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO permissions (id, resource_id, created_by)
			VALUES ($1, $2, 'SYSTEM')
			ON CONFLICT ON CONSTRAINT permissions_resource_scope_key DO UPDATE
			SET resource_id = EXCLUDED.resource_id,
			    updated_at = now()
		`, gatewayPermissionID(resourceID), resourceID); err != nil {
			_ = tx.Rollback()
			logger.Error("failed to seed gateway permission", "resource_id", resourceID, "resource_key", permissionName, "error", err)
			os.Exit(1)
		}
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT role.id, permission.id
		FROM roles role
		CROSS JOIN permissions permission
		JOIN resources resource ON resource.id = permission.resource_id
		WHERE role.key IN ('SUPER_ADMIN', 'ADMIN')
		  AND resource.name = ANY($1)
		ON CONFLICT DO NOTHING
	`, pq.Array(gatewayPermissionNames(resources))); err != nil {
		_ = tx.Rollback()
		logger.Error("failed to grant gateway permissions", "error", err)
		os.Exit(1)
	}
	if _, err := tx.ExecContext(ctx, `SELECT gateway_legacy_resources_clean()`); err != nil {
		_ = tx.Rollback()
		logger.Error("failed to clean legacy resources", "error", err)
		os.Exit(1)
	}
	if err := tx.Commit(); err != nil {
		logger.Error("failed to commit gateway resources", "error", err)
		os.Exit(1)
	}
	logger.Info("gateway resources seeded", "count", len(resources))
}

func gatewayPermissionID(resourceID string) string {
	return "permission_" + gatewayroutes.StableResourceID(resourceID)
}

func gatewayPermissionNames(resources map[gatewayroutes.GatewayPermissionName]gatewayroutes.GatewayResourceDefinition) []string {
	names := make([]string, 0, len(resources))
	for _, resource := range resources {
		names = append(names, string(resource.Name))
	}
	return names
}

func authorisationSchemaURL(databaseURL string) string {
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		return databaseURL
	}
	query := parsed.Query()
	if query.Get("options") == "" {
		query.Set("options", "-c search_path=authorisation,public")
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}
