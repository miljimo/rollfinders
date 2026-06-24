package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"

	"rollfinders/internal/services/users/databases"
	"rollfinders/internal/services/users/handlers"
)

var errNotFound = errors.New("not found")

func (s *server) requireAuth(next handlers.HttpHandler) handlers.HttpHandler {
	return func(w http.ResponseWriter, r *http.Request) {
		next(w, r)
	}
}

func (s *server) accessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		s.logger.Info("request handled", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

type accountRecord struct {
	ID         string
	Email      string
	Role       string
	AcademyID  *string
	Privileges []string
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	handlers.WriteJSON(w, status, body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	if err := handlers.Json(r, target); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON body.")
		return false
	}
	return true
}

func (s *server) actorFromRequest(w http.ResponseWriter, r *http.Request) (actorContext, bool) {
	var actor actorContext
	raw := r.Header.Get("X-Actor")
	if raw == "" || json.Unmarshal([]byte(raw), &actor) != nil || actor.ID == "" {
		writeError(w, http.StatusForbidden, "Admin actor context is required.")
		return actor, false
	}
	return actor, true
}

func scanUser(row map[string]interface{}) (userRecord, error) {
	return userRecord{
		ID:           stringValue(row["id"]),
		Name:         stringPtrValue(row["name"]),
		Email:        stringValue(row["email"]),
		Username:     stringPtrValue(row["username"]),
		FirstName:    stringValue(row["first_name"]),
		LastName:     stringValue(row["last_name"]),
		Phone:        stringPtrValue(row["phone"]),
		PasswordHash: stringValue(row["password_hash"]),
		Role:         stringValue(row["role"]),
		AcademyID:    stringPtrValue(row["academy_id"]),
		Status:       stringValue(row["status"]),
		Disabled:     boolValue(row["disabled"]),
		IsProtected:  boolValue(row["is_protected"]),
		EmailStatus:  stringValue(row["email_status"]),
		LastLoginAt:  timePtrValue(row["last_login_at"]),
		CreatedAt:    timeValue(row["created_at"]),
	}, nil
}

func scanUsers(rows databases.DBResults) ([]userRecord, error) {
	users := make([]userRecord, 0, len(rows))
	for _, row := range rows {
		user, err := scanUser(row)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

func (s *server) findUserByEmail(ctx context.Context, email string) (userRecord, error) {
	rows, err := s.db.Function(ctx, "users.user_get_by_email", email)
	if err != nil {
		return userRecord{}, err
	}
	if len(rows) == 0 {
		return userRecord{}, errNotFound
	}
	return scanUser(rows[0])
}

func (s *server) findUserByIdentifier(ctx context.Context, identifier string) (userRecord, error) {
	rows, err := s.db.Function(ctx, "users.user_get_by_identifier", identifier)
	if err != nil {
		return userRecord{}, err
	}
	if len(rows) == 0 {
		return userRecord{}, errNotFound
	}
	return scanUser(rows[0])
}

func (s *server) findUserByID(ctx context.Context, id string) (userRecord, error) {
	rows, err := s.db.Function(ctx, "users.user_get", id)
	if err != nil {
		return userRecord{}, err
	}
	if len(rows) == 0 {
		return userRecord{}, errNotFound
	}
	return scanUser(rows[0])
}

func (s *server) findAccountByID(ctx context.Context, id string) (accountRecord, error) {
	rows, err := s.db.Function(ctx, "users.user_account_get", id)
	if err != nil {
		return accountRecord{}, err
	}
	if len(rows) == 0 {
		return accountRecord{}, errNotFound
	}
	account := accountRecord{
		ID:        stringValue(rows[0]["id"]),
		Email:     stringValue(rows[0]["email"]),
		Role:      stringValue(rows[0]["role"]),
		AcademyID: stringPtrValue(rows[0]["academy_id"]),
	}
	account.Privileges = []string{}
	return account, nil
}

func (s *server) insertUser(ctx context.Context, id string, name *string, email, passwordHash string, academyID *string) (userRecord, error) {
	if _, err := s.db.Procedure(ctx, `users."userInsert"`, id, name, email, passwordHash, academyID); err != nil {
		return userRecord{}, err
	}
	return s.findUserByID(ctx, id)
}

func (s *server) updateUserRecord(ctx context.Context, id string, name *string, email, status string, academyID *string) (userRecord, error) {
	if _, err := s.db.Procedure(ctx, `users."userUpdate"`, id, name, email, status, academyID); err != nil {
		return userRecord{}, err
	}
	return s.findUserByID(ctx, id)
}

func (s *server) setUserMutation(ctx context.Context, id, status string, disabled bool) (userRecord, error) {
	if _, err := s.db.Procedure(ctx, `users."userMutationSet"`, id, status, disabled); err != nil {
		return userRecord{}, err
	}
	return s.findUserByID(ctx, id)
}

func (s *server) hasAnotherActiveSuperUser(ctx context.Context, id string) bool {
	rows, err := s.db.Function(ctx, "users.active_super_user_exists", id)
	return err == nil && len(rows) > 0 && boolValue(firstValue(rows[0]))
}

func (s *server) writeAuditLog(ctx context.Context, actorID string, targetID *string, action string, metadata map[string]any) error {
	raw, _ := json.Marshal(metadata)
	_, err := s.db.Procedure(ctx, `users."adminAuditLogInsert"`, newID(), actorID, targetID, action, raw)
	return err
}

func publicUser(user userRecord) map[string]any {
	return map[string]any{
		"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role, "academyId": user.AcademyID,
		"username": user.Username, "firstName": user.FirstName, "lastName": user.LastName, "phone": user.Phone,
		"status": user.Status, "disabled": user.Disabled, "isProtected": user.IsProtected, "emailStatus": user.EmailStatus,
		"lastLoginAt": user.LastLoginAt, "createdAt": user.CreatedAt,
	}
}

func (s *server) canViewManagedUser(ctx context.Context, actor actorContext, target userRecord) bool {
	return true
}

func (s *server) canManageTarget(ctx context.Context, actor actorContext, target userRecord) bool {
	if actor.ID == target.ID {
		return false
	}
	return true
}

func normalizeStatus(status string) string {
	if status == statusDisabled {
		return statusDisabled
	}
	return statusActive
}

func validRole(role string) bool {
	return strings.TrimSpace(role) != ""
}

func validRoleOrEmpty(role string) string {
	if validRole(role) {
		return role
	}
	return ""
}

func validStatusOrEmpty(status string) string {
	if status == statusActive || status == statusDisabled {
		return status
	}
	return ""
}

func validEmailStatusOrEmpty(status string) string {
	if status == "VALID" || status == "INVALID" || status == "PENDING_VERIFICATION" {
		return status
	}
	return ""
}

func isUniqueViolation(err error) bool {
	if pqErr, ok := err.(*pq.Error); ok {
		return pqErr.Code == "23505"
	}
	return false
}

func stringValue(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case []byte:
		return string(v)
	default:
		return ""
	}
}

func stringPtrValue(value interface{}) *string {
	result := stringValue(value)
	if result == "" {
		return nil
	}
	return &result
}

func boolValue(value interface{}) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		return v == "true" || v == "t" || v == "1"
	default:
		return false
	}
}

func firstValue(row map[string]interface{}) interface{} {
	for _, value := range row {
		return value
	}
	return nil
}

func intValue(value interface{}) int {
	switch v := value.(type) {
	case int:
		return v
	case int64:
		return int(v)
	case int32:
		return int(v)
	case string:
		parsed, _ := strconv.Atoi(v)
		return parsed
	default:
		return 0
	}
}

func timeValue(value interface{}) time.Time {
	if result := timePtrValue(value); result != nil {
		return *result
	}
	return time.Time{}
}

func timePtrValue(value interface{}) *time.Time {
	switch v := value.(type) {
	case time.Time:
		return &v
	case string:
		parsed, err := time.Parse(time.RFC3339, v)
		if err == nil {
			return &parsed
		}
	}
	return nil
}

func positiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func pageSize(value string) int {
	parsed := positiveInt(value, 10)
	if parsed == 10 || parsed == 20 || parsed == 50 || parsed == 100 {
		return parsed
	}
	return 10
}

func nullString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func ptrTime(value time.Time) *time.Time { return &value }

func newID() string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "usr_fallback"
	}
	return "usr_" + hex.EncodeToString(bytes[:])
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
