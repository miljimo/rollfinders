package server

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	gatewayroutes "rollfinders/internal/core/routes"
	"rollfinders/internal/services/users/config"
	"rollfinders/internal/services/users/databases"
	"rollfinders/internal/services/users/handlers"
)

const (
	statusActive   = "ACTIVE"
	statusDisabled = "DISABLED"
)

type Options struct {
	Config config.Config
	Logger *slog.Logger
}

type server struct {
	cfg    config.Config
	db     databases.DataContext
	logger *slog.Logger
}

func New(opts Options) (http.Handler, func() error, error) {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	db, err := databases.WithCredential(context.Background(), opts.Config.DatabaseURL)
	if err != nil {
		return nil, nil, err
	}

	s := &server{cfg: opts.Config, db: db, logger: opts.Logger}
	if err := s.ensureBootstrapSuperAdmin(context.Background()); err != nil {
		return nil, nil, err
	}
	router := &handlers.Router{}
	mustHandle := func(pattern string, methods []string, handler handlers.HttpHandler, middleware ...handlers.MiddlewareFunc) {
		if len(middleware) > 0 {
			handler = handlers.WithMiddleware(handler).Apply(middleware...)
		}
		if _, err := router.Handle(pattern, methods, handler); err != nil {
			panic(err)
		}
	}

	mustHandle("/healthz", []string{http.MethodGet}, s.health)
	mustHandle("/readyz", []string{http.MethodGet}, s.ready)
	auth := s.requireAuth
	mustHandle(gatewayroutes.AuthRegister.String(), []string{http.MethodPost}, s.register, auth)
	mustHandle(gatewayroutes.AuthLogin.String(), []string{http.MethodPost}, s.login, auth)
	mustHandle(gatewayroutes.AuthLogout.String(), []string{http.MethodPost}, s.logout, auth)
	mustHandle(gatewayroutes.AuthRefresh.String(), []string{http.MethodPost}, s.refresh, auth)
	mustHandle(gatewayroutes.AuthChangePassword.String(), []string{http.MethodPost}, s.changePassword, auth)
	mustHandle(gatewayroutes.AuthForgotPassword.String(), []string{http.MethodPost}, s.requestPasswordReset, auth)
	mustHandle(gatewayroutes.AuthResetPassword.String(), []string{http.MethodPost}, s.confirmPasswordReset, auth)
	mustHandle(gatewayroutes.AuthSessions.String(), []string{http.MethodGet}, s.sessions, auth)
	mustHandle(gatewayroutes.AuthSessionsSessionId.String(), []string{http.MethodDelete}, s.revokeSession, auth)
	mustHandle(gatewayroutes.AuthMfaSetup.String(), []string{http.MethodPost}, s.mfaSetup, auth)
	mustHandle(gatewayroutes.AuthMfaVerify.String(), []string{http.MethodPost}, s.mfaVerify, auth)
	mustHandle(gatewayroutes.AuthCredentials.String(), []string{http.MethodPost}, s.authenticateCredentials, auth)
	mustHandle(gatewayroutes.AuthPasswordResetRequest.String(), []string{http.MethodPost}, s.requestPasswordReset, auth)
	mustHandle(gatewayroutes.AuthPasswordResetValidate.String(), []string{http.MethodPost}, s.validatePasswordReset, auth)
	mustHandle(gatewayroutes.AuthPasswordResetConfirm.String(), []string{http.MethodPost}, s.confirmPasswordReset, auth)
	mustHandle(gatewayroutes.AccountsAccountId.String(), []string{http.MethodGet}, s.getAccount, auth)
	mustHandle(gatewayroutes.Users.String(), []string{http.MethodGet}, s.listUsers, auth)
	mustHandle(gatewayroutes.Users.String(), []string{http.MethodPost}, s.createUser, auth)
	mustHandle(gatewayroutes.UsersUserId.String(), []string{http.MethodGet}, s.getUser, auth)
	mustHandle(gatewayroutes.UsersUserId.String(), []string{http.MethodPut}, s.updateUser, auth)
	mustHandle(gatewayroutes.UsersUserId.String(), []string{http.MethodDelete}, s.deleteUser, auth)
	mustHandle(gatewayroutes.UsersUserIdMutation.String(), []string{http.MethodPost}, s.mutateUser, auth)
	mustHandle(gatewayroutes.Organisations.String(), []string{http.MethodGet, http.MethodPost}, s.organisations, auth)
	mustHandle(gatewayroutes.OrganisationsOrganisationId.String(), []string{http.MethodGet, http.MethodPut}, s.organisation, auth)

	return s.accessLog(router), db.Close, nil
}

