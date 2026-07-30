package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"rollfinders/internal/services/users/databases"
)

type accountDeletionTestDB struct {
	functions     map[string]databases.DBResults
	functionCalls []string
	procedureName string
	procedureArgs []interface{}
}

func (db *accountDeletionTestDB) Call(ctx context.Context, name string, params ...interface{}) (databases.DBResults, error) {
	return db.Function(ctx, name, params...)
}

func (db *accountDeletionTestDB) Function(_ context.Context, name string, _ ...interface{}) (databases.DBResults, error) {
	db.functionCalls = append(db.functionCalls, name)
	return db.functions[name], nil
}

func (db *accountDeletionTestDB) Procedure(_ context.Context, name string, params ...interface{}) (databases.RowsAffected, error) {
	db.procedureName = name
	db.procedureArgs = params
	return 1, nil
}

func (db *accountDeletionTestDB) Query(context.Context, string, ...interface{}) (databases.DBResults, error) {
	return nil, nil
}

func (db *accountDeletionTestDB) Execute(context.Context, string, ...interface{}) (databases.RowsAffected, error) {
	return 0, nil
}

func (db *accountDeletionTestDB) Close() error { return nil }
func (db *accountDeletionTestDB) Name() string { return "account-deletion-test" }

func activeDeletionRequestRow(userID string) databases.DBRow {
	now := time.Now().UTC()
	dueAt := now.AddDate(0, 1, 0)
	return databases.DBRow{
		"id":           "adr_test",
		"user_id":      userID,
		"source":       "AUTHENTICATED_DASHBOARD",
		"status":       "PENDING_PROCESSING",
		"requested_at": now,
		"verified_at":  now,
		"due_at":       dueAt,
		"created_at":   now,
		"updated_at":   now,
	}
}

func TestPublicAccountDeletionRequestDoesNotExposeUnknownEmail(t *testing.T) {
	db := &accountDeletionTestDB{functions: map[string]databases.DBResults{}}
	s := &server{db: db}
	req := httptest.NewRequest(http.MethodPost, "/v1/account-deletion-requests/email", strings.NewReader(`{"email":"unknown@example.com"}`))
	rec := httptest.NewRecorder()

	s.createEmailAccountDeletionRequest(rec, req)

	if rec.Code != http.StatusOK || strings.TrimSpace(rec.Body.String()) != `{"ok":true}` {
		t.Fatalf("expected generic success response, got %d: %s", rec.Code, rec.Body.String())
	}
	if db.procedureName != "" {
		t.Fatalf("unknown account must not create a request, called %q", db.procedureName)
	}
}

func TestSelfAccountDeletionRequestUsesAuthenticatedActor(t *testing.T) {
	db := &accountDeletionTestDB{functions: map[string]databases.DBResults{
		"users.account_deletion_request_get_active": {activeDeletionRequestRow("usr_actor")},
	}}
	s := &server{db: db}
	req := httptest.NewRequest(http.MethodPost, "/v1/account-deletion-requests/self", strings.NewReader(`{"userId":"usr_other"}`))
	req.Header.Set("X-Actor", `{"id":"usr_actor","role":"STANDARD_USER"}`)
	rec := httptest.NewRecorder()

	s.createSelfAccountDeletionRequest(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if db.procedureName != `users."accountDeletionRequestCreateAuthenticated"` {
		t.Fatalf("unexpected procedure %q", db.procedureName)
	}
	if len(db.procedureArgs) != 2 || db.procedureArgs[1] != "usr_actor" {
		t.Fatalf("expected actor identity to own request, got %#v", db.procedureArgs)
	}
	var body struct {
		Request accountDeletionRequest `json:"request"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Request.UserID != "usr_actor" {
		t.Fatalf("expected actor request, got %q", body.Request.UserID)
	}
}

func TestAccountDeletionConfirmationRejectsReusedOrInvalidToken(t *testing.T) {
	db := &accountDeletionTestDB{functions: map[string]databases.DBResults{
		"users.account_deletion_request_confirm": {},
	}}
	s := &server{db: db}
	req := httptest.NewRequest(http.MethodPost, "/v1/account-deletion-requests/confirm", strings.NewReader(`{"token":"already-used"}`))
	rec := httptest.NewRecorder()

	s.confirmAccountDeletionRequest(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "invalid or expired") {
		t.Fatalf("invalid confirmation must return the generic token error: %s", rec.Body.String())
	}
}
