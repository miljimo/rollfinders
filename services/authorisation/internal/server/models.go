package server

import "time"

type Scope struct {
	OrganisationID string `json:"organisation_id,omitempty"`
	ApplicationID  string `json:"application_id,omitempty"`
	ResourceType   string `json:"resource_type,omitempty"`
	ResourceID     string `json:"resource_id,omitempty"`
}

type Permission struct {
	ID             string    `json:"id"`
	Code           string    `json:"code"`
	Name           string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	OrganisationID string    `json:"organisation_id,omitempty"`
	ApplicationID  string    `json:"application_id,omitempty"`
	ResourceID     string    `json:"resource_id,omitempty"`
	ResourceType   string    `json:"resource_type,omitempty"`
	CreatedBy      string    `json:"created_by,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Resource struct {
	ID           string    `json:"id"`
	ResourceType string    `json:"resource_type"`
	DisplayName  string    `json:"display_name,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Role struct {
	ID          string    `json:"id"`
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	Level       int       `json:"level"`
	Assignable  bool      `json:"assignable"`
	SystemRole  bool      `json:"system_role"`
	CreatedBy   string    `json:"created_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UserRoleAssignment struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	RoleID     string    `json:"role_id"`
	RoleKey    string    `json:"role_key,omitempty"`
	Scope      Scope     `json:"scope"`
	AssignedBy string    `json:"assigned_by"`
	CreatedAt  time.Time `json:"created_at"`
}

type UserPermissionAssignment struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	PermissionID   string    `json:"permission_id"`
	PermissionCode string    `json:"permission_code,omitempty"`
	Effect         string    `json:"effect"`
	Scope          Scope     `json:"scope"`
	AssignedBy     string    `json:"assigned_by"`
	CreatedAt      time.Time `json:"created_at"`
}

type authorizeRequest struct {
	SubjectID      string `json:"subjectId"`
	Permission     string `json:"permission"`
	OrganisationID string `json:"organisationId,omitempty"`
	ApplicationID  string `json:"applicationId,omitempty"`
	ResourceType   string `json:"resourceType,omitempty"`
	ResourceID     string `json:"resourceId,omitempty"`
}

type authorizeResponse struct {
	Authorized bool   `json:"authorized"`
	Decision   string `json:"decision"`
	Reason     string `json:"reason,omitempty"`
}
