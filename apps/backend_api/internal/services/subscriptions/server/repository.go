package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

var (
	errNotFound  = errors.New("not found")
	errConflict  = errors.New("conflict")
	errInvalid   = errors.New("invalid")
	errDuplicate = errors.New("duplicate")
)

type repository struct {
	db *sql.DB
}

type Product struct {
	Key            string    `json:"key"`
	ServiceKey     string    `json:"service_key"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	Status         string    `json:"status"`
	PlanSelectable bool      `json:"plan_selectable"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ProductFeature struct {
	Key            string          `json:"key"`
	ProductKey     string          `json:"product_key"`
	ServiceKey     string          `json:"service_key,omitempty"`
	Name           string          `json:"name"`
	Description    string          `json:"description"`
	Status         string          `json:"status"`
	PlanSelectable bool            `json:"plan_selectable"`
	LimitMetadata  json.RawMessage `json:"limit_metadata,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type Plan struct {
	Key                 string        `json:"key"`
	Name                string        `json:"name"`
	Description         string        `json:"description"`
	Status              string        `json:"status"`
	Currency            string        `json:"currency"`
	PriceMinor          int           `json:"price_minor"`
	BillingCycle        string        `json:"billing_cycle"`
	CreatedAt           time.Time     `json:"created_at"`
	UpdatedAt           time.Time     `json:"updated_at"`
	Features            []PlanFeature `json:"features,omitempty"`
	IncludedFeatureKeys []string      `json:"included_feature_keys,omitempty"`
}

type PlanFeature struct {
	PlanKey    string          `json:"plan_key"`
	FeatureKey string          `json:"feature_key"`
	ProductKey string          `json:"product_key,omitempty"`
	ServiceKey string          `json:"service_key,omitempty"`
	Limits     json.RawMessage `json:"limits,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

type Subscription struct {
	ID             string     `json:"id"`
	OrganisationID string     `json:"organisation_id"`
	ApplicationID  string     `json:"application_id"`
	PlanKey        string     `json:"plan_key"`
	Status         string     `json:"status"`
	BillingStart   time.Time  `json:"billing_period_start"`
	BillingEnd     time.Time  `json:"billing_period_end"`
	TrialStart     *time.Time `json:"trial_start,omitempty"`
	TrialEnd       *time.Time `json:"trial_end,omitempty"`
	CancelAt       *time.Time `json:"cancel_at,omitempty"`
	CancelledAt    *time.Time `json:"cancelled_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func openRepository(ctx context.Context, databaseURL string) (*repository, error) {
	db, err := sql.Open("postgres", subscriptionsSchemaURL(databaseURL))
	if err != nil {
		return nil, err
	}
	db.SetMaxIdleConns(3)
	db.SetMaxOpenConns(5)
	pingCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &repository{db: db}, nil
}

func subscriptionsSchemaURL(databaseURL string) string {
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		return databaseURL
	}
	query := parsed.Query()
	if query.Get("options") == "" {
		query.Set("options", "-c search_path=subscriptions,public")
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func (r *repository) ready(ctx context.Context) error {
	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return r.db.PingContext(pingCtx)
}

func activeStatus(status string) string {
	status = strings.ToUpper(strings.TrimSpace(status))
	if status == "" {
		return "ACTIVE"
	}
	return status
}

func scanProduct(row interface{ Scan(...any) error }) (Product, error) {
	var product Product
	err := row.Scan(&product.Key, &product.ServiceKey, &product.Name, &product.Description, &product.Status, &product.PlanSelectable, &product.CreatedAt, &product.UpdatedAt)
	return product, err
}

func (r *repository) listProducts(ctx context.Context, limit, offset int, status string) ([]Product, error) {
	query := `SELECT key, service_key, name, description, status, plan_selectable, created_at, updated_at FROM products`
	args := []any{}
	if status != "" {
		args = append(args, strings.ToUpper(status))
		query += ` WHERE status = $1`
	}
	args = append(args, limit, offset)
	query += ` ORDER BY name ASC LIMIT LEAST(GREATEST($` + itoa(len(args)-1) + `, 1), 100) OFFSET GREATEST($` + itoa(len(args)) + `, 0)`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	products := []Product{}
	for rows.Next() {
		product, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, product)
	}
	return products, rows.Err()
}

func (r *repository) upsertProduct(ctx context.Context, product Product) (Product, error) {
	product.Status = activeStatus(product.Status)
	if product.Key == "" || product.ServiceKey == "" || product.Name == "" {
		return Product{}, errInvalid
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO products (key, service_key, name, description, status, plan_selectable)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (key) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			plan_selectable = EXCLUDED.plan_selectable,
			updated_at = now()
		RETURNING key, service_key, name, description, status, plan_selectable, created_at, updated_at
	`, product.Key, product.ServiceKey, product.Name, product.Description, product.Status, product.PlanSelectable)
	return scanProduct(row)
}

func (r *repository) getProduct(ctx context.Context, key string) (Product, error) {
	product, err := scanProduct(r.db.QueryRowContext(ctx, `SELECT key, service_key, name, description, status, plan_selectable, created_at, updated_at FROM products WHERE key = $1`, key))
	if errors.Is(err, sql.ErrNoRows) {
		return Product{}, errNotFound
	}
	return product, err
}

func scanFeature(row interface{ Scan(...any) error }) (ProductFeature, error) {
	var feature ProductFeature
	err := row.Scan(&feature.Key, &feature.ProductKey, &feature.ServiceKey, &feature.Name, &feature.Description, &feature.Status, &feature.PlanSelectable, &feature.LimitMetadata, &feature.CreatedAt, &feature.UpdatedAt)
	return feature, err
}

func (r *repository) listFeatures(ctx context.Context, limit, offset int, productKey string) ([]ProductFeature, error) {
	query := `SELECT f.key, f.product_key, p.service_key, f.name, f.description, f.status, f.plan_selectable, f.limit_metadata, f.created_at, f.updated_at FROM product_features f JOIN products p ON p.key = f.product_key`
	args := []any{}
	if productKey != "" {
		args = append(args, productKey)
		query += ` WHERE f.product_key = $1`
	}
	args = append(args, limit, offset)
	query += ` ORDER BY f.product_key ASC, f.name ASC LIMIT LEAST(GREATEST($` + itoa(len(args)-1) + `, 1), 100) OFFSET GREATEST($` + itoa(len(args)) + `, 0)`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	features := []ProductFeature{}
	for rows.Next() {
		feature, err := scanFeature(rows)
		if err != nil {
			return nil, err
		}
		features = append(features, feature)
	}
	return features, rows.Err()
}

func (r *repository) upsertFeature(ctx context.Context, feature ProductFeature) (ProductFeature, error) {
	feature.Status = activeStatus(feature.Status)
	if feature.Key == "" || feature.ProductKey == "" || feature.Name == "" {
		return ProductFeature{}, errInvalid
	}
	if len(feature.LimitMetadata) == 0 {
		feature.LimitMetadata = json.RawMessage(`{}`)
	}
	row := r.db.QueryRowContext(ctx, `
		WITH upserted AS (
			INSERT INTO product_features (key, product_key, name, description, status, plan_selectable, limit_metadata)
			SELECT $1, $2, $3, $4, $5, $6, $7::jsonb
			WHERE EXISTS (SELECT 1 FROM products WHERE key = $2 AND status = 'ACTIVE')
			ON CONFLICT (key) DO UPDATE SET
				name = EXCLUDED.name,
				description = EXCLUDED.description,
				status = EXCLUDED.status,
				plan_selectable = EXCLUDED.plan_selectable,
				limit_metadata = EXCLUDED.limit_metadata,
				updated_at = now()
			RETURNING key, product_key, name, description, status, plan_selectable, limit_metadata, created_at, updated_at
		)
		SELECT u.key, u.product_key, p.service_key, u.name, u.description, u.status, u.plan_selectable, u.limit_metadata, u.created_at, u.updated_at
		FROM upserted u
		JOIN products p ON p.key = u.product_key
	`, feature.Key, feature.ProductKey, feature.Name, feature.Description, feature.Status, feature.PlanSelectable, []byte(feature.LimitMetadata))
	result, err := scanFeature(row)
	if errors.Is(err, sql.ErrNoRows) {
		return ProductFeature{}, errInvalid
	}
	return result, err
}

func (r *repository) getFeature(ctx context.Context, key string) (ProductFeature, error) {
	feature, err := scanFeature(r.db.QueryRowContext(ctx, `
		SELECT f.key, f.product_key, p.service_key, f.name, f.description, f.status, f.plan_selectable, f.limit_metadata, f.created_at, f.updated_at
		FROM product_features f JOIN products p ON p.key = f.product_key
		WHERE f.key = $1
	`, key))
	if errors.Is(err, sql.ErrNoRows) {
		return ProductFeature{}, errNotFound
	}
	return feature, err
}

func scanPlan(row interface{ Scan(...any) error }) (Plan, error) {
	var plan Plan
	err := row.Scan(&plan.Key, &plan.Name, &plan.Description, &plan.Status, &plan.Currency, &plan.PriceMinor, &plan.BillingCycle, &plan.CreatedAt, &plan.UpdatedAt)
	return plan, err
}

func (r *repository) listPlans(ctx context.Context, limit, offset int) ([]Plan, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT key, name, description, status, currency, price_minor, billing_cycle, created_at, updated_at FROM plans ORDER BY name ASC LIMIT LEAST(GREATEST($1, 1), 100) OFFSET GREATEST($2, 0)`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	plans := []Plan{}
	for rows.Next() {
		plan, err := scanPlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, plan)
	}
	return plans, rows.Err()
}

func (r *repository) upsertPlan(ctx context.Context, plan Plan) (Plan, error) {
	plan.Status = activeStatus(plan.Status)
	if plan.Key == "" || plan.Name == "" {
		return Plan{}, errInvalid
	}
	if plan.Currency == "" {
		plan.Currency = "GBP"
	}
	if plan.BillingCycle == "" {
		plan.BillingCycle = "month"
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO plans (key, name, description, status, currency, price_minor, billing_cycle)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (key) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			currency = EXCLUDED.currency,
			price_minor = EXCLUDED.price_minor,
			billing_cycle = EXCLUDED.billing_cycle,
			updated_at = now()
		RETURNING key, name, description, status, currency, price_minor, billing_cycle, created_at, updated_at
	`, plan.Key, plan.Name, plan.Description, plan.Status, plan.Currency, plan.PriceMinor, plan.BillingCycle)
	return scanPlan(row)
}

