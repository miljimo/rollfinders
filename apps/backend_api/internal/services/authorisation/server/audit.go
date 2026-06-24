package server

import (
	"context"
	"encoding/json"
)

func (r *repository) audit(ctx context.Context, actorID, action, targetUserID, roleID, permissionID string, scope Scope, previousValue, newValue any, requestID string) error {
	if err := r.ensureResource(ctx, scope); err != nil {
		return err
	}
	previousJSON, _ := json.Marshal(previousValue)
	newJSON, _ := json.Marshal(newValue)
	_, err := r.db.ExecContext(ctx, `SELECT audit_event_insert($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		newID("audit"), actorID, targetUserID, action, roleID, permissionID,
		scope.OrganisationID, scope.ApplicationID, scope.ResourceID,
		nullableJSON(previousJSON, previousValue != nil),
		nullableJSON(newJSON, newValue != nil),
		requestID)
	return err
}

func nullableJSON(value []byte, valid bool) any {
	if !valid {
		return nil
	}
	return string(value)
}
