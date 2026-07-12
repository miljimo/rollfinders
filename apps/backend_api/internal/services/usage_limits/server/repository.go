package server

import (
	"context"
	"database/sql"
	"errors"
	"net/url"

	_ "github.com/lib/pq"
)

type repository struct {
	db *sql.DB
}

func openRepository(ctx context.Context, databaseURL string) (*repository, error) {
	db, err := sql.Open("postgres", usageLimitsSchemaURL(databaseURL))
	if err != nil {
		return nil, err
	}
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &repository{db: db}, nil
}

func usageLimitsSchemaURL(databaseURL string) string {
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		return databaseURL
	}
	query := parsed.Query()
	query.Set("options", "-c search_path=usage_limits,public")
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func (r *repository) close() error {
	return r.db.Close()
}

func (r *repository) ping(ctx context.Context) error {
	return r.db.PingContext(ctx)
}

func (r *repository) check(ctx context.Context, req usageRequest) (usageDecision, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return usageDecision{}, err
	}
	defer rollbackUnlessDone(tx)
	decision, err := r.decision(ctx, tx, req)
	if err != nil {
		return usageDecision{}, err
	}
	if err := r.audit(ctx, tx, req, decision); err != nil {
		return usageDecision{}, err
	}
	return decision, tx.Commit()
}

func (r *repository) reserve(ctx context.Context, req usageRequest) (usageDecision, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return usageDecision{}, err
	}
	defer rollbackUnlessDone(tx)

	existing, err := r.reservationByIdempotency(ctx, tx, req.IdempotencyKey)
	if err != nil {
		return usageDecision{}, err
	}
	if existing != nil {
		decision, err := r.decision(ctx, tx, existing.usageRequest)
		if err != nil {
			return usageDecision{}, err
		}
		decision.Allowed = existing.Status == "reserved" || existing.Status == "confirmed"
		decision.ReservationID = existing.ID
		decision.Decision = mapAllowed(decision.Allowed)
		return decision, tx.Commit()
	}

	decision, err := r.decision(ctx, tx, req)
	if err != nil {
		return usageDecision{}, err
	}
	if !decision.Allowed {
		if err := r.audit(ctx, tx, req, decision); err != nil {
			return usageDecision{}, err
		}
		return decision, tx.Commit()
	}

	var reservationID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO usage_reservations (
			idempotency_key, owner_type, owner_id, subscription_plan_id, resource_type,
			action_key, amount, status, period_type, period_start, period_end
		) VALUES ($1,$2,$3,$4,$5,$6,$7,'reserved',$8,$9,$10)
		RETURNING id`,
		req.IdempotencyKey, req.OwnerType, req.OwnerID, nullString(req.SubscriptionPlanID), req.ResourceType,
		req.ActionKey, req.Amount, req.PeriodType, req.PeriodStart, req.PeriodEnd,
	).Scan(&reservationID)
	if err != nil {
		return usageDecision{}, err
	}
	decision.ReservationID = reservationID
	decision.Reserved += req.Amount
	if decision.Limit != nil {
		remaining := *decision.Limit - decision.Used - decision.Reserved
		if remaining < 0 {
			remaining = 0
		}
		decision.Remaining = &remaining
	}
	if err := r.audit(ctx, tx, req, decision); err != nil {
		return usageDecision{}, err
	}
	return decision, tx.Commit()
}

func (r *repository) confirm(ctx context.Context, reservationID string) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer rollbackUnlessDone(tx)
	reservation, err := r.reservationByID(ctx, tx, reservationID)
	if err != nil {
		return err
	}
	if reservation == nil {
		return errors.New("reservation not found")
	}
	if reservation.Status == "confirmed" {
		return tx.Commit()
	}
	if reservation.Status != "reserved" {
		return errors.New("reservation is not reserved")
	}
	if err := r.ensureCounter(ctx, tx, reservation.usageRequest); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE usage_counters
		SET used_count = used_count + $1, updated_at = now()
		WHERE owner_type = $2 AND owner_id = $3 AND resource_type = $4 AND action_key = $5
		  AND period_type = $6
		  AND (($7::timestamptz IS NULL AND period_start IS NULL) OR period_start = $7)
		  AND (($8::timestamptz IS NULL AND period_end IS NULL) OR period_end = $8)`,
		reservation.Amount, reservation.OwnerType, reservation.OwnerID, reservation.ResourceType, reservation.ActionKey,
		reservation.PeriodType, reservation.PeriodStart, reservation.PeriodEnd,
	); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE usage_reservations SET status = 'confirmed', confirmed_at = now() WHERE id = $1`, reservationID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *repository) release(ctx context.Context, reservationID string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE usage_reservations SET status = 'released', released_at = now() WHERE id = $1 AND status = 'reserved'`, reservationID)
	return err
}

