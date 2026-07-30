package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"rollfinders/internal/services/users/databases"
)

func managedPasswordTargetRow(protected bool) databases.DBRow {
	return databases.DBRow{
		"id":           "usr_target",
		"email":        "target@example.com",
		"role":         "STANDARD_USER",
		"status":       "ACTIVE",
		"is_protected": protected,
	}
}

func TestAdminTemporaryPasswordRequiresReason(t *testing.T) {
	db := &accountDeletionTestDB{functions: map[string]databases.DBResults{
		"users.user_get": {managedPasswordTargetRow(false)},
	}}
	s := &server{db: db}
	req := httptest.NewRequest(http.MethodPost, "/v1/users/usr_target/temporary-password", strings.NewReader(`{"temporary_password":"ValidPass123","reason":"   "}`))
	req.SetPathValue("userId", "usr_target")
	req.Header.Set("X-Actor", `{"id":"usr_admin","role":"PLATFORM_ADMIN"}`)
	rec := httptest.NewRecorder()

	s.setAdminTemporaryPassword(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if db.procedureName != "" {
		t.Fatalf("invalid request must not update credentials, called %q", db.procedureName)
	}
}

func TestAdminTemporaryPasswordIsAuditedWithoutPersistingPlaintext(t *testing.T) {
	db := &accountDeletionTestDB{functions: map[string]databases.DBResults{
		"users.user_get": {managedPasswordTargetRow(false)},
	}}
	s := &server{db: db}
	password := "ValidPass123"
	reason := "User cannot access their account"
	req := httptest.NewRequest(http.MethodPost, "/v1/users/usr_target/temporary-password", strings.NewReader(`{"temporary_password":"`+password+`","reason":"`+reason+`"}`))
	req.SetPathValue("userId", "usr_target")
	req.Header.Set("X-Actor", `{"id":"usr_admin","role":"PLATFORM_ADMIN"}`)
	rec := httptest.NewRecorder()

	s.setAdminTemporaryPassword(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if db.procedureName != `users."adminTemporaryPasswordSet"` {
		t.Fatalf("unexpected procedure %q", db.procedureName)
	}
	if len(db.procedureArgs) != 5 || db.procedureArgs[1] != "usr_admin" || db.procedureArgs[2] != "usr_target" || db.procedureArgs[4] != reason {
		t.Fatalf("expected actor, target and reason in audit procedure, got %#v", db.procedureArgs)
	}
	hash, ok := db.procedureArgs[3].(string)
	if !ok || hash == password || !verifyPassword(hash, password) {
		t.Fatal("procedure must receive a password hash, never the plaintext password")
	}
}

func TestAdminTemporaryPasswordRejectsProtectedUser(t *testing.T) {
	db := &accountDeletionTestDB{functions: map[string]databases.DBResults{
		"users.user_get": {managedPasswordTargetRow(true)},
	}}
	s := &server{db: db}
	req := httptest.NewRequest(http.MethodPost, "/v1/users/usr_target/temporary-password", strings.NewReader(`{"temporary_password":"ValidPass123","reason":"Support request"}`))
	req.SetPathValue("userId", "usr_target")
	req.Header.Set("X-Actor", `{"id":"usr_admin","role":"SUPER_ADMIN"}`)
	rec := httptest.NewRecorder()

	s.setAdminTemporaryPassword(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d: %s", rec.Code, rec.Body.String())
	}
}