type userRecord struct {
	ID           string     `json:"id"`
	Name         *string    `json:"name"`
	Email        string     `json:"email"`
	Username     *string    `json:"username"`
	FirstName    string     `json:"firstName"`
	LastName     string     `json:"lastName"`
	Phone        *string    `json:"phone"`
	PasswordHash string     `json:"-"`
	Role         string     `json:"role"`
	AcademyID    *string    `json:"academyId"`
	Status       string     `json:"status"`
	Disabled     bool       `json:"disabled"`
	IsProtected  bool       `json:"isProtected"`
	EmailStatus  string     `json:"emailStatus"`
	LastLoginAt  *time.Time `json:"lastLoginAt"`
	CreatedAt    time.Time  `json:"createdAt"`
}

type actorContext struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Email     string `json:"email"`
	AcademyID string `json:"academyId"`
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second)
	defer cancel()
	if _, err := s.db.Function(ctx, "users.database_ready"); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Database is not ready.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *server) authenticateCredentials(w http.ResponseWriter, r *http.Request) {
	s.login(w, r)
}

func (s *server) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email      string `json:"email"`
		Username   string `json:"username"`
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
		DeviceID   string `json:"device_id"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	identifier := strings.ToLower(strings.TrimSpace(body.Identifier))
	if identifier == "" {
		identifier = strings.ToLower(strings.TrimSpace(body.Email))
	}
	if identifier == "" {
		identifier = strings.ToLower(strings.TrimSpace(body.Username))
	}
	if identifier == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "Missing credentials.")
		return
	}
	user, err := s.findUserByIdentifier(r.Context(), identifier)
	if err != nil {
		if errors.Is(err, errNotFound) {
			writeError(w, http.StatusUnauthorized, "Invalid email or password.")
			return
		}
		writeError(w, http.StatusInternalServerError, "Authentication failed.")
		return
	}
	if user.Disabled || user.Status == statusDisabled || user.Status == "INACTIVE" || user.Status == "SUSPENDED" || user.Status == "LOCKED" || user.Status == "DELETED" {
		writeError(w, http.StatusForbidden, "Account disabled.")
		return
	}
	if !verifyPassword(user.PasswordHash, body.Password) {
		writeError(w, http.StatusUnauthorized, "unable to verify email or password.")
		return
	}
	_, _ = s.db.Procedure(r.Context(), `users."userLastLoginTouch"`, user.ID)
	user.LastLoginAt = ptrTime(time.Now().UTC())
	tokens, err := s.issueSessionTokens(r, user.ID, strings.TrimSpace(body.DeviceID))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Authentication failed.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"user":          publicUser(user),
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"expires_in":    int(accessTokenTTL.Seconds()),
	})
}

func (s *server) getAccount(w http.ResponseWriter, r *http.Request) {
	account, err := s.findAccountByID(r.Context(), handlers.Param(r, string(gatewayroutes.ParamAccountId)))
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": map[string]any{
		"id": account.ID, "role": account.Role, "email": account.Email, "academyId": account.AcademyID, "privileges": account.Privileges,
	}})
}

func (s *server) listUsers(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	page := positiveInt(r.URL.Query().Get("page"), 1)
	pageSize := pageSize(r.URL.Query().Get("pageSize"))
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	role := validRoleOrEmpty(r.URL.Query().Get("role"))
	status := validStatusOrEmpty(r.URL.Query().Get("status"))
	emailStatus := validEmailStatusOrEmpty(r.URL.Query().Get("emailStatus"))
	rows, err := s.db.Function(r.Context(), "users.users_count", actor.ID, actor.AcademyID, search, role, status, emailStatus)
	if err != nil || len(rows) == 0 {
		writeError(w, http.StatusInternalServerError, "Unable to list users.")
		return
	}
	total := intValue(firstValue(rows[0]))
	totalPages := max(1, (total+pageSize-1)/pageSize)
	if page > totalPages {
		page = totalPages
	}
	rows, err = s.db.Function(r.Context(), "users.users_list", actor.ID, actor.AcademyID, search, role, status, emailStatus, pageSize, (page-1)*pageSize)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to list users.")
		return
	}
	users, err := scanUsers(rows)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to list users.")
		return
	}
	items := make([]map[string]any, 0, len(users))
	for _, user := range users {
		items = append(items, publicUser(user))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"users":      items,
		"page":       page,
		"pageSize":   pageSize,
		"totalItems": total,
		"totalPages": totalPages,
		"pagination": pagePagination(page, pageSize, len(items), total, totalPages),
	})
}

func (s *server) createUser(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	var body struct {
		Name      string `json:"name"`
		Email     string `json:"email"`
		Password  string `json:"password"`
		Role      string `json:"role"`
		AcademyID string `json:"academyId"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "Valid email is required.")
		return
	}
	password := body.Password
	if password == "" {
		password = "rollfinder-user"
	}
	hash, err := hashPassword(password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to create user.")
		return
	}
	id := newID()
	name := nullString(strings.TrimSpace(body.Name))
	academyID := nullString(strings.TrimSpace(body.AcademyID))
	user, err := s.insertUser(r.Context(), id, name, email, hash, academyID)
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "A user with this email already exists.")
			return
		}
		writeError(w, http.StatusInternalServerError, "Unable to create user.")
		return
	}
	_ = s.writeAuditLog(r.Context(), actor.ID, &user.ID, "USER_CREATED", map[string]any{"email": email})
	writeJSON(w, http.StatusCreated, map[string]any{"user": publicUser(user)})
}