func (r *repository) adjust(ctx context.Context, req usageRequest, direction int) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer rollbackUnlessDone(tx)
	if err := r.ensureCounter(ctx, tx, req); err != nil {
		return err
	}
	delta := req.Amount * direction
	if _, err := tx.ExecContext(ctx, `
		UPDATE usage_counters
		SET used_count = GREATEST(used_count + $1, 0), updated_at = now()
		WHERE owner_type = $2 AND owner_id = $3 AND resource_type = $4 AND action_key = $5
		  AND period_type = $6
		  AND (($7::timestamptz IS NULL AND period_start IS NULL) OR period_start = $7)
		  AND (($8::timestamptz IS NULL AND period_end IS NULL) OR period_end = $8)`,
		delta, req.OwnerType, req.OwnerID, req.ResourceType, req.ActionKey, req.PeriodType, req.PeriodStart, req.PeriodEnd,
	); err != nil {
		return err
	}
	decision := usageDecision{Allowed: true, Decision: "allow", PeriodType: req.PeriodType}
	return r.audit(ctx, tx, req, decision)
}

func (r *repository) decision(ctx context.Context, tx *sql.Tx, req usageRequest) (usageDecision, error) {
	limit, err := r.effectiveLimit(ctx, tx, req)
	if err != nil {
		return usageDecision{}, err
	}
	used, err := r.usedCount(ctx, tx, req)
	if err != nil {
		return usageDecision{}, err
	}
	reserved, err := r.reservedCount(ctx, tx, req)
	if err != nil {
		return usageDecision{}, err
	}
	decision := usageDecision{
		Allowed:    true,
		Decision:   "allow",
		Limit:      limit,
		Used:       used,
		Reserved:   reserved,
		PeriodType: req.PeriodType,
	}
	if limit != nil {
		remaining := *limit - used - reserved
		if remaining < 0 {
			remaining = 0
		}
		decision.Remaining = &remaining
		if used+reserved+req.Amount > *limit {
			decision.Allowed = false
			decision.Decision = "deny"
			decision.Reason = "USAGE_LIMIT_EXCEEDED"
		}
	}
	return decision, nil
}

func (r *repository) effectiveLimit(ctx context.Context, tx *sql.Tx, req usageRequest) (*int, error) {
	var override sql.NullInt64
	err := tx.QueryRowContext(ctx, `
		SELECT limit_value
		FROM usage_limit_overrides
		WHERE owner_type = $1 AND owner_id = $2 AND resource_type = $3 AND action_key = $4
		  AND period_type = $5 AND is_active = true AND starts_at <= now()
		  AND (ends_at IS NULL OR ends_at > now())
		ORDER BY created_at DESC
		LIMIT 1`,
		req.OwnerType, req.OwnerID, req.ResourceType, req.ActionKey, req.PeriodType,
	).Scan(&override)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		if override.Valid {
			value := int(override.Int64)
			return &value, nil
		}
		return nil, nil
	}
	if req.SubscriptionPlanID == "" {
		return nil, nil
	}
	var rule sql.NullInt64
	err = tx.QueryRowContext(ctx, `
		SELECT limit_value
		FROM usage_limit_rules
		WHERE subscription_plan_id = $1 AND owner_type = $2 AND resource_type = $3
		  AND action_key = $4 AND period_type = $5 AND is_active = true
		LIMIT 1`,
		req.SubscriptionPlanID, req.OwnerType, req.ResourceType, req.ActionKey, req.PeriodType,
	).Scan(&rule)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !rule.Valid {
		return nil, nil
	}
	value := int(rule.Int64)
	return &value, nil
}

func (r *repository) usedCount(ctx context.Context, tx *sql.Tx, req usageRequest) (int, error) {
	var used sql.NullInt64
	err := tx.QueryRowContext(ctx, `
		SELECT used_count FROM usage_counters
		WHERE owner_type = $1 AND owner_id = $2 AND resource_type = $3 AND action_key = $4
		  AND period_type = $5
		  AND (($6::timestamptz IS NULL AND period_start IS NULL) OR period_start = $6)
		  AND (($7::timestamptz IS NULL AND period_end IS NULL) OR period_end = $7)`,
		req.OwnerType, req.OwnerID, req.ResourceType, req.ActionKey, req.PeriodType, req.PeriodStart, req.PeriodEnd,
	).Scan(&used)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return int(used.Int64), nil
}

func (r *repository) reservedCount(ctx context.Context, tx *sql.Tx, req usageRequest) (int, error) {
	var reserved sql.NullInt64
	err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount), 0) FROM usage_reservations
		WHERE owner_type = $1 AND owner_id = $2 AND resource_type = $3 AND action_key = $4
		  AND period_type = $5 AND status = 'reserved'
		  AND (($6::timestamptz IS NULL AND period_start IS NULL) OR period_start = $6)
		  AND (($7::timestamptz IS NULL AND period_end IS NULL) OR period_end = $7)`,
		req.OwnerType, req.OwnerID, req.ResourceType, req.ActionKey, req.PeriodType, req.PeriodStart, req.PeriodEnd,
	).Scan(&reserved)
	if err != nil {
		return 0, err
	}
	return int(reserved.Int64), nil
}

func (r *repository) ensureCounter(ctx context.Context, tx *sql.Tx, req usageRequest) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO usage_counters (owner_type, owner_id, resource_type, action_key, period_type, period_start, period_end)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT DO NOTHING`,
		req.OwnerType, req.OwnerID, req.ResourceType, req.ActionKey, req.PeriodType, req.PeriodStart, req.PeriodEnd,
	)
	return err
}