func (r *repository) getPlan(ctx context.Context, key string) (Plan, error) {
	plan, err := scanPlan(r.db.QueryRowContext(ctx, `SELECT key, name, description, status, currency, price_minor, billing_cycle, created_at, updated_at FROM plans WHERE key = $1`, key))
	if errors.Is(err, sql.ErrNoRows) {
		return Plan{}, errNotFound
	}
	if err != nil {
		return Plan{}, err
	}
	features, err := r.listPlanFeatures(ctx, key)
	if err != nil {
		return Plan{}, err
	}
	plan.Features = features
	for _, feature := range features {
		plan.IncludedFeatureKeys = append(plan.IncludedFeatureKeys, feature.FeatureKey)
	}
	return plan, nil
}

func (r *repository) listPlanFeatures(ctx context.Context, planKey string) ([]PlanFeature, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT pf.plan_key, pf.feature_key, f.product_key, p.service_key, pf.limits, pf.created_at
		FROM plan_features pf
		JOIN product_features f ON f.key = pf.feature_key
		JOIN products p ON p.key = f.product_key
		WHERE pf.plan_key = $1
		ORDER BY pf.feature_key ASC
	`, planKey)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	features := []PlanFeature{}
	for rows.Next() {
		var feature PlanFeature
		if err := rows.Scan(&feature.PlanKey, &feature.FeatureKey, &feature.ProductKey, &feature.ServiceKey, &feature.Limits, &feature.CreatedAt); err != nil {
			return nil, err
		}
		features = append(features, feature)
	}
	return features, rows.Err()
}

func (r *repository) replacePlanFeatures(ctx context.Context, planKey string, features []PlanFeature) ([]PlanFeature, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var exists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM plans WHERE key = $1)`, planKey).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, errNotFound
	}
	seen := map[string]bool{}
	for _, feature := range features {
		if feature.FeatureKey == "" {
			return nil, errInvalid
		}
		if seen[feature.FeatureKey] {
			return nil, errDuplicate
		}
		seen[feature.FeatureKey] = true
		var selectable bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM product_features WHERE key = $1 AND status = 'ACTIVE' AND plan_selectable = true)`, feature.FeatureKey).Scan(&selectable); err != nil {
			return nil, err
		}
		if !selectable {
			return nil, errInvalid
		}
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM plan_features WHERE plan_key = $1`, planKey); err != nil {
		return nil, err
	}
	for _, feature := range features {
		limits := feature.Limits
		if len(limits) == 0 {
			limits = json.RawMessage(`{}`)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO plan_features (plan_key, feature_key, limits) VALUES ($1, $2, $3::jsonb)`, planKey, feature.FeatureKey, []byte(limits)); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.listPlanFeatures(ctx, planKey)
}

func (r *repository) listSubscriptions(ctx context.Context, applicationID string, limit, offset int) ([]Subscription, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, organisation_id, application_id, plan_key, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at FROM subscriptions WHERE application_id = $1 ORDER BY created_at DESC LIMIT LEAST(GREATEST($2, 1), 100) OFFSET GREATEST($3, 0)`, applicationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSubscriptions(rows)
}

func scanSubscriptions(rows *sql.Rows) ([]Subscription, error) {
	items := []Subscription{}
	for rows.Next() {
		item, err := scanSubscription(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanSubscription(row interface{ Scan(...any) error }) (Subscription, error) {
	var item Subscription
	err := row.Scan(&item.ID, &item.OrganisationID, &item.ApplicationID, &item.PlanKey, &item.Status, &item.BillingStart, &item.BillingEnd, &item.TrialStart, &item.TrialEnd, &item.CancelAt, &item.CancelledAt, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *repository) createSubscription(ctx context.Context, item Subscription) (Subscription, error) {
	if item.OrganisationID == "" || item.ApplicationID == "" || item.PlanKey == "" {
		return Subscription{}, errInvalid
	}
	if item.Status == "" {
		item.Status = "ACTIVE"
	}
	if item.BillingStart.IsZero() {
		item.BillingStart = time.Now().UTC()
	}
	if item.BillingEnd.IsZero() {
		item.BillingEnd = item.BillingStart.AddDate(0, 1, 0)
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO subscriptions (organisation_id, application_id, plan_key, status, billing_period_start, billing_period_end, trial_start, trial_end)
		SELECT $1, $2, $3, $4, $5, $6, $7, $8
		WHERE EXISTS (SELECT 1 FROM plans WHERE key = $3 AND status = 'ACTIVE')
		RETURNING id, organisation_id, application_id, plan_key, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at
	`, item.OrganisationID, item.ApplicationID, item.PlanKey, item.Status, item.BillingStart, item.BillingEnd, item.TrialStart, item.TrialEnd)
	result, err := scanSubscription(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errInvalid
	}
	return result, err
}

func (r *repository) getSubscription(ctx context.Context, id string) (Subscription, error) {
	item, err := scanSubscription(r.db.QueryRowContext(ctx, `SELECT id, organisation_id, application_id, plan_key, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at FROM subscriptions WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errNotFound
	}
	return item, err
}

func (r *repository) setSubscriptionStatus(ctx context.Context, id string, status string, planKey string) (Subscription, error) {
	if status == "" {
		status = "CANCELLED"
	}
	query := `UPDATE subscriptions SET status = $2, cancelled_at = CASE WHEN $2 = 'CANCELLED' THEN now() ELSE cancelled_at END, updated_at = now()`
	args := []any{id, status}
	if planKey != "" {
		query += `, plan_key = $3`
		args = append(args, planKey)
	}
	query += ` WHERE id = $1 RETURNING id, organisation_id, application_id, plan_key, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at`
	item, err := scanSubscription(r.db.QueryRowContext(ctx, query, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errNotFound
	}
	return item, err
}

func (r *repository) entitlements(ctx context.Context, applicationID string) (Subscription, []PlanFeature, error) {
	sub, err := scanSubscription(r.db.QueryRowContext(ctx, `
		SELECT id, organisation_id, application_id, plan_key, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at
		FROM subscriptions
		WHERE application_id = $1 AND status IN ('ACTIVE', 'TRIAL')
		ORDER BY created_at DESC
		LIMIT 1
	`, applicationID))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, []PlanFeature{}, nil
	}
	if err != nil {
		return Subscription{}, nil, err
	}
	features, err := r.listPlanFeatures(ctx, sub.PlanKey)
	return sub, features, err
}

func itoa(value int) string {
	if value == 0 {
		return "0"
	}
	digits := []byte{}
	for value > 0 {
		digits = append([]byte{byte('0' + value%10)}, digits...)
		value /= 10
	}
	return string(digits)
}
