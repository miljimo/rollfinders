package server

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

var errNotFound = errors.New("not found")

type repository struct {
	db *sql.DB
}

func openRepository(ctx context.Context, databaseURL string) (*repository, error) {
	db, err := sql.Open("postgres", authorisationSchemaURL(databaseURL))
	if err != nil {
		return nil, err
	}
	db.SetMaxIdleConns(3)
	db.SetMaxOpenConns(3)
	pingCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &repository{db: db}, nil
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

func (r *repository) close() error {
	if r == nil || r.db == nil {
		return nil
	}
	return r.db.Close()
}

func (r *repository) createPermission(ctx context.Context, p Permission, actor, requestID string) (Permission, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO permissions (id, code, name, description, level)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5)
		RETURNING id, code, name, COALESCE(description, ''), level, created_at, updated_at`,
		p.ID, p.Code, p.Name, p.Description, p.Level)
	created, err := scanPermission(row)
	if err != nil {
		return Permission{}, err
	}
	_ = r.audit(ctx, actor, "permission.create", "", "", created.ID, Scope{}, nil, created, requestID)
	return created, nil
}

func (r *repository) updatePermission(ctx context.Context, p Permission, actor, requestID string) (Permission, error) {
	before, _ := r.getPermission(ctx, p.ID)
	row := r.db.QueryRowContext(ctx, `
		UPDATE permissions
		SET code = $2, name = $3, description = NULLIF($4, ''), level = $5, updated_at = now()
		WHERE id = $1
		RETURNING id, code, name, COALESCE(description, ''), level, created_at, updated_at`,
		p.ID, p.Code, p.Name, p.Description, p.Level)
	updated, err := scanPermission(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Permission{}, errNotFound
	}
	if err != nil {
		return Permission{}, err
	}
	_ = r.audit(ctx, actor, "permission.update", "", "", updated.ID, Scope{}, before, updated, requestID)
	return updated, nil
}

func (r *repository) listPermissions(ctx context.Context) ([]Permission, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, code, name, COALESCE(description, ''), level, created_at, updated_at FROM permissions ORDER BY code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Permission
	for rows.Next() {
		p, err := scanPermission(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *repository) getPermission(ctx context.Context, id string) (Permission, error) {
	p, err := scanPermission(r.db.QueryRowContext(ctx, `SELECT id, code, name, COALESCE(description, ''), level, created_at, updated_at FROM permissions WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Permission{}, errNotFound
	}
	return p, err
}

func (r *repository) permissionByCode(ctx context.Context, code string) (Permission, error) {
	p, err := scanPermission(r.db.QueryRowContext(ctx, `SELECT id, code, name, COALESCE(description, ''), level, created_at, updated_at FROM permissions WHERE code = $1`, code))
	if errors.Is(err, sql.ErrNoRows) {
		return Permission{}, errNotFound
	}
	return p, err
}

func scanPermission(scanner interface{ Scan(dest ...any) error }) (Permission, error) {
	var p Permission
	err := scanner.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Level, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (r *repository) createRole(ctx context.Context, role Role, actor, requestID string) (Role, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO roles (id, key, name, description, level, assignable, system_role)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7)
		RETURNING id, key, name, COALESCE(description, ''), level, assignable, system_role, created_at, updated_at`,
		role.ID, role.Key, role.Name, role.Description, role.Level, role.Assignable, role.SystemRole)
	created, err := scanRole(row)
	if err != nil {
		return Role{}, err
	}
	_ = r.audit(ctx, actor, "role.create", "", created.ID, "", Scope{}, nil, created, requestID)
	return created, nil
}

func (r *repository) updateRole(ctx context.Context, role Role, actor, requestID string) (Role, error) {
	before, _ := r.getRole(ctx, role.ID)
	row := r.db.QueryRowContext(ctx, `
		UPDATE roles
		SET key = $2, name = $3, description = NULLIF($4, ''), level = $5, assignable = $6, system_role = $7, updated_at = now()
		WHERE id = $1
		RETURNING id, key, name, COALESCE(description, ''), level, assignable, system_role, created_at, updated_at`,
		role.ID, role.Key, role.Name, role.Description, role.Level, role.Assignable, role.SystemRole)
	updated, err := scanRole(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Role{}, errNotFound
	}
	if err != nil {
		return Role{}, err
	}
	_ = r.audit(ctx, actor, "role.update", "", updated.ID, "", Scope{}, before, updated, requestID)
	return updated, nil
}

func (r *repository) listRoles(ctx context.Context) ([]Role, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, key, name, COALESCE(description, ''), level, assignable, system_role, created_at, updated_at FROM roles ORDER BY level DESC, key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Role
	for rows.Next() {
		role, err := scanRole(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, role)
	}
	return out, rows.Err()
}

func (r *repository) getRole(ctx context.Context, id string) (Role, error) {
	role, err := scanRole(r.db.QueryRowContext(ctx, `SELECT id, key, name, COALESCE(description, ''), level, assignable, system_role, created_at, updated_at FROM roles WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Role{}, errNotFound
	}
	return role, err
}

