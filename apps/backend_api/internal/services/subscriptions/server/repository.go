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
	ID           string    `json:"id"`
	ServiceID    string    `json:"service_id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Status       string    `json:"status"`
	IsSelectable bool      `json:"is_selectable"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ProductFeature struct {
	ID           string          `json:"id"`
	ProductID    string          `json:"product_id"`
	ServiceID    string          `json:"service_id,omitempty"`
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	Status       string          `json:"status"`
	IsSelectable bool            `json:"is_selectable"`
	Metadata     json.RawMessage `json:"metadata,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type Plan struct {
	ID                 string        `json:"id"`
	Name               string        `json:"name"`
	Description        string        `json:"description"`
	Status             string        `json:"status"`
	Currency           string        `json:"currency"`
	PriceMinor         int           `json:"price_minor"`
	BillingCycle       string        `json:"billing_cycle"`
	CreatedAt          time.Time     `json:"created_at"`
	UpdatedAt          time.Time     `json:"updated_at"`
	Features           []PlanFeature `json:"features,omitempty"`
	Products           []PlanProduct `json:"products,omitempty"`
	IncludedFeatureIDs []string      `json:"included_feature_ids,omitempty"`
	IncludedProductIDs []string      `json:"included_product_ids,omitempty"`
}

type PlanFeature struct {
	ID         string          `json:"id"`
	PlanID     string          `json:"plan_id"`
	FeatureID  string          `json:"feature_id"`
	ProductID  string          `json:"product_id,omitempty"`
	ServiceID  string          `json:"service_id,omitempty"`
	LimitValue json.RawMessage `json:"limit_value,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

type PlanProduct struct {
	ID        string    `json:"id"`
	PlanID    string    `json:"plan_id"`
	ProductID string    `json:"product_id"`
	ServiceID string    `json:"service_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type BillingCycle struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

type Subscription struct {
	ID           string     `json:"id"`
	OwnerType    string     `json:"owner_type"`
	OwnerID      string     `json:"owner_id"`
	PlanID       string     `json:"plan_id"`
	Status       string     `json:"status"`
	BillingStart time.Time  `json:"billing_period_start"`
	BillingEnd   time.Time  `json:"billing_period_end"`
	TrialStart   *time.Time `json:"trial_start,omitempty"`
	TrialEnd     *time.Time `json:"trial_end,omitempty"`
	CancelAt     *time.Time `json:"cancel_at,omitempty"`
	CancelledAt  *time.Time `json:"cancelled_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
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
	err := row.Scan(&product.ID, &product.ServiceID, &product.Name, &product.Description, &product.Status, &product.IsSelectable, &product.CreatedAt, &product.UpdatedAt)
	return product, err
}

func (r *repository) listProducts(ctx context.Context, limit, offset int, status string) ([]Product, error) {
	query := `SELECT id, service_id, name, description, status, is_selectable, created_at, updated_at FROM products`
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
	if product.ID == "" || product.ServiceID == "" || product.Name == "" {
		return Product{}, errInvalid
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO products (id, service_id, name, description, status, is_selectable)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			service_id = EXCLUDED.service_id,
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			is_selectable = EXCLUDED.is_selectable,
			updated_at = now()
		RETURNING id, service_id, name, description, status, is_selectable, created_at, updated_at
	`, product.ID, product.ServiceID, product.Name, product.Description, product.Status, product.IsSelectable)
	return scanProduct(row)
}

func (r *repository) getProduct(ctx context.Context, id string) (Product, error) {
	product, err := scanProduct(r.db.QueryRowContext(ctx, `SELECT id, service_id, name, description, status, is_selectable, created_at, updated_at FROM products WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Product{}, errNotFound
	}
	return product, err
}

func (r *repository) setProductStatus(ctx context.Context, id string, status string) (Product, error) {
	product, err := scanProduct(r.db.QueryRowContext(ctx, `
		UPDATE products
		SET status = $2, updated_at = now()
		WHERE id = $1
		RETURNING id, service_id, name, description, status, is_selectable, created_at, updated_at
	`, id, activeStatus(status)))
	if errors.Is(err, sql.ErrNoRows) {
		return Product{}, errNotFound
	}
	return product, err
}

func (r *repository) deleteProduct(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM plan_products
		WHERE product_id = $1
	`, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		DELETE FROM plan_features
		WHERE feature_id IN (SELECT id FROM product_features WHERE product_id = $1)
	`, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM product_features WHERE product_id = $1`, id); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errNotFound
	}
	return tx.Commit()
}

func scanFeature(row interface{ Scan(...any) error }) (ProductFeature, error) {
	var feature ProductFeature
	err := row.Scan(&feature.ID, &feature.ProductID, &feature.ServiceID, &feature.Name, &feature.Description, &feature.Status, &feature.IsSelectable, &feature.Metadata, &feature.CreatedAt, &feature.UpdatedAt)
	return feature, err
}

func (r *repository) listFeatures(ctx context.Context, limit, offset int, productID string) ([]ProductFeature, error) {
	query := `SELECT f.id, f.product_id, p.service_id, f.name, f.description, f.status, f.is_selectable, f.metadata, f.created_at, f.updated_at FROM product_features f JOIN products p ON p.id = f.product_id`
	args := []any{}
	if productID != "" {
		args = append(args, productID)
		query += ` WHERE f.product_id = $1`
	}
	args = append(args, limit, offset)
	query += ` ORDER BY f.product_id ASC, f.name ASC LIMIT LEAST(GREATEST($` + itoa(len(args)-1) + `, 1), 100) OFFSET GREATEST($` + itoa(len(args)) + `, 0)`
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
	if feature.ID == "" || feature.ProductID == "" || feature.Name == "" {
		return ProductFeature{}, errInvalid
	}
	if len(feature.Metadata) == 0 {
		feature.Metadata = json.RawMessage(`{}`)
	}
	row := r.db.QueryRowContext(ctx, `
		WITH upserted AS (
			INSERT INTO product_features (id, product_id, name, description, status, is_selectable, metadata)
			SELECT $1, $2, $3, $4, $5, $6, $7::jsonb
			WHERE EXISTS (SELECT 1 FROM products WHERE id = $2 AND status = 'ACTIVE')
			ON CONFLICT (id) DO UPDATE SET
				product_id = EXCLUDED.product_id,
				name = EXCLUDED.name,
				description = EXCLUDED.description,
				status = EXCLUDED.status,
				is_selectable = EXCLUDED.is_selectable,
				metadata = EXCLUDED.metadata,
				updated_at = now()
			RETURNING id, product_id, name, description, status, is_selectable, metadata, created_at, updated_at
		)
		SELECT u.id, u.product_id, p.service_id, u.name, u.description, u.status, u.is_selectable, u.metadata, u.created_at, u.updated_at
		FROM upserted u
		JOIN products p ON p.id = u.product_id
	`, feature.ID, feature.ProductID, feature.Name, feature.Description, feature.Status, feature.IsSelectable, []byte(feature.Metadata))
	result, err := scanFeature(row)
	if errors.Is(err, sql.ErrNoRows) {
		return ProductFeature{}, errInvalid
	}
	return result, err
}

func (r *repository) getFeature(ctx context.Context, id string) (ProductFeature, error) {
	feature, err := scanFeature(r.db.QueryRowContext(ctx, `
		SELECT f.id, f.product_id, p.service_id, f.name, f.description, f.status, f.is_selectable, f.metadata, f.created_at, f.updated_at
		FROM product_features f JOIN products p ON p.id = f.product_id
		WHERE f.id = $1
	`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return ProductFeature{}, errNotFound
	}
	return feature, err
}

func (r *repository) setFeatureStatus(ctx context.Context, id string, status string) (ProductFeature, error) {
	feature, err := scanFeature(r.db.QueryRowContext(ctx, `
		WITH updated AS (
			UPDATE product_features SET status = $2, updated_at = now()
			WHERE id = $1
			RETURNING id, product_id, name, description, status, is_selectable, metadata, created_at, updated_at
		)
		SELECT u.id, u.product_id, p.service_id, u.name, u.description, u.status, u.is_selectable, u.metadata, u.created_at, u.updated_at
		FROM updated u
		JOIN products p ON p.id = u.product_id
	`, id, activeStatus(status)))
	if errors.Is(err, sql.ErrNoRows) {
		return ProductFeature{}, errNotFound
	}
	return feature, err
}

func (r *repository) deleteFeature(ctx context.Context, id string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM plan_features WHERE feature_id = $1`, id); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `DELETE FROM product_features WHERE id = $1`, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return errNotFound
	}
	return tx.Commit()
}