func (s *server) getUser(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	user, err := s.findUserByID(r.Context(), handlers.Param(r, string(gatewayroutes.ParamUserId)))
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found.")
		return
	}
	if !s.canViewManagedUser(r.Context(), actor, user) {
		writeError(w, http.StatusNotFound, "User not found.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": publicUser(user)})
}

func (s *server) updateUser(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	id := handlers.Param(r, string(gatewayroutes.ParamUserId))
	target, err := s.findUserByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found.")
		return
	}
	if !s.canManageTarget(r.Context(), actor, target) {
		writeError(w, http.StatusForbidden, "Insufficient user management permissions.")
		return
	}
	var body struct{ Name, Email, Role, Status, AcademyID string }
	if !decodeJSON(w, r, &body) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "Valid email is required.")
		return
	}
	status := normalizeStatus(body.Status)
	if actor.ID == id && status == statusDisabled && !s.hasAnotherActiveSuperUser(r.Context(), id) {
		writeError(w, http.StatusBadRequest, "You cannot disable the last active super admin account.")
		return
	}
	user, err := s.updateUserRecord(r.Context(), id, nullString(strings.TrimSpace(body.Name)), email, status, nullString(strings.TrimSpace(body.AcademyID)))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to update user.")
		return
	}
	_ = s.writeAuditLog(r.Context(), actor.ID, &id, "USER_EDITED", map[string]any{"previous": publicUser(target), "next": publicUser(user)})
	writeJSON(w, http.StatusOK, map[string]any{"user": publicUser(user)})
}

func (s *server) deleteUser(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	id := handlers.Param(r, string(gatewayroutes.ParamUserId))
	if actor.ID == id {
		writeError(w, http.StatusBadRequest, "You cannot delete your own account.")
		return
	}
	target, err := s.findUserByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found.")
		return
	}
	if !s.canManageTarget(r.Context(), actor, target) {
		writeError(w, http.StatusForbidden, "Insufficient user management permissions.")
		return
	}
	if _, err := s.db.Procedure(r.Context(), `users."userDelete"`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to delete user.")
		return
	}
	_ = s.writeAuditLog(r.Context(), actor.ID, nil, "USER_DELETED", map[string]any{"email": target.Email, "deletedUserId": id})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *server) mutateUser(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.actorFromRequest(w, r)
	if !ok {
		return
	}
	id := handlers.Param(r, string(gatewayroutes.ParamUserId))
	mutation := handlers.Param(r, "mutation")
	if mutation == "promote" || mutation == "demote" {
		writeError(w, http.StatusGone, "Role assignment is managed by Authorisation Service.")
		return
	}
	if mutation != "disable" && mutation != "enable" {
		writeError(w, http.StatusNotFound, "Mutation not found.")
		return
	}
	target, err := s.findUserByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found.")
		return
	}
	if !s.canManageTarget(r.Context(), actor, target) {
		writeError(w, http.StatusForbidden, "Insufficient user management permissions.")
		return
	}
	if mutation == "demote" && actor.ID == id {
		writeError(w, http.StatusForbidden, "Super admin accounts cannot be demoted.")
		return
	}
	if mutation == "disable" && actor.ID == id && !s.hasAnotherActiveSuperUser(r.Context(), id) {
		writeError(w, http.StatusBadRequest, "You cannot disable the last active super admin account.")
		return
	}
	status, disabled := target.Status, target.Disabled
	action := "USER_ENABLED"
	switch mutation {
	case "disable":
		status, disabled, action = statusDisabled, true, "USER_DISABLED"
	case "enable":
		status, disabled = statusActive, false
	}
	user, err := s.setUserMutation(r.Context(), id, status, disabled)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Unable to update user.")
		return
	}
	_ = s.writeAuditLog(r.Context(), actor.ID, &id, action, map[string]any{"email": target.Email, "status": user.Status})
	writeJSON(w, http.StatusOK, map[string]any{"user": publicUser(user)})
}