func scanRole(scanner interface{ Scan(dest ...any) error }) (Role, error) {
	var role Role
	err := scanner.Scan(&role.ID, &role.Key, &role.Name, &role.Description, &role.Level, &role.Assignable, &role.SystemRole, &role.CreatedAt, &role.UpdatedAt)
	return role, err
}

func (r *repository) addRolePermission(ctx context.Context, roleID, permissionID, actor, requestID string) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, roleID, permissionID)
	if err == nil {
		_ = r.audit(ctx, actor, "role_permission.add", "", roleID, permissionID, Scope{}, nil, map[string]string{"role_id": roleID, "permission_id": permissionID}, requestID)
	}
	return err
}

func (r *repository) removeRolePermission(ctx context.Context, roleID, permissionID, actor, requestID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2`, roleID, permissionID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return errNotFound
	}
	_ = r.audit(ctx, actor, "role_permission.remove", "", roleID, permissionID, Scope{}, map[string]string{"role_id": roleID, "permission_id": permissionID}, nil, requestID)
	return nil
}

func (r *repository) rolePermissions(ctx context.Context, roleID string) ([]Permission, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.code, p.name, COALESCE(p.description, ''), p.level, p.created_at, p.updated_at
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		WHERE rp.role_id = $1
		ORDER BY p.code`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Permission
	for rows.Next() {
		p, err := scanPermission(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *repository) assignUserRole(ctx context.Context, a UserRoleAssignment, actor, requestID string) (UserRoleAssignment, error) {
	role, err := r.getRole(ctx, a.RoleID)
	if err != nil {
		return UserRoleAssignment{}, err
	}
	if err := r.ensureAssignable(ctx, actor, role.Level); err != nil {
		return UserRoleAssignment{}, err
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO user_roles (id, user_id, role_id, organisation_id, application_id, resource_type, resource_id, assigned_by)
		VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), $8)
		RETURNING id, user_id, role_id, organisation_id, application_id, resource_type, resource_id, assigned_by, created_at`,
		a.ID, a.UserID, a.RoleID, a.Scope.OrganisationID, a.Scope.ApplicationID, a.Scope.ResourceType, a.Scope.ResourceID, a.AssignedBy)
	created, err := scanUserRole(row)
	if err != nil {
		return UserRoleAssignment{}, err
	}
	created.RoleKey = role.Key
	_ = r.audit(ctx, actor, "user_role.assign", created.UserID, created.RoleID, "", created.Scope, nil, created, requestID)
	return created, nil
}

func (r *repository) listUserRoles(ctx context.Context, userID string) ([]UserRoleAssignment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT ur.id, ur.user_id, ur.role_id, ur.organisation_id, ur.application_id, ur.resource_type, ur.resource_id, ur.assigned_by, ur.created_at, r.key
		FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY ur.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserRoleAssignment
	for rows.Next() {
		a, err := scanUserRoleWithKey(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *repository) deleteUserRole(ctx context.Context, userID, assignmentID, actor, requestID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM user_roles WHERE user_id = $1 AND id = $2`, userID, assignmentID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return errNotFound
	}
	_ = r.audit(ctx, actor, "user_role.remove", userID, "", "", Scope{}, map[string]string{"assignment_id": assignmentID}, nil, requestID)
	return nil
}