func scanPlan(row interface{ Scan(...any) error }) (Plan, error) {
	var plan Plan
	err := row.Scan(&plan.ID, &plan.Name, &plan.Description, &plan.Status, &plan.Currency, &plan.PriceMinor, &plan.BillingCycle, &plan.CreatedAt, &plan.UpdatedAt)
	return plan, err
}

func (r *repository) listPlans(ctx context.Context, limit, offset int) ([]Plan, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, description, status, currency, price_minor, billing_cycle, created_at, updated_at FROM plans ORDER BY name ASC LIMIT LEAST(GREATEST($1, 1), 100) OFFSET GREATEST($2, 0)`, limit, offset)
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

func (r *repository) listBillingCycles(ctx context.Context) ([]BillingCycle, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT key, name
		FROM billing_cycles
		ORDER BY sort_order ASC, name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cycles := []BillingCycle{}
	for rows.Next() {
		var cycle BillingCycle
		if err := rows.Scan(&cycle.Key, &cycle.Name); err != nil {
			return nil, err
		}
		cycles = append(cycles, cycle)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(cycles) == 0 {
		cycles = []BillingCycle{
			{Key: "free", Name: "Free"},
			{Key: "month", Name: "Month"},
			{Key: "year", Name: "Year"},
			{Key: "manual", Name: "Manual"},
		}
	}
	return cycles, nil
}

func (r *repository) upsertPlan(ctx context.Context, plan Plan) (Plan, error) {
	plan.Status = activeStatus(plan.Status)
	if plan.ID == "" || plan.Name == "" {
		return Plan{}, errInvalid
	}
	if plan.Currency == "" {
		plan.Currency = "GBP"
	}
	if plan.BillingCycle == "" {
		plan.BillingCycle = "month"
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO plans (id, name, description, status, currency, price_minor, billing_cycle)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			currency = EXCLUDED.currency,
			price_minor = EXCLUDED.price_minor,
			billing_cycle = EXCLUDED.billing_cycle,
			updated_at = now()
		RETURNING id, name, description, status, currency, price_minor, billing_cycle, created_at, updated_at
	`, plan.ID, plan.Name, plan.Description, plan.Status, plan.Currency, plan.PriceMinor, plan.BillingCycle)
	return scanPlan(row)
}

