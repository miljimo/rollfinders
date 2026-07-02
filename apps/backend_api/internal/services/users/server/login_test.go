package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"rollfinders/internal/services/users/config"
	"rollfinders/internal/services/users/databases"
)

type loginTestDB struct {
	user userRecord
}

func (db *loginTestDB) Call(ctx context.Context, procName string, params ...interface{}) (databases.DBResults, error) {
	return db.Function(ctx, procName, params...)
}

func (db *loginTestDB) Function(_ context.Context, functionName string, _ ...interface{}) (databases.DBResults, error) {
	if functionName != "users.user_get_by_identifier" {
		return databases.DBResults{}, nil
	}
	return databases.DBResults{{
		"id":            db.user.ID,
		"name":          db.user.Name,
		"email":         db.user.Email,
		"username":      db.user.Username,
		"first_name":    db.user.FirstName,
		"last_name":     db.user.LastName,
		"phone":         db.user.Phone,
		"password_hash": db.user.PasswordHash,
		"role":          db.user.Role,
		"academy_id":    db.user.AcademyID,
		"status":        db.user.Status,
		"disabled":      db.user.Disabled,
		"is_protected":  db.user.IsProtected,
		"email_status":  db.user.EmailStatus,
		"last_login_at": db.user.LastLoginAt,
		"created_at":    db.user.CreatedAt,
	}}, nil
}

func (db *loginTestDB) Procedure(context.Context, string, ...interface{}) (databases.RowsAffected, error) {
	return 1, nil
}

func (db *loginTestDB) Query(context.Context, string, ...interface{}) (databases.DBResults, error) {
	return databases.DBResults{}, nil
}

func (db *loginTestDB) Execute(context.Context, string, ...interface{}) (databases.RowsAffected, error) {
	return 0, nil
}

func (db *loginTestDB) Close() error { return nil }

func (db *loginTestDB) Name() string { return "login-test" }

func TestLoginReturnsTokenEnvelopeWithoutPersonalUserInformation(t *testing.T) {
	passwordHash, err := hashPassword("admin")
	if err != nil {
		t.Fatal(err)
	}
	displayName := "RollFinder Admin"
	s := &server{
		cfg: config.Config{JWTSecret: "test-secret"},
		db: &loginTestDB{user: userRecord{
			ID:           "usr_test",
			Name:         &displayName,
			Email:        "webmaster@rollfinders.com",
			FirstName:    "RollFinder",
			LastName:     "Admin",
			PasswordHash: passwordHash,
			Role:         "SUPER_ADMIN",
			Status:       statusActive,
			EmailStatus:  "VALID",
			CreatedAt:    time.Date(2026, 7, 2, 12, 0, 0, 0, time.UTC),
		}},
	}

	req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{"identifier":"webmaster@rollfinders.com","password":"admin"}`))
	rec := httptest.NewRecorder()

	s.login(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["user_id"] != "usr_test" {
		t.Fatalf("expected user_id to be returned, got %#v", body["user_id"])
	}
	if _, ok := body["user"]; ok {
		t.Fatal("login response must not include a user object")
	}
	for _, field := range []string{"email", "name", "firstName", "lastName", "role", "phone"} {
		if _, ok := body[field]; ok {
			t.Fatalf("login response must not include personal field %q", field)
		}
	}
}