func (r *repository) reservationByIdempotency(ctx context.Context, tx *sql.Tx, key string) (*reservationRecord, error) {
	return r.reservation(ctx, tx, `idempotency_key = $1`, key)
}

func (r *repository) reservationByID(ctx context.Context, tx *sql.Tx, id string) (*reservationRecord, error) {
	return r.reservation(ctx, tx, `id = $1`, id)
}

func (r *repository) reservation(ctx context.Context, tx *sql.Tx, predicate string, value string) (*reservationRecord, error) {
	row := tx.QueryRowContext(ctx, `
		SELECT id, idempotency_key, owner_type, owner_id, COALESCE(subscription_plan_id, ''),
		       resource_type, action_key, amount, status, period_type, period_start, period_end
		FROM usage_reservations WHERE `+predicate+` LIMIT 1`, value)
	var rec reservationRecord
	err := row.Scan(&rec.ID, &rec.IdempotencyKey, &rec.OwnerType, &rec.OwnerID, &rec.SubscriptionPlanID,
		&rec.ResourceType, &rec.ActionKey, &rec.Amount, &rec.Status, &rec.PeriodType, &rec.PeriodStart, &rec.PeriodEnd)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *repository) audit(ctx context.Context, tx *sql.Tx, req usageRequest, decision usageDecision) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO usage_audit_events (
			owner_type, owner_id, subscription_plan_id, resource_type, action_key,
			decision, reason, limit_value, used_count, reserved_count, amount
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		req.OwnerType, req.OwnerID, nullString(req.SubscriptionPlanID), req.ResourceType, req.ActionKey,
		decision.Decision, nullString(decision.Reason), decision.Limit, decision.Used, decision.Reserved, req.Amount,
	)
	return err
}

func (r *repository) ownerSummary(ctx context.Context, ownerType string, ownerID string) (ownerSummary, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT c.resource_type, c.action_key, c.period_type, c.period_start, c.period_end, c.used_count,
		       COALESCE(SUM(CASE WHEN res.status = 'reserved' THEN res.amount ELSE 0 END), 0)::int
		FROM usage_counters c
		LEFT JOIN usage_reservations res
		  ON res.owner_type = c.owner_type AND res.owner_id = c.owner_id
		 AND res.resource_type = c.resource_type AND res.action_key = c.action_key
		 AND res.period_type = c.period_type
		 AND ((res.period_start IS NULL AND c.period_start IS NULL) OR res.period_start = c.period_start)
		 AND ((res.period_end IS NULL AND c.period_end IS NULL) OR res.period_end = c.period_end)
		WHERE c.owner_type = $1 AND c.owner_id = $2
		GROUP BY c.resource_type, c.action_key, c.period_type, c.period_start, c.period_end, c.used_count
		ORDER BY c.resource_type, c.action_key`, ownerType, ownerID)
	if err != nil {
		return ownerSummary{}, err
	}
	defer rows.Close()
	summary := ownerSummary{OwnerType: ownerType, OwnerID: ownerID, Items: []summaryItem{}, Audit: []auditEvent{}}
	for rows.Next() {
		var item summaryItem
		if err := rows.Scan(&item.ResourceType, &item.ActionKey, &item.PeriodType, &item.PeriodStart, &item.PeriodEnd, &item.Used, &item.Reserved); err != nil {
			return ownerSummary{}, err
		}
		summary.Items = append(summary.Items, item)
	}
	auditRows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(subscription_plan_id, ''), resource_type, action_key, decision, COALESCE(reason, ''),
		       limit_value, used_count, reserved_count, amount, created_at
		FROM usage_audit_events
		WHERE owner_type = $1 AND owner_id = $2
		ORDER BY created_at DESC
		LIMIT 25`, ownerType, ownerID)
	if err != nil {
		return ownerSummary{}, err
	}
	defer auditRows.Close()
	for auditRows.Next() {
		var event auditEvent
		if err := auditRows.Scan(&event.ID, &event.SubscriptionPlanID, &event.ResourceType, &event.ActionKey, &event.Decision,
			&event.Reason, &event.Limit, &event.Used, &event.Reserved, &event.Amount, &event.CreatedAt); err != nil {
			return ownerSummary{}, err
		}
		summary.Audit = append(summary.Audit, event)
	}
	return summary, nil
}

func rollbackUnlessDone(tx *sql.Tx) {
	_ = tx.Rollback()
}

func nullString(value string) sql.NullString {
	if value == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}

func mapAllowed(allowed bool) string {
	if allowed {
		return "allow"
	}
	return "deny"
}