func scanUserRole(scanner interface{ Scan(dest ...any) error }) (UserRoleAssignment, error) {
	var a UserRoleAssignment
	var org, app, rt, rid sql.NullString
	err := scanner.Scan(&a.ID, &a.UserID, &a.RoleID, &org, &app, &rt, &rid, &a.AssignedBy, &a.CreatedAt)
	a.Scope = Scope{OrganisationID: org.String, ApplicationID: app.String, ResourceType: rt.String, ResourceID: rid.String}
	return a, err
}

func scanUserRoleWithKey(scanner interface{ Scan(dest ...any) error }) (UserRoleAssignment, error) {
	var a UserRoleAssignment
	var org, app, rt, rid sql.NullString
	err := scanner.Scan(&a.ID, &a.UserID, &a.RoleID, &org, &app, &rt, &rid, &a.AssignedBy, &a.CreatedAt, &a.RoleKey)
	a.Scope = Scope{OrganisationID: org.String, ApplicationID: app.String, ResourceType: rt.String, ResourceID: rid.String}
	return a, err
}

func (r *repository) assignUserPermission(ctx context.Context, a UserPermissionAssignment, actor, requestID string) (UserPermissionAssignment, error) {
	permission, err := r.getPermission(ctx, a.PermissionID)
	if err != nil {
		return UserPermissionAssignment{}, err
	}
	if err := r.ensureAssignable(ctx, actor, permission.Level); err != nil {
		return UserPermissionAssignment{}, err
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO user_permissions (id, user_id, permission_id, effect, organisation_id, application_id, resource_type, resource_id, assigned_by)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), $9)
		RETURNING id, user_id, permission_id, effect, organisation_id, application_id, resource_type, resource_id, assigned_by, created_at`,
		a.ID, a.UserID, a.PermissionID, a.Effect, a.Scope.OrganisationID, a.Scope.ApplicationID, a.Scope.ResourceType, a.Scope.ResourceID, a.AssignedBy)
	created, err := scanUserPermission(row)
	if err != nil {
		return UserPermissionAssignment{}, err
	}
	created.PermissionCode = permission.Code
	_ = r.audit(ctx, actor, "user_permission.assign", created.UserID, "", created.PermissionID, created.Scope, nil, created, requestID)
	return created, nil
}

func (r *repository) listUserPermissions(ctx context.Context, userID string) ([]UserPermissionAssignment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT up.id, up.user_id, up.permission_id, up.effect, up.organisation_id, up.application_id, up.resource_type, up.resource_id, up.assigned_by, up.created_at, p.code
		FROM user_permissions up
		JOIN permissions p ON p.id = up.permission_id
		WHERE up.user_id = $1
		ORDER BY up.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []UserPermissionAssignment
	for rows.Next() {
		a, err := scanUserPermissionWithCode(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *repository) deleteUserPermission(ctx context.Context, userID, assignmentID, actor, requestID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM user_permissions WHERE user_id = $1 AND id = $2`, userID, assignmentID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return errNotFound
	}
	_ = r.audit(ctx, actor, "user_permission.remove", userID, "", "", Scope{}, map[string]string{"assignment_id": assignmentID}, nil, requestID)
	return nil
}

func scanUserPermission(scanner interface{ Scan(dest ...any) error }) (UserPermissionAssignment, error) {
	var a UserPermissionAssignment
	var org, app, rt, rid sql.NullString
	err := scanner.Scan(&a.ID, &a.UserID, &a.PermissionID, &a.Effect, &org, &app, &rt, &rid, &a.AssignedBy, &a.CreatedAt)
	a.Scope = Scope{OrganisationID: org.String, ApplicationID: app.String, ResourceType: rt.String, ResourceID: rid.String}
	return a, err
}

func scanUserPermissionWithCode(scanner interface{ Scan(dest ...any) error }) (UserPermissionAssignment, error) {
	var a UserPermissionAssignment
	var org, app, rt, rid sql.NullString
	err := scanner.Scan(&a.ID, &a.UserID, &a.PermissionID, &a.Effect, &org, &app, &rt, &rid, &a.AssignedBy, &a.CreatedAt, &a.PermissionCode)
	a.Scope = Scope{OrganisationID: org.String, ApplicationID: app.String, ResourceType: rt.String, ResourceID: rid.String}
	return a, err
}

