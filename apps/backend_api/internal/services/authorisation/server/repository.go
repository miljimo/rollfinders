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
	if err := r.upsertPermissionResource(ctx, p); err != nil {
		return Permission{}, err
	}
	row := r.db.QueryRowContext(ctx, `SELECT * FROM permission_create($1, $2, $3, $4, $5)`,
		p.ID, p.OrganisationID, p.ApplicationID, p.ResourceID, actor)
	created, err := scanPermission(row)
	if err != nil {
		return Permission{}, err
	}
	_ = r.audit(ctx, actor, "permission.create", "", "", created.ID, Scope{}, nil, created, requestID)
	return created, nil
}

func (r *repository) updatePermission(ctx context.Context, p Permission, actor, requestID string) (Permission, error) {
	before, _ := r.getPermission(ctx, p.ID)
	if err := r.upsertPermissionResource(ctx, p); err != nil {
		return Permission{}, err
	}
	row := r.db.QueryRowContext(ctx, `SELECT * FROM permission_update($1, $2, $3, $4)`,
		p.ID, p.OrganisationID, p.ApplicationID, p.ResourceID)
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

func (r *repository) listPermissions(ctx context.Context, limit int, offset int) ([]Permission, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT * FROM permission_list($1, $2)`, limit, offset)
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
	p, err := scanPermission(r.db.QueryRowContext(ctx, `SELECT * FROM permission_row_by_id($1)`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Permission{}, errNotFound
	}
	return p, err
}

func (r *repository) permissionByCode(ctx context.Context, code string, scope Scope) (Permission, error) {
	p, err := scanPermission(r.db.QueryRowContext(ctx, `SELECT * FROM permission_row_by_code($1, $2, $3)`,
		code, scope.OrganisationID, scope.ApplicationID))
	if errors.Is(err, sql.ErrNoRows) {
		return Permission{}, errNotFound
	}
	return p, err
}

func (r *repository) upsertPermissionResource(ctx context.Context, p Permission) error {
	_, err := r.db.ExecContext(ctx, `SELECT * FROM resource_upsert($1, $2, $3, '')`,
		p.ResourceID, p.Code, p.Description)
	return err
}

func scanPermission(scanner interface{ Scan(dest ...any) error }) (Permission, error) {
	var p Permission
	err := scanner.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.OrganisationID, &p.ApplicationID, &p.ResourceID, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (r *repository) listResources(ctx context.Context, limit int, offset int) ([]Resource, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT * FROM resource_list($1, $2)`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Resource
	for rows.Next() {
		var resource Resource
		if err := rows.Scan(&resource.ID, &resource.Name, &resource.Description, &resource.Target, &resource.CreatedAt, &resource.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, resource)
	}
	return out, rows.Err()
}

func (r *repository) createResource(ctx context.Context, resource Resource, actor, requestID string) (Resource, error) {
	row := r.db.QueryRowContext(ctx, `SELECT * FROM resource_upsert($1, $2, $3, $4)`,
		resource.ID, resource.Name, resource.Description, resource.Target)
	var created Resource
	if err := row.Scan(&created.ID, &created.Name, &created.Description, &created.Target, &created.CreatedAt, &created.UpdatedAt); err != nil {
		return Resource{}, err
	}
	_ = r.audit(ctx, actor, "resource.create", "", "", created.ID, Scope{}, nil, created, requestID)
	return created, nil
}

func (r *repository) createRole(ctx context.Context, role Role, actor, requestID string) (Role, error) {
	row := r.db.QueryRowContext(ctx, `SELECT * FROM role_create($1, $2, $3, $4, $5, $6, $7, $8)`,
		role.ID, role.Key, role.Name, role.Description, role.Level, role.Assignable, role.SystemRole, roleCreator(actor))
	created, err := scanRole(row)
	if err != nil {
		return Role{}, err
	}
	_ = r.audit(ctx, actor, "role.create", "", created.ID, "", Scope{}, nil, created, requestID)
	return created, nil
}

func (r *repository) updateRole(ctx context.Context, role Role, actor, requestID string) (Role, error) {
	before, _ := r.getRole(ctx, role.ID)
	row := r.db.QueryRowContext(ctx, `SELECT * FROM role_update($1, $2, $3, $4, $5, $6, $7)`,
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

func (r *repository) listRoles(ctx context.Context, limit int, offset int) ([]Role, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT * FROM role_list($1, $2)`, limit, offset)
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
	role, err := scanRole(r.db.QueryRowContext(ctx, `SELECT * FROM role_by_id($1)`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Role{}, errNotFound
	}
	return role, err
}

func scanRole(scanner interface{ Scan(dest ...any) error }) (Role, error) {
	var role Role
	err := scanner.Scan(&role.ID, &role.Key, &role.Name, &role.Description, &role.Level, &role.Assignable, &role.SystemRole, &role.CreatedBy, &role.CreatedAt, &role.UpdatedAt)
	return role, err
}

func roleCreator(actor string) string {
	if cleanString(actor) == "" {
		return "SYSTEM"
	}
	return cleanString(actor)
}

func (r *repository) addRolePermission(ctx context.Context, roleID, permissionID, actor, requestID string) error {
	_, err := r.db.ExecContext(ctx, `SELECT role_permission_add($1, $2)`, roleID, permissionID)
	if err == nil {
		_ = r.audit(ctx, actor, "role_permission.add", "", roleID, permissionID, Scope{}, nil, map[string]string{"role_id": roleID, "permission_id": permissionID}, requestID)
	}
	return err
}

func (r *repository) removeRolePermission(ctx context.Context, roleID, permissionID, actor, requestID string) error {
	var removed bool
	err := r.db.QueryRowContext(ctx, `SELECT role_permission_remove($1, $2)`, roleID, permissionID).Scan(&removed)
	if err != nil {
		return err
	}
	if !removed {
		return errNotFound
	}
	_ = r.audit(ctx, actor, "role_permission.remove", "", roleID, permissionID, Scope{}, map[string]string{"role_id": roleID, "permission_id": permissionID}, nil, requestID)
	return nil
}

func (r *repository) rolePermissions(ctx context.Context, roleID string) ([]Permission, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT * FROM role_permission_list($1)`, roleID)
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

func (r *repository) ensureResource(ctx context.Context, scope Scope) error {
	if scope.ResourceID == "" {
		return nil
	}
	_, err := r.db.ExecContext(ctx, `SELECT scoped_resource_ensure($1)`, scope.ResourceID)
	return err
}

func (r *repository) assignUserRole(ctx context.Context, a UserRoleAssignment, actor, requestID string) (UserRoleAssignment, error) {
	role, err := r.getRole(ctx, a.RoleID)
	if err != nil {
		return UserRoleAssignment{}, err
	}
	if err := r.ensureAssignable(ctx, actor, role.Level); err != nil {
		return UserRoleAssignment{}, err
	}
	if err := r.ensureResource(ctx, a.Scope); err != nil {
		return UserRoleAssignment{}, err
	}
	row := r.db.QueryRowContext(ctx, `SELECT * FROM user_role_assign($1, $2, $3, $4, $5, $6, $7)`,
		a.ID, a.UserID, a.RoleID, a.Scope.OrganisationID, a.Scope.ApplicationID, a.Scope.ResourceID, a.AssignedBy)
	created, err := scanUserRole(row)
	if err != nil {
		return UserRoleAssignment{}, err
	}
	created.RoleKey = role.Key
	_ = r.audit(ctx, actor, "user_role.assign", created.UserID, created.RoleID, "", created.Scope, nil, created, requestID)
	return created, nil
}

func (r *repository) listUserRoles(ctx context.Context, userID string, limit int, offset int) ([]UserRoleAssignment, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT * FROM user_role_list($1, $2, $3)`, userID, limit, offset)
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
	var removed bool
	err := r.db.QueryRowContext(ctx, `SELECT user_role_delete($1, $2)`, userID, assignmentID).Scan(&removed)
	if err != nil {
		return err
	}
	if !removed {
		return errNotFound
	}
	_ = r.audit(ctx, actor, "user_role.remove", userID, "", "", Scope{}, map[string]string{"assignment_id": assignmentID}, nil, requestID)
	return nil
}

func scanUserRole(scanner interface{ Scan(dest ...any) error }) (UserRoleAssignment, error) {
	var a UserRoleAssignment
	var org, app, rid sql.NullString
	err := scanner.Scan(&a.ID, &a.UserID, &a.RoleID, &org, &app, &rid, &a.AssignedBy, &a.CreatedAt)
	a.Scope = Scope{OrganisationID: org.String, ApplicationID: app.String, ResourceID: rid.String}
	return a, err
}

func scanUserRoleWithKey(scanner interface{ Scan(dest ...any) error }) (UserRoleAssignment, error) {
	var a UserRoleAssignment
	var org, app, rid sql.NullString
	err := scanner.Scan(&a.ID, &a.UserID, &a.RoleID, &org, &app, &rid, &a.AssignedBy, &a.CreatedAt, &a.RoleKey)
	a.Scope = Scope{OrganisationID: org.String, ApplicationID: app.String, ResourceID: rid.String}
	return a, err
}

func (r *repository) assignUserPermission(ctx context.Context, a UserPermissionAssignment, actor, requestID string) (UserPermissionAssignment, error) {
	permission, err := r.getPermission(ctx, a.PermissionID)
	if err != nil {
		return UserPermissionAssignment{}, err
	}
	if err := r.ensureResource(ctx, a.Scope); err != nil {
		return UserPermissionAssignment{}, err
	}
	row := r.db.QueryRowContext(ctx, `SELECT * FROM user_permission_assign($1, $2, $3, $4, $5, $6, $7, $8)`,
		a.ID, a.UserID, a.PermissionID, a.Effect, a.Scope.OrganisationID, a.Scope.ApplicationID, a.Scope.ResourceID, a.AssignedBy)
	created, err := scanUserPermission(row)
	if err != nil {
		return UserPermissionAssignment{}, err
	}
	created.PermissionCode = permission.Code
	_ = r.audit(ctx, actor, "user_permission.assign", created.UserID, "", created.PermissionID, created.Scope, nil, created, requestID)
	return created, nil
}

func (r *repository) listUserPermissions(ctx context.Context, userID string, limit int, offset int) ([]UserPermissionAssignment, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT * FROM user_permission_list($1, $2, $3)`, userID, limit, offset)
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
	var removed bool
	err := r.db.QueryRowContext(ctx, `SELECT user_permission_delete($1, $2)`, userID, assignmentID).Scan(&removed)
	if err != nil {
		return err
	}
	if !removed {
		return errNotFound
	}
	_ = r.audit(ctx, actor, "user_permission.remove", userID, "", "", Scope{}, map[string]string{"assignment_id": assignmentID}, nil, requestID)
	return nil
}

func scanUserPermission(scanner interface{ Scan(dest ...any) error }) (UserPermissionAssignment, error) {
	var a UserPermissionAssignment
	var org, app, rid sql.NullString
	err := scanner.Scan(&a.ID, &a.UserID, &a.PermissionID, &a.Effect, &org, &app, &rid, &a.AssignedBy, &a.CreatedAt)
	a.Scope = Scope{OrganisationID: org.String, ApplicationID: app.String, ResourceID: rid.String}
	return a, err
}

func scanUserPermissionWithCode(scanner interface{ Scan(dest ...any) error }) (UserPermissionAssignment, error) {
	var a UserPermissionAssignment
	var org, app, rid sql.NullString
	err := scanner.Scan(&a.ID, &a.UserID, &a.PermissionID, &a.Effect, &org, &app, &rid, &a.AssignedBy, &a.CreatedAt, &a.PermissionCode)
	a.Scope = Scope{OrganisationID: org.String, ApplicationID: app.String, ResourceID: rid.String}
	return a, err
}

func (r *repository) authorize(ctx context.Context, userID, permissionCode string, scope Scope) (authorizeResponse, error) {
	if cleanString(userID) == "" {
		return authorizeResponse{Authorized: false, Decision: "deny", Reason: "missing_subject"}, nil
	}
	permission, err := r.permissionByCode(ctx, permissionCode, scope)
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
	superAdmin, err := r.hasSuperAdminRole(ctx, userID)
	if err != nil {
		return authorizeResponse{}, err
	}
	if superAdmin {
		return authorizeResponse{Authorized: true, Decision: "allow"}, nil
	}
	if _, allowed := effective.allowed[permission.Code]; allowed {
		return authorizeResponse{Authorized: true, Decision: "allow"}, nil
	}
	return authorizeResponse{Authorized: false, Decision: "deny", Reason: "missing_permission"}, nil
}

func (r *repository) hasSuperAdminRole(ctx context.Context, userID string) (bool, error) {
	var maxLevel sql.NullInt64
	err := r.db.QueryRowContext(ctx, `SELECT actor_max_role_level($1)`, userID).Scan(&maxLevel)
	if err != nil {
		return false, err
	}
	return maxLevel.Valid && maxLevel.Int64 >= 1000, nil
}

type effectiveSet struct {
	allowed map[string]Permission
	denied  map[string]Permission
}

func (r *repository) effectivePermissions(ctx context.Context, userID string, scope Scope) (effectiveSet, error) {
	allowed := map[string]Permission{}
	denied := map[string]Permission{}
	rows, err := r.db.QueryContext(ctx, `SELECT * FROM effective_role_permissions($1, $2, $3, $4)`,
		userID, nullable(scope.OrganisationID), nullable(scope.ApplicationID), nullable(scope.ResourceID))
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
	rows, err = r.db.QueryContext(ctx, `SELECT * FROM effective_user_permissions($1, $2, $3, $4)`,
		userID, nullable(scope.OrganisationID), nullable(scope.ApplicationID), nullable(scope.ResourceID))
	if err != nil {
		return effectiveSet{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var p Permission
		var effect string
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.OrganisationID, &p.ApplicationID, &p.ResourceID, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt, &effect); err != nil {
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
	err := r.db.QueryRowContext(ctx, `SELECT actor_max_role_level($1)`, actor).Scan(&maxLevel)
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