func (r *repository) getPlan(ctx context.Context, id string) (Plan, error) {
	plan, err := scanPlan(r.db.QueryRowContext(ctx, `SELECT id, name, description, status, currency, price_minor, billing_cycle, created_at, updated_at FROM plans WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Plan{}, errNotFound
	}
	if err != nil {
		return Plan{}, err
	}
	features, err := r.listPlanFeatures(ctx, id)
	if err != nil {
		return Plan{}, err
	}
	plan.Features = features
	for _, feature := range features {
		plan.IncludedFeatureIDs = append(plan.IncludedFeatureIDs, feature.FeatureID)
	}
	products, err := r.listPlanProducts(ctx, id)
	if err != nil {
		return Plan{}, err
	}
	plan.Products = products
	for _, product := range products {
		plan.IncludedProductIDs = append(plan.IncludedProductIDs, product.ProductID)
	}
	return plan, nil
}

func (r *repository) setPlanStatus(ctx context.Context, id string, status string) (Plan, error) {
	plan, err := scanPlan(r.db.QueryRowContext(ctx, `
		UPDATE plans
		SET status = $2, updated_at = now()
		WHERE id = $1
		RETURNING id, name, description, status, currency, price_minor, billing_cycle, created_at, updated_at
	`, id, activeStatus(status)))
	if errors.Is(err, sql.ErrNoRows) {
		return Plan{}, errNotFound
	}
	return plan, err
}

func (r *repository) deletePlan(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM plans WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errNotFound
	}
	return nil
}

func (r *repository) listPlanFeatures(ctx context.Context, planID string) ([]PlanFeature, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT f.id, pp.plan_id, f.id, f.product_id, p.service_id, '{}'::jsonb, pp.created_at
		FROM plan_products pp
		JOIN products p ON p.id = pp.product_id
		JOIN product_features f ON f.product_id = p.id
		WHERE pp.plan_id = $1
		  AND f.status = 'ACTIVE'
		  AND f.is_selectable = true
		ORDER BY f.name ASC
	`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	features := []PlanFeature{}
	for rows.Next() {
		var feature PlanFeature
		if err := rows.Scan(&feature.ID, &feature.PlanID, &feature.FeatureID, &feature.ProductID, &feature.ServiceID, &feature.LimitValue, &feature.CreatedAt); err != nil {
			return nil, err
		}
		features = append(features, feature)
	}
	return features, rows.Err()
}

func (r *repository) listPlanProducts(ctx context.Context, planID string) ([]PlanProduct, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT pp.id, pp.plan_id, pp.product_id, p.service_id, pp.created_at
		FROM plan_products pp
		JOIN products p ON p.id = pp.product_id
		WHERE pp.plan_id = $1
		ORDER BY p.name ASC
	`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	products := []PlanProduct{}
	for rows.Next() {
		var product PlanProduct
		if err := rows.Scan(&product.ID, &product.PlanID, &product.ProductID, &product.ServiceID, &product.CreatedAt); err != nil {
			return nil, err
		}
		products = append(products, product)
	}
	return products, rows.Err()
}

func (r *repository) replacePlanFeatures(ctx context.Context, planID string, features []PlanFeature) ([]PlanFeature, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var exists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM plans WHERE id = $1)`, planID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, errNotFound
	}
	seen := map[string]bool{}
	for _, feature := range features {
		if feature.FeatureID == "" {
			return nil, errInvalid
		}
		if seen[feature.FeatureID] {
			return nil, errDuplicate
		}
		seen[feature.FeatureID] = true
		var selectable bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM product_features WHERE id = $1 AND status = 'ACTIVE' AND is_selectable = true)`, feature.FeatureID).Scan(&selectable); err != nil {
			return nil, err
		}
		if !selectable {
			return nil, errInvalid
		}
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM plan_features WHERE plan_id = $1`, planID); err != nil {
		return nil, err
	}
	for _, feature := range features {
		limitValue := feature.LimitValue
		if len(limitValue) == 0 {
			limitValue = json.RawMessage(`{}`)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO plan_features (plan_id, feature_id, limit_value) VALUES ($1, $2, $3::jsonb)`, planID, feature.FeatureID, []byte(limitValue)); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.listPlanFeatures(ctx, planID)
}

func (r *repository) replacePlanProducts(ctx context.Context, planID string, productIDs []string) ([]PlanProduct, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var exists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM plans WHERE id = $1)`, planID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, errNotFound
	}
	seen := map[string]bool{}
	for _, productID := range productIDs {
		if productID == "" {
			return nil, errInvalid
		}
		if seen[productID] {
			return nil, errDuplicate
		}
		seen[productID] = true
		var selectable bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS (SELECT 1 FROM products WHERE id = $1 AND status = 'ACTIVE' AND is_selectable = true)`, productID).Scan(&selectable); err != nil {
			return nil, err
		}
		if !selectable {
			return nil, errInvalid
		}
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM plan_products WHERE plan_id = $1`, planID); err != nil {
		return nil, err
	}
	for _, productID := range productIDs {
		if _, err := tx.ExecContext(ctx, `INSERT INTO plan_products (plan_id, product_id) VALUES ($1, $2)`, planID, productID); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.listPlanProducts(ctx, planID)
}

func (r *repository) listSubscriptions(ctx context.Context, ownerID string, limit, offset int) ([]Subscription, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, owner_type, owner_id, plan_id, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at FROM subscriptions WHERE owner_type = 'application' AND owner_id = $1 ORDER BY created_at DESC LIMIT LEAST(GREATEST($2, 1), 100) OFFSET GREATEST($3, 0)`, ownerID, limit, offset)
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
	err := row.Scan(&item.ID, &item.OwnerType, &item.OwnerID, &item.PlanID, &item.Status, &item.BillingStart, &item.BillingEnd, &item.TrialStart, &item.TrialEnd, &item.CancelAt, &item.CancelledAt, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *repository) createSubscription(ctx context.Context, item Subscription) (Subscription, error) {
	if item.OwnerType == "" {
		item.OwnerType = "application"
	}
	if item.OwnerID == "" || item.PlanID == "" {
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
		INSERT INTO subscriptions (owner_type, owner_id, plan_id, status, billing_period_start, billing_period_end, trial_start, trial_end)
		SELECT $1, $2, $3, $4, $5, $6, $7, $8
		WHERE EXISTS (SELECT 1 FROM plans WHERE id = $3 AND status = 'ACTIVE')
		RETURNING id, owner_type, owner_id, plan_id, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at
	`, item.OwnerType, item.OwnerID, item.PlanID, item.Status, item.BillingStart, item.BillingEnd, item.TrialStart, item.TrialEnd)
	result, err := scanSubscription(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errInvalid
	}
	return result, err
}

func (r *repository) getSubscription(ctx context.Context, id string) (Subscription, error) {
	item, err := scanSubscription(r.db.QueryRowContext(ctx, `SELECT id, owner_type, owner_id, plan_id, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at FROM subscriptions WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errNotFound
	}
	return item, err
}

func (r *repository) setSubscriptionStatus(ctx context.Context, id string, status string, planID string) (Subscription, error) {
	if status == "" {
		status = "CANCELLED"
	}
	query := `UPDATE subscriptions SET status = $2, cancelled_at = CASE WHEN $2 = 'CANCELLED' THEN now() ELSE cancelled_at END, updated_at = now()`
	args := []any{id, status}
	if planID != "" {
		query += `, plan_id = $3`
		args = append(args, planID)
	}
	query += ` WHERE id = $1 RETURNING id, owner_type, owner_id, plan_id, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at`
	item, err := scanSubscription(r.db.QueryRowContext(ctx, query, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errNotFound
	}
	return item, err
}

func (r *repository) entitlements(ctx context.Context, ownerID string) (Subscription, []PlanFeature, error) {
	sub, err := scanSubscription(r.db.QueryRowContext(ctx, `
		SELECT id, owner_type, owner_id, plan_id, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at
		FROM subscriptions
		WHERE owner_type = 'application' AND owner_id = $1 AND status IN ('ACTIVE', 'TRIAL')
		ORDER BY created_at DESC
		LIMIT 1
	`, ownerID))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, []PlanFeature{}, nil
	}
	if err != nil {
		return Subscription{}, nil, err
	}
	features, err := r.listPlanFeatures(ctx, sub.PlanID)
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
