package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	usersURL := strings.TrimSpace(os.Getenv("USERS_DATABASE_URL"))
	authURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if usersURL == "" || authURL == "" {
		log.Fatal("USERS_DATABASE_URL and DATABASE_URL are required")
	}

	usersDB, err := openDB(ctx, usersURL)
	if err != nil {
		log.Fatalf("open users database: %v", err)
	}
	defer usersDB.Close()

	authDB, err := openDB(ctx, authorisationSchemaURL(authURL))
	if err != nil {
		log.Fatalf("open authorisation database: %v", err)
	}
	defer authDB.Close()

	report, err := migrate(ctx, usersDB, authDB)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Authorisation migration completed\n")
	fmt.Printf("roles: %d\n", report.roles)
	fmt.Printf("permissions: %d\n", report.permissions)
	fmt.Printf("role_permissions: %d\n", report.rolePermissions)
	fmt.Printf("user_roles: %d\n", report.userRoles)
	fmt.Printf("user_permissions: %d\n", report.userPermissions)
}

func openDB(ctx context.Context, url string) (*sql.DB, error) {
	db, err := sql.Open("postgres", url)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(3)
	db.SetMaxIdleConns(3)
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
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

type migrationReport struct {
	roles           int
	permissions     int
	rolePermissions int
	userRoles       int
	userPermissions int
}

func migrate(ctx context.Context, usersDB *sql.DB, authDB *sql.DB) (migrationReport, error) {
	tx, err := authDB.BeginTx(ctx, nil)
	if err != nil {
		return migrationReport{}, err
	}
	defer tx.Rollback()

	var report migrationReport
	if report.roles, err = migrateRoles(ctx, usersDB, tx); err != nil {
		return migrationReport{}, fmt.Errorf("migrate roles: %w", err)
	}
	if report.permissions, err = migratePermissions(ctx, usersDB, tx); err != nil {
		return migrationReport{}, fmt.Errorf("migrate permissions: %w", err)
	}
	if report.rolePermissions, err = migrateRolePermissions(ctx, usersDB, tx); err != nil {
		return migrationReport{}, fmt.Errorf("migrate role permissions: %w", err)
	}
	if report.userRoles, err = migrateUserRoles(ctx, usersDB, tx); err != nil {
		return migrationReport{}, fmt.Errorf("migrate user roles: %w", err)
	}
	if report.userPermissions, err = migrateUserPermissions(ctx, usersDB, tx); err != nil {
		return migrationReport{}, fmt.Errorf("migrate user permissions: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return migrationReport{}, err
	}
	return report, nil
}

func migrateRoles(ctx context.Context, usersDB *sql.DB, tx *sql.Tx) (int, error) {
	rows, err := usersDB.QueryContext(ctx, `
		SELECT key, name, COALESCE(description, ''), is_system, assignable
		FROM users.roles
		ORDER BY key`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var key, name, description string
		var systemRole, assignable bool
		if err := rows.Scan(&key, &name, &description, &systemRole, &assignable); err != nil {
			return 0, err
		}
		_, err := tx.ExecContext(ctx, `
			INSERT INTO roles (id, key, name, description, level, assignable, system_role)
			VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7)
			ON CONFLICT (key) DO UPDATE
			SET name = EXCLUDED.name,
			    description = EXCLUDED.description,
			    assignable = EXCLUDED.assignable,
			    system_role = EXCLUDED.system_role,
			    updated_at = now()`,
			roleID(key), key, name, description, roleLevel(key), assignable, systemRole)
		if err != nil {
			return 0, err
		}
		count++
	}
	return count, rows.Err()
}

func migratePermissions(ctx context.Context, usersDB *sql.DB, tx *sql.Tx) (int, error) {
	rows, err := usersDB.QueryContext(ctx, `
		SELECT key, name, COALESCE(description, '')
		FROM users.privileges
		ORDER BY key`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var key, name, description string
		if err := rows.Scan(&key, &name, &description); err != nil {
			return 0, err
		}
		_, err := tx.ExecContext(ctx, `
			INSERT INTO permissions (id, code, name, description, level)
			VALUES ($1, $2, $3, NULLIF($4, ''), $5)
			ON CONFLICT (code) DO UPDATE
			SET name = EXCLUDED.name,
			    description = EXCLUDED.description,
			    updated_at = now()`,
			permissionID(key), key, name, description, permissionLevel(key))
		if err != nil {
			return 0, err
		}
		count++
	}
	return count, rows.Err()
}

func migrateRolePermissions(ctx context.Context, usersDB *sql.DB, tx *sql.Tx) (int, error) {
	rows, err := usersDB.QueryContext(ctx, `
		SELECT role_key, privilege_key
		FROM users.role_privileges
		ORDER BY role_key, privilege_key`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var roleKey, permissionCode string
		if err := rows.Scan(&roleKey, &permissionCode); err != nil {
			return 0, err
		}
		_, err := tx.ExecContext(ctx, `
			INSERT INTO role_permissions (role_id, permission_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING`,
			roleID(roleKey), permissionID(permissionCode))
		if err != nil {
			return 0, err
		}
		count++
	}
	return count, rows.Err()
}

func migrateUserRoles(ctx context.Context, usersDB *sql.DB, tx *sql.Tx) (int, error) {
	rows, err := usersDB.QueryContext(ctx, `
		SELECT user_id, role_key, organisation_id, COALESCE(assigned_by, 'migration')
		FROM users.user_roles
		ORDER BY user_id, role_key, organisation_id`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var userID, roleKey, assignedBy string
		var organisationID sql.NullString
		if err := rows.Scan(&userID, &roleKey, &organisationID, &assignedBy); err != nil {
			return 0, err
		}
		org := nullableString(organisationID)
		_, err := tx.ExecContext(ctx, `
			INSERT INTO user_roles (id, user_id, role_id, organisation_id, assigned_by)
			VALUES ($1, $2, $3, NULLIF($4, ''), $5)
			ON CONFLICT (user_id, role_id, COALESCE(organisation_id, ''), COALESCE(application_id, ''), COALESCE(resource_type, ''), COALESCE(resource_id, ''))
			DO UPDATE SET assigned_by = EXCLUDED.assigned_by`,
			assignmentID("legacy_user_role", userID, roleKey, org), userID, roleID(roleKey), org, assignedBy)
		if err != nil {
			return 0, err
		}
		count++
	}
	return count, rows.Err()
}

func migrateUserPermissions(ctx context.Context, usersDB *sql.DB, tx *sql.Tx) (int, error) {
	rows, err := usersDB.QueryContext(ctx, `
		SELECT user_id, privilege_key, organisation_id, effect::text, COALESCE(assigned_by, 'migration')
		FROM users.user_permissions
		ORDER BY user_id, privilege_key, organisation_id, effect`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var userID, permissionCode, effect, assignedBy string
		var organisationID sql.NullString
		if err := rows.Scan(&userID, &permissionCode, &organisationID, &effect, &assignedBy); err != nil {
			return 0, err
		}
		org := nullableString(organisationID)
		_, err := tx.ExecContext(ctx, `
			INSERT INTO user_permissions (id, user_id, permission_id, effect, organisation_id, assigned_by)
			VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6)
			ON CONFLICT (user_id, permission_id, COALESCE(organisation_id, ''), COALESCE(application_id, ''), COALESCE(resource_type, ''), COALESCE(resource_id, ''))
			DO UPDATE SET effect = EXCLUDED.effect, assigned_by = EXCLUDED.assigned_by`,
			assignmentID("legacy_user_permission", userID, permissionCode, org), userID, permissionID(permissionCode), effect, org, assignedBy)
		if err != nil {
			return 0, err
		}
		count++
	}
	return count, rows.Err()
}

func nullableString(value sql.NullString) string {
	if value.Valid {
		return value.String
	}
	return ""
}

func roleID(key string) string {
	return "role_" + normalizeID(key)
}

func permissionID(code string) string {
	return "perm_" + normalizeID(code)
}

func assignmentID(prefix string, parts ...string) string {
	normalized := make([]string, 0, len(parts)+1)
	normalized = append(normalized, prefix)
	for _, part := range parts {
		normalized = append(normalized, normalizeID(part))
	}
	return strings.Join(normalized, "_")
}

var nonIDChar = regexp.MustCompile(`[^a-z0-9]+`)

func normalizeID(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = nonIDChar.ReplaceAllString(value, "_")
	value = strings.Trim(value, "_")
	if value == "" {
		return "none"
	}
	return value
}

func roleLevel(key string) int {
	switch strings.ToUpper(strings.TrimSpace(key)) {
	case "ADMIN", "SUPER_ADMIN":
		return 1000
	case "PLATFORM_ADMIN":
		return 900
	case "ORGANISATION_OWNER":
		return 800
	case "ORGANISATION_ADMIN":
		return 700
	case "APPLICATION_ADMIN":
		return 600
	case "ACADEMY_OWNER":
		return 500
	case "ACADEMY_ADMIN":
		return 400
	case "COACH":
		return 300
	case "MEMBER":
		return 200
	default:
		return 100
	}
}

func permissionLevel(code string) int {
	switch {
	case strings.HasPrefix(code, "permissions."), strings.HasPrefix(code, "roles."):
		return 900
	case strings.Contains(code, ".delete"), strings.Contains(code, ".disable"), strings.Contains(code, ".assign"), strings.Contains(code, ".manage"):
		return 700
	case strings.Contains(code, ".create"), strings.Contains(code, ".update"):
		return 600
	default:
		return 100
	}
}
