package server

import (
	"context"
	"database/sql"
	"encoding/json"
)

func (r *repository) audit(ctx context.Context, actorID, action, targetUserID, roleID, permissionID string, scope Scope, previousValue, newValue any, requestID string) error {
	previousJSON, _ := json.Marshal(previousValue)
	newJSON, _ := json.Marshal(newValue)
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO authorisation_audit_events (
			id, actor_user_id, target_user_id, action, role_id, permission_id,
			organisation_id, application_id, resource_type, resource_id,
			previous_value, new_value, request_id
		)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, NULLIF($5, ''), NULLIF($6, ''),
			NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''),
			$11, $12, NULLIF($13, ''))`,
		newID("audit"), actorID, targetUserID, action, roleID, permissionID,
		scope.OrganisationID, scope.ApplicationID, scope.ResourceType, scope.ResourceID,
		sql.NullString{String: string(previousJSON), Valid: previousValue != nil},
		sql.NullString{String: string(newJSON), Valid: newValue != nil},
		requestID)
	return err
}