func (r *repository) authorize(ctx context.Context, userID, permissionCode string, scope Scope) (authorizeResponse, error) {
	if cleanString(userID) == "" {
		return authorizeResponse{Authorized: false, Decision: "deny", Reason: "missing_subject"}, nil
	}
	permission, err := r.permissionByCode(ctx, permissionCode)
	if errors.Is(err, errNotFound) {
		return authorizeResponse{Authorized: false, Decision: "deny", Reason: "unknown_permission"}, nil
	}
	if err != nil {
		return authorizeResponse{}, err
	}
	effective, err := r.effectivePermissions(ctx, userID, scope)
	if err != nil {
		return authorizeResponse{}, err
	}
	if _, denied := effective.denied[permission.Code]; denied {
		return authorizeResponse{Authorized: false, Decision: "deny", Reason: "direct_deny"}, nil
	}
	if _, allowed := effective.allowed[permission.Code]; allowed {
		return authorizeResponse{Authorized: true, Decision: "allow"}, nil
	}
	return authorizeResponse{Authorized: false, Decision: "deny", Reason: "missing_permission"}, nil
}

type effectiveSet struct {
	allowed map[string]Permission
	denied  map[string]Permission
}

func (r *repository) effectivePermissions(ctx context.Context, userID string, scope Scope) (effectiveSet, error) {
	allowed := map[string]Permission{}
	denied := map[string]Permission{}
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.code, p.name, COALESCE(p.description, ''), p.level, p.created_at, p.updated_at
		FROM user_roles ur
		JOIN role_permissions rp ON rp.role_id = ur.role_id
		JOIN permissions p ON p.id = rp.permission_id
		WHERE ur.user_id = $1 AND scope_matches(ur.organisation_id, ur.application_id, ur.resource_type, ur.resource_id, $2, $3, $4, $5)`,
		userID, nullable(scope.OrganisationID), nullable(scope.ApplicationID), nullable(scope.ResourceType), nullable(scope.ResourceID))
	if err != nil {
		return effectiveSet{}, err
	}
	for rows.Next() {
		p, err := scanPermission(rows)
		if err != nil {
			_ = rows.Close()
			return effectiveSet{}, err
		}
		allowed[p.Code] = p
	}
	if err := rows.Close(); err != nil {
		return effectiveSet{}, err
	}
	rows, err = r.db.QueryContext(ctx, `
		SELECT p.id, p.code, p.name, COALESCE(p.description, ''), p.level, p.created_at, p.updated_at, up.effect
		FROM user_permissions up
		JOIN permissions p ON p.id = up.permission_id
		WHERE up.user_id = $1 AND scope_matches(up.organisation_id, up.application_id, up.resource_type, up.resource_id, $2, $3, $4, $5)`,
		userID, nullable(scope.OrganisationID), nullable(scope.ApplicationID), nullable(scope.ResourceType), nullable(scope.ResourceID))
	if err != nil {
		return effectiveSet{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var p Permission
		var effect string
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Level, &p.CreatedAt, &p.UpdatedAt, &effect); err != nil {
			return effectiveSet{}, err
		}
		if effect == "DENY" {
			denied[p.Code] = p
			delete(allowed, p.Code)
			continue
		}
		if _, isDenied := denied[p.Code]; !isDenied {
			allowed[p.Code] = p
		}
	}
	return effectiveSet{allowed: allowed, denied: denied}, rows.Err()
}

func (r *repository) ensureAssignable(ctx context.Context, actor string, targetLevel int) error {
	if actor == "" {
		return nil
	}
	var maxLevel sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		SELECT MAX(level) FROM (
			SELECT roles.level
			FROM user_roles
			JOIN roles ON roles.id = user_roles.role_id
			WHERE user_roles.user_id = $1
			UNION ALL
			SELECT permissions.level
			FROM user_permissions
			JOIN permissions ON permissions.id = user_permissions.permission_id
			WHERE user_permissions.user_id = $1 AND user_permissions.effect = 'ALLOW'
		) levels`, actor).Scan(&maxLevel)
	if err != nil {
		return err
	}
	if !maxLevel.Valid || int(maxLevel.Int64) < targetLevel {
		return fmt.Errorf("delegation violation")
	}
	return nil
}

func nullable(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}
