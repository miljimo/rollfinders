package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math"
	"net/url"
	"sort"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

var (
	errNotFound  = errors.New("not found")
	errConflict  = errors.New("conflict")
	errInvalid   = errors.New("invalid")
	errDuplicate = errors.New("duplicate")
	errForbidden = errors.New("forbidden")
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
	Currency     string    `json:"currency"`
	PriceMinor   int       `json:"price_minor"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ProductFeature struct {
	ID                     string          `json:"id"`
	ProductID              string          `json:"product_id"`
	ProductIDs             []string        `json:"product_ids,omitempty"`
	ServiceID              string          `json:"service_id,omitempty"`
	FeatureKey             string          `json:"feature_key"`
	Name                   string          `json:"name"`
	Description            string          `json:"description"`
	Status                 string          `json:"status"`
	IsSelectable           bool            `json:"is_selectable"`
	SubscriptionControlled bool            `json:"subscription_controlled"`
	Currency               string          `json:"currency"`
	BasePriceMinor         int             `json:"base_price_minor"`
	Metadata               json.RawMessage `json:"metadata,omitempty"`
	CreatedAt              time.Time       `json:"created_at"`
	UpdatedAt              time.Time       `json:"updated_at"`
}

type Plan struct {
	ID                 string        `json:"id"`
	Name               string        `json:"name"`
	Description        string        `json:"description"`
	Status             string        `json:"status"`
	Currency           string        `json:"currency"`
	PriceMinor         int           `json:"price_minor"`
	DiscountPercent    float64       `json:"discount_percent"`
	BillingCycle       string        `json:"billing_cycle"`
	IsInternal         bool          `json:"is_internal"`
	TargetUserLevel    int           `json:"target_user_level"`
	CreatedAt          time.Time     `json:"created_at"`
	UpdatedAt          time.Time     `json:"updated_at"`
	Features           []PlanFeature `json:"features,omitempty"`
	Products           []PlanProduct `json:"products,omitempty"`
	FeatureIDs         []string      `json:"feature_ids,omitempty"`
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

type planAuditEvent struct {
	PlanID         string
	EventType      string
	PreviousStatus string
	NewStatus      string
	ActorID        string
	Metadata       []byte
}

type PlanProduct struct {
	ID                     string    `json:"id"`
	PlanID                 string    `json:"plan_id"`
	ProductID              string    `json:"product_id"`
	ServiceID              string    `json:"service_id,omitempty"`
	PriceAdjustmentPercent float64   `json:"price_adjustment_percent"`
	CreatedAt              time.Time `json:"created_at"`
}

type SubscriptionQuote struct {
	Currency                     string         `json:"currency"`
	BillingPeriod                string         `json:"billing_period"`
	SubtotalMinor                int            `json:"subtotal_minor"`
	AdjustmentMinor              int            `json:"adjustment_minor"`
	DuplicateFeatureSavingsMinor int            `json:"duplicate_feature_savings_minor"`
	TotalMinor                   int            `json:"total_minor"`
	Products                     []QuoteProduct `json:"products"`
	Features                     []QuoteFeature `json:"features"`
	SkippedDuplicateFeatures     []QuoteFeature `json:"skipped_duplicate_features"`
}

type QuoteProduct struct {
	PlanID            string  `json:"plan_id"`
	PlanName          string  `json:"plan_name"`
	ProductID         string  `json:"product_id"`
	ProductName       string  `json:"product_name"`
	BaseMinor         int     `json:"base_minor"`
	AdjustmentPercent float64 `json:"price_adjustment_percent"`
	AdjustmentMinor   int     `json:"adjustment_minor"`
	TotalMinor        int     `json:"total_minor"`
}

type QuoteFeature struct {
	FeatureID      string `json:"feature_id"`
	FeatureName    string `json:"feature_name"`
	ProductID      string `json:"product_id"`
	ProductName    string `json:"product_name"`
	BasePriceMinor int    `json:"base_price_minor"`
	Currency       string `json:"currency"`
}

type BillingCycle struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

type SubscriptionOwnerPolicy struct {
	ID                    string    `json:"id"`
	OwnerType             string    `json:"owner_type"`
	SubscriptionSupported bool      `json:"subscription_supported"`
	SubscriptionRequired  bool      `json:"subscription_required"`
	DefaultPlanID         string    `json:"default_plan_id,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

type Subscription struct {
	ID             string     `json:"id"`
	ApplicationID  string     `json:"application_id,omitempty"`
	OrganisationID string     `json:"organisation_id,omitempty"`
	OwnerType      string     `json:"owner_type"`
	OwnerID        string     `json:"owner_id"`
	PlanID         string     `json:"plan_id"`
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

type subscriptionAuditEvent struct {
	SubscriptionID string
	ApplicationID  string
	OrganisationID string
	OwnerType      string
	OwnerID        string
	EventType      string
	PreviousStatus string
	NewStatus      string
	PreviousPlanID string
	NewPlanID      string
	ActorID        string
	Metadata       []byte
}

type PlanChange struct {
	ID             string     `json:"id"`
	SubscriptionID string     `json:"subscription_id"`
	ApplicationID  string     `json:"application_id"`
	OrganisationID string     `json:"organisation_id,omitempty"`
	FromPlanID     string     `json:"from_plan_id,omitempty"`
	ToPlanID       string     `json:"to_plan_id,omitempty"`
	ChangeType     string     `json:"change_type"`
	Status         string     `json:"status"`
	EffectiveAt    *time.Time `json:"effective_at,omitempty"`
	PaymentID      string     `json:"payment_id,omitempty"`
	CheckoutID     string     `json:"checkout_id,omitempty"`
	RequestedBy    string     `json:"requested_by,omitempty"`
	ApprovedBy     string     `json:"approved_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type BillingEvent struct {
	ID                string          `json:"id"`
	SubscriptionID    string          `json:"subscription_id,omitempty"`
	PlanChangeID      string          `json:"plan_change_id,omitempty"`
	PaymentID         string          `json:"payment_id,omitempty"`
	EventType         string          `json:"event_type"`
	Status            string          `json:"status,omitempty"`
	AmountMinor       int             `json:"amount_minor"`
	Currency          string          `json:"currency"`
	Provider          string          `json:"provider,omitempty"`
	ProviderReference string          `json:"provider_reference,omitempty"`
	Metadata          json.RawMessage `json:"metadata,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
}

type planChangePaymentResult struct {
	Status            string
	PaymentID         string
	Provider          string
	ProviderReference string
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

func normalizeCurrency(currency string) string {
	switch strings.ToLower(strings.TrimSpace(currency)) {
	case "points":
		return "Points"
	case "gbp", "":
		return "GBP"
	default:
		return "GBP"
	}
}

func scanProduct(row interface{ Scan(...any) error }) (Product, error) {
	var product Product
	err := row.Scan(&product.ID, &product.ServiceID, &product.Name, &product.Description, &product.Status, &product.IsSelectable, &product.Currency, &product.PriceMinor, &product.CreatedAt, &product.UpdatedAt)
	return product, err
}

func (r *repository) listProducts(ctx context.Context, limit, offset int, status string) ([]Product, error) {
	query := `SELECT id, service_id, name, description, status, is_selectable, currency, price_minor, created_at, updated_at FROM products`
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
	product.Currency = normalizeCurrency(product.Currency)
	if product.PriceMinor < 0 {
		return Product{}, errInvalid
	}
	if product.ID == "" || product.ServiceID == "" || product.Name == "" {
		return Product{}, errInvalid
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO products (id, service_id, name, description, status, is_selectable, currency, price_minor)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			service_id = EXCLUDED.service_id,
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			is_selectable = EXCLUDED.is_selectable,
			currency = EXCLUDED.currency,
			price_minor = EXCLUDED.price_minor,
			updated_at = now()
		RETURNING id, service_id, name, description, status, is_selectable, currency, price_minor, created_at, updated_at
	`, product.ID, product.ServiceID, product.Name, product.Description, product.Status, product.IsSelectable, product.Currency, product.PriceMinor)
	result, err := scanProduct(row)
	if err != nil {
		return Product{}, err
	}
	_ = r.refreshPlanPricesForProduct(ctx, result.ID)
	return result, nil
}

func (r *repository) getProduct(ctx context.Context, id string) (Product, error) {
	product, err := scanProduct(r.db.QueryRowContext(ctx, `SELECT id, service_id, name, description, status, is_selectable, currency, price_minor, created_at, updated_at FROM products WHERE id = $1`, id))
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
		RETURNING id, service_id, name, description, status, is_selectable, currency, price_minor, created_at, updated_at
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

	if _, err := tx.ExecContext(ctx, `UPDATE product_features SET status = 'RETIRED', updated_at = now() WHERE product_id = $1`, id); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `UPDATE products SET status = 'RETIRED', updated_at = now() WHERE id = $1`, id)
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
	err := row.Scan(&feature.ID, &feature.ProductID, &feature.ServiceID, &feature.FeatureKey, &feature.Name, &feature.Description, &feature.Status, &feature.IsSelectable, &feature.SubscriptionControlled, &feature.Currency, &feature.BasePriceMinor, &feature.Metadata, &feature.CreatedAt, &feature.UpdatedAt)
	if err == nil && feature.ProductID != "" {
		feature.ProductIDs = []string{feature.ProductID}
	}
	return feature, err
}

func normalizeProductIDs(productIDs []string, fallbackProductID string) []string {
	seen := map[string]bool{}
	normalized := []string{}
	if fallbackProductID != "" {
		seen[fallbackProductID] = true
		normalized = append(normalized, fallbackProductID)
	}
	for _, productID := range productIDs {
		productID = strings.TrimSpace(productID)
		if productID == "" || seen[productID] {
			continue
		}
		seen[productID] = true
		normalized = append(normalized, productID)
	}
	return normalized
}

func (r *repository) featureProductIDs(ctx context.Context, featureID string) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT product_id
		FROM plan_feature_products
		WHERE feature_id = $1
		ORDER BY created_at ASC, product_id ASC
	`, featureID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	productIDs := []string{}
	for rows.Next() {
		var productID string
		if err := rows.Scan(&productID); err != nil {
			return nil, err
		}
		productIDs = append(productIDs, productID)
	}
	return productIDs, rows.Err()
}

func (r *repository) attachFeatureProductIDs(ctx context.Context, feature ProductFeature) (ProductFeature, error) {
	productIDs, err := r.featureProductIDs(ctx, feature.ID)
	if err != nil {
		return ProductFeature{}, err
	}
	if len(productIDs) == 0 && feature.ProductID != "" {
		productIDs = []string{feature.ProductID}
	}
	feature.ProductIDs = productIDs
	total, err := r.productIDsPrice(ctx, productIDs)
	if err != nil {
		return ProductFeature{}, err
	}
	feature.BasePriceMinor = total
	return feature, nil
}

func (r *repository) productIDsPrice(ctx context.Context, productIDs []string) (int, error) {
	productIDs = normalizeProductIDs(productIDs, "")
	if len(productIDs) == 0 {
		return 0, nil
	}
	placeholders := make([]string, 0, len(productIDs))
	args := make([]any, 0, len(productIDs))
	for index, productID := range productIDs {
		placeholders = append(placeholders, "$"+itoa(index+1))
		args = append(args, productID)
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT price_minor
		FROM products
		WHERE id IN (`+strings.Join(placeholders, ",")+`)
		  AND status = 'ACTIVE'
		  AND is_selectable = true
	`, args...)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	total := 0
	for rows.Next() {
		var priceMinor int
		if err := rows.Scan(&priceMinor); err != nil {
			return 0, err
		}
		total += priceMinor
	}
	return total, rows.Err()
}

func (r *repository) replaceFeatureProducts(ctx context.Context, featureID string, productIDs []string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `DELETE FROM plan_feature_products WHERE feature_id = $1`, featureID); err != nil {
		return err
	}
	for _, productID := range productIDs {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO plan_feature_products (feature_id, product_id)
			SELECT $1, $2
			WHERE EXISTS (SELECT 1 FROM products WHERE id = $2 AND status = 'ACTIVE')
			ON CONFLICT (feature_id, product_id) DO NOTHING
		`, featureID, productID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *repository) listFeatures(ctx context.Context, limit, offset int, productID string) ([]ProductFeature, error) {
	query := `SELECT f.id, f.product_id, p.service_id, f.feature_key, f.name, f.description, f.status, f.is_selectable, f.subscription_controlled, f.currency, f.base_price_minor, f.metadata, f.created_at, f.updated_at FROM product_features f JOIN products p ON p.id = f.product_id`
	args := []any{}
	if productID != "" {
		args = append(args, productID)
		query += ` WHERE f.product_id = $1 OR EXISTS (
			SELECT 1
			FROM plan_feature_products pfp
			WHERE pfp.feature_id = f.id
			  AND pfp.product_id = $1
		)`
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
		feature, err = r.attachFeatureProductIDs(ctx, feature)
		if err != nil {
			return nil, err
		}
		features = append(features, feature)
	}
	return features, rows.Err()
}

func (r *repository) upsertFeature(ctx context.Context, feature ProductFeature) (ProductFeature, error) {
	feature.Status = activeStatus(feature.Status)
	feature.FeatureKey = strings.ToLower(strings.TrimSpace(feature.FeatureKey))
	if feature.FeatureKey == "" {
		feature.FeatureKey = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(feature.Name), " ", "."))
	}
	productIDs := normalizeProductIDs(feature.ProductIDs, feature.ProductID)
	if feature.ProductID == "" && len(productIDs) > 0 {
		feature.ProductID = productIDs[0]
	}
	if feature.ID == "" || feature.ProductID == "" || feature.FeatureKey == "" || feature.Name == "" {
		return ProductFeature{}, errInvalid
	}
	if feature.Currency == "" {
		feature.Currency = "GBP"
	}
	if feature.Currency != "GBP" && feature.Currency != "Points" {
		return ProductFeature{}, errInvalid
	}
	if feature.BasePriceMinor < 0 {
		return ProductFeature{}, errInvalid
	}
	if len(feature.Metadata) == 0 {
		feature.Metadata = json.RawMessage(`{}`)
	}
	var duplicate bool
	if err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM product_features
			WHERE product_id = $1
			  AND lower(name) = lower($2)
			  AND id <> $3
		)
	`, feature.ProductID, feature.Name, feature.ID).Scan(&duplicate); err != nil {
		return ProductFeature{}, err
	}
	if duplicate {
		return ProductFeature{}, errDuplicate
	}
	if err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM product_features
			WHERE product_id = $1
			  AND lower(feature_key) = lower($2)
			  AND id <> $3
		)
	`, feature.ProductID, feature.FeatureKey, feature.ID).Scan(&duplicate); err != nil {
		return ProductFeature{}, err
	}
	if duplicate {
		return ProductFeature{}, errDuplicate
	}
	row := r.db.QueryRowContext(ctx, `
		WITH upserted AS (
			INSERT INTO product_features (id, product_id, feature_key, name, description, status, is_selectable, subscription_controlled, currency, base_price_minor, metadata)
			SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb
			WHERE EXISTS (SELECT 1 FROM products WHERE id = $2 AND status = 'ACTIVE')
			ON CONFLICT (id) DO UPDATE SET
				product_id = EXCLUDED.product_id,
				feature_key = EXCLUDED.feature_key,
				name = EXCLUDED.name,
				description = EXCLUDED.description,
				status = EXCLUDED.status,
				is_selectable = EXCLUDED.is_selectable,
				subscription_controlled = EXCLUDED.subscription_controlled,
				currency = EXCLUDED.currency,
				base_price_minor = EXCLUDED.base_price_minor,
				metadata = EXCLUDED.metadata,
				updated_at = now()
			RETURNING id, product_id, feature_key, name, description, status, is_selectable, subscription_controlled, currency, base_price_minor, metadata, created_at, updated_at
		)
		SELECT u.id, u.product_id, p.service_id, u.feature_key, u.name, u.description, u.status, u.is_selectable, u.subscription_controlled, u.currency, u.base_price_minor, u.metadata, u.created_at, u.updated_at
		FROM upserted u
		JOIN products p ON p.id = u.product_id
	`, feature.ID, feature.ProductID, feature.FeatureKey, feature.Name, feature.Description, feature.Status, feature.IsSelectable, feature.SubscriptionControlled, feature.Currency, feature.BasePriceMinor, []byte(feature.Metadata))
	result, err := scanFeature(row)
	if errors.Is(err, sql.ErrNoRows) {
		return ProductFeature{}, errInvalid
	}
	if err != nil {
		return ProductFeature{}, err
	}
	if len(productIDs) == 0 {
		productIDs = []string{result.ProductID}
	}
	if err := r.replaceFeatureProducts(ctx, result.ID, productIDs); err != nil {
		return ProductFeature{}, err
	}
	return r.attachFeatureProductIDs(ctx, result)
}

func (r *repository) getFeature(ctx context.Context, id string) (ProductFeature, error) {
	feature, err := scanFeature(r.db.QueryRowContext(ctx, `
		SELECT f.id, f.product_id, p.service_id, f.feature_key, f.name, f.description, f.status, f.is_selectable, f.subscription_controlled, f.currency, f.base_price_minor, f.metadata, f.created_at, f.updated_at
		FROM product_features f JOIN products p ON p.id = f.product_id
		WHERE f.id = $1 OR f.feature_key = $1
	`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return ProductFeature{}, errNotFound
	}
	if err != nil {
		return ProductFeature{}, err
	}
	return r.attachFeatureProductIDs(ctx, feature)
}

func (r *repository) setFeatureStatus(ctx context.Context, id string, status string) (ProductFeature, error) {
	feature, err := scanFeature(r.db.QueryRowContext(ctx, `
		WITH updated AS (
			UPDATE product_features SET status = $2, updated_at = now()
			WHERE id = $1 OR feature_key = $1
			RETURNING id, product_id, feature_key, name, description, status, is_selectable, subscription_controlled, currency, base_price_minor, metadata, created_at, updated_at
		)
		SELECT u.id, u.product_id, p.service_id, u.feature_key, u.name, u.description, u.status, u.is_selectable, u.subscription_controlled, u.currency, u.base_price_minor, u.metadata, u.created_at, u.updated_at
		FROM updated u
		JOIN products p ON p.id = u.product_id
	`, id, activeStatus(status)))
	if errors.Is(err, sql.ErrNoRows) {
		return ProductFeature{}, errNotFound
	}
	if err != nil {
		return ProductFeature{}, err
	}
	return r.attachFeatureProductIDs(ctx, feature)
}

func (r *repository) deleteFeature(ctx context.Context, id string) error {
	feature, err := r.setFeatureStatus(ctx, id, "RETIRED")
	if err != nil {
		return err
	}
	if feature.ID == "" {
		return errNotFound
	}
	return nil
}

func scanPlan(row interface{ Scan(...any) error }) (Plan, error) {
	var plan Plan
	err := row.Scan(&plan.ID, &plan.Name, &plan.Description, &plan.Status, &plan.Currency, &plan.PriceMinor, &plan.DiscountPercent, &plan.BillingCycle, &plan.IsInternal, &plan.TargetUserLevel, &plan.CreatedAt, &plan.UpdatedAt)
	return plan, err
}

func (r *repository) listPlans(ctx context.Context, limit, offset int) ([]Plan, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, description, status, currency, price_minor, discount_percent, billing_cycle, is_internal, target_user_level, created_at, updated_at FROM plans ORDER BY name ASC LIMIT LEAST(GREATEST($1, 1), 100) OFFSET GREATEST($2, 0)`, limit, offset)
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
		plan.PriceMinor, err = r.calculatedPlanPrice(ctx, plan.ID, plan.DiscountPercent)
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

func scanOwnerPolicy(row interface{ Scan(...any) error }) (SubscriptionOwnerPolicy, error) {
	var item SubscriptionOwnerPolicy
	err := row.Scan(&item.ID, &item.OwnerType, &item.SubscriptionSupported, &item.SubscriptionRequired, &item.DefaultPlanID, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func defaultOwnerPolicy(ownerType string) SubscriptionOwnerPolicy {
	return SubscriptionOwnerPolicy{
		OwnerType: strings.ToLower(strings.TrimSpace(ownerType)),
	}
}

func (r *repository) getOwnerPolicy(ctx context.Context, ownerType string) (SubscriptionOwnerPolicy, error) {
	ownerType = strings.ToLower(strings.TrimSpace(ownerType))
	if ownerType == "" {
		return SubscriptionOwnerPolicy{}, errInvalid
	}
	policy, err := scanOwnerPolicy(r.db.QueryRowContext(ctx, `
		SELECT id, owner_type, subscription_supported, subscription_required, COALESCE(default_plan_id, ''), created_at, updated_at
		FROM subscription_owner_policies
		WHERE owner_type = $1
	`, ownerType))
	if errors.Is(err, sql.ErrNoRows) {
		return defaultOwnerPolicy(ownerType), nil
	}
	return policy, err
}

func (r *repository) listOwnerPolicies(ctx context.Context) ([]SubscriptionOwnerPolicy, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, owner_type, subscription_supported, subscription_required, COALESCE(default_plan_id, ''), created_at, updated_at
		FROM subscription_owner_policies
		ORDER BY owner_type ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []SubscriptionOwnerPolicy{}
	for rows.Next() {
		item, err := scanOwnerPolicy(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *repository) updateOwnerPolicy(ctx context.Context, policy SubscriptionOwnerPolicy) (SubscriptionOwnerPolicy, error) {
	policy.OwnerType = strings.ToLower(strings.TrimSpace(policy.OwnerType))
	if policy.OwnerType == "" {
		return SubscriptionOwnerPolicy{}, errInvalid
	}
	item, err := scanOwnerPolicy(r.db.QueryRowContext(ctx, `
		INSERT INTO subscription_owner_policies (owner_type, subscription_supported, subscription_required, default_plan_id)
		VALUES ($1, $2, $3, NULLIF($4, ''))
		ON CONFLICT (owner_type) DO UPDATE SET
		    subscription_supported = EXCLUDED.subscription_supported,
		    subscription_required = EXCLUDED.subscription_required,
		    default_plan_id = EXCLUDED.default_plan_id,
		    updated_at = now()
		RETURNING id, owner_type, subscription_supported, subscription_required, COALESCE(default_plan_id, ''), created_at, updated_at
	`, policy.OwnerType, policy.SubscriptionSupported, policy.SubscriptionRequired, strings.TrimSpace(policy.DefaultPlanID)))
	return item, err
}

func createPlanAuditEvent(ctx context.Context, execer subscriptionAuditExecer, event planAuditEvent) error {
	if event.EventType == "" {
		return errInvalid
	}
	if len(event.Metadata) == 0 {
		event.Metadata = []byte(`{}`)
	}
	_, err := execer.ExecContext(ctx, `
		INSERT INTO subscription_plan_audit_events (
			plan_id, event_type, previous_status, new_status, actor_id, metadata
		)
		VALUES (
			NULLIF($1, ''), $2, $3, $4, $5, $6
		)
	`, event.PlanID, event.EventType, event.PreviousStatus, event.NewStatus, event.ActorID, event.Metadata)
	return err
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
	plan.DiscountPercent = math.Min(100, math.Max(0, plan.DiscountPercent))
	plan.PriceMinor = 0
	previous, previousErr := r.getPlan(ctx, plan.ID)
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO plans (id, name, description, status, currency, price_minor, discount_percent, billing_cycle, is_internal, target_user_level)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			currency = EXCLUDED.currency,
			price_minor = EXCLUDED.price_minor,
			discount_percent = EXCLUDED.discount_percent,
			billing_cycle = EXCLUDED.billing_cycle,
			is_internal = EXCLUDED.is_internal,
			target_user_level = EXCLUDED.target_user_level,
			updated_at = now()
		RETURNING id, name, description, status, currency, price_minor, discount_percent, billing_cycle, is_internal, target_user_level, created_at, updated_at
	`, plan.ID, plan.Name, plan.Description, plan.Status, plan.Currency, plan.PriceMinor, plan.DiscountPercent, plan.BillingCycle, plan.IsInternal, plan.TargetUserLevel)
	result, err := scanPlan(row)
	if err != nil {
		return Plan{}, err
	}
	eventType := "plan_updated"
	previousStatus := ""
	if errors.Is(previousErr, errNotFound) {
		eventType = "plan_created"
	} else if previousErr != nil {
		return Plan{}, previousErr
	} else {
		previousStatus = previous.Status
	}
	if err := createPlanAuditEvent(ctx, r.db, planAuditEvent{
		PlanID:         result.ID,
		EventType:      eventType,
		PreviousStatus: previousStatus,
		NewStatus:      result.Status,
	}); err != nil {
		return Plan{}, err
	}
	return result, nil
}

func (r *repository) getPlan(ctx context.Context, id string) (Plan, error) {
	plan, err := scanPlan(r.db.QueryRowContext(ctx, `SELECT id, name, description, status, currency, price_minor, discount_percent, billing_cycle, is_internal, target_user_level, created_at, updated_at FROM plans WHERE id = $1`, id))
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
	plan.PriceMinor, err = r.calculatedPlanPrice(ctx, plan.ID, plan.DiscountPercent)
	if err != nil {
		return Plan{}, err
	}
	return plan, nil
}

func (r *repository) setPlanStatus(ctx context.Context, id string, status string) (Plan, error) {
	plan, err := scanPlan(r.db.QueryRowContext(ctx, `
		UPDATE plans
		SET status = $2, updated_at = now()
		WHERE id = $1
		RETURNING id, name, description, status, currency, price_minor, discount_percent, billing_cycle, is_internal, target_user_level, created_at, updated_at
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

func (r *repository) actorMaxRoleLevel(ctx context.Context, actorID string) (int, error) {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return 0, nil
	}
	var level sql.NullInt64
	if err := r.db.QueryRowContext(ctx, `SELECT authorisation.actor_max_role_level($1)`, actorID).Scan(&level); err != nil {
		return 0, err
	}
	if !level.Valid {
		return 0, nil
	}
	return int(level.Int64), nil
}

func (r *repository) ensureActorCanUsePlan(ctx context.Context, actorID string, plan Plan) error {
	if plan.TargetUserLevel <= 0 {
		return nil
	}
	level, err := r.actorMaxRoleLevel(ctx, actorID)
	if err != nil {
		return err
	}
	if level < plan.TargetUserLevel {
		return errForbidden
	}
	return nil
}

func (r *repository) listPlanFeatures(ctx context.Context, planID string) ([]PlanFeature, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT pf.id, pf.plan_id, f.id, f.product_id, p.service_id, pf.limit_value, pf.created_at
		FROM plan_features pf
		JOIN product_features f ON f.id = pf.feature_id
		JOIN products p ON p.id = f.product_id
		WHERE pf.plan_id = $1
		  AND f.status = 'ACTIVE'
		  AND f.is_selectable = true
		  AND p.status = 'ACTIVE'
		  AND p.is_selectable = true
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
		SELECT pp.id, pp.plan_id, pp.product_id, p.service_id, pp.price_adjustment_percent, pp.created_at
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
		if err := rows.Scan(&product.ID, &product.PlanID, &product.ProductID, &product.ServiceID, &product.PriceAdjustmentPercent, &product.CreatedAt); err != nil {
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
	featureIDs := make([]string, 0, len(features))
	for _, feature := range features {
		featureIDs = append(featureIDs, feature.FeatureID)
	}
	metadata, err := json.Marshal(map[string]any{"feature_ids": featureIDs, "feature_count": len(featureIDs)})
	if err != nil {
		return nil, err
	}
	if err := createPlanAuditEvent(ctx, tx, planAuditEvent{
		PlanID:    planID,
		EventType: "plan_features_replaced",
		Metadata:  metadata,
	}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	_ = r.refreshPlanPrice(ctx, planID)
	return r.listPlanFeatures(ctx, planID)
}

func (r *repository) replacePlanProducts(ctx context.Context, planID string, products []PlanProduct) ([]PlanProduct, error) {
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
	for _, product := range products {
		productID := product.ProductID
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
	for _, product := range products {
		if _, err := tx.ExecContext(ctx, `INSERT INTO plan_products (plan_id, product_id, price_adjustment_percent) VALUES ($1, $2, $3)`, planID, product.ProductID, product.PriceAdjustmentPercent); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	_ = r.refreshPlanPrice(ctx, planID)
	return r.listPlanProducts(ctx, planID)
}

func applyPlanDiscount(baseMinor int, discountPercent float64) int {
	discountPercent = math.Min(100, math.Max(0, discountPercent))
	discountMinor := int(math.Round(float64(baseMinor) * discountPercent / 100))
	return int(math.Max(0, float64(baseMinor-discountMinor)))
}

func (r *repository) calculatedPlanPrice(ctx context.Context, planID string, discountPercent float64) (int, error) {
	featureRows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT p.id, p.price_minor
		FROM plan_features pf
		JOIN product_features f ON f.id = pf.feature_id
		LEFT JOIN plan_feature_products pfp ON pfp.feature_id = f.id
		JOIN products p ON p.id = COALESCE(pfp.product_id, f.product_id)
		WHERE pf.plan_id = $1
		  AND f.status = 'ACTIVE'
		  AND f.is_selectable = true
		  AND p.status = 'ACTIVE'
		  AND p.is_selectable = true
		ORDER BY p.id ASC
	`, planID)
	if err != nil {
		return 0, err
	}
	defer featureRows.Close()
	total := 0
	featureProductCount := 0
	for featureRows.Next() {
		var productID string
		var priceMinor int
		if err := featureRows.Scan(&productID, &priceMinor); err != nil {
			return 0, err
		}
		featureProductCount++
		total += priceMinor
	}
	if err := featureRows.Err(); err != nil {
		return 0, err
	}
	if featureProductCount > 0 {
		return applyPlanDiscount(total, discountPercent), nil
	}

	productRows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.price_minor, pp.price_adjustment_percent
		FROM plan_products pp
		JOIN products p ON p.id = pp.product_id
		WHERE pp.plan_id = $1
		  AND p.status = 'ACTIVE'
		  AND p.is_selectable = true
		ORDER BY p.id ASC
	`, planID)
	if err != nil {
		return 0, err
	}
	defer productRows.Close()
	seenProducts := map[string]bool{}
	for productRows.Next() {
		var productID string
		var priceMinor int
		var adjustmentPercent float64
		if err := productRows.Scan(&productID, &priceMinor, &adjustmentPercent); err != nil {
			return 0, err
		}
		if seenProducts[productID] {
			continue
		}
		seenProducts[productID] = true
		adjustmentMinor := int(math.Round(float64(priceMinor) * adjustmentPercent / 100))
		total += int(math.Max(0, float64(priceMinor+adjustmentMinor)))
	}
	if err := productRows.Err(); err != nil {
		return 0, err
	}
	if len(seenProducts) > 0 {
		return applyPlanDiscount(total, discountPercent), nil
	}
	return applyPlanDiscount(total, discountPercent), nil
}

func (r *repository) refreshPlanPrice(ctx context.Context, planID string) error {
	var discountPercent float64
	if err := r.db.QueryRowContext(ctx, `SELECT discount_percent FROM plans WHERE id = $1`, planID).Scan(&discountPercent); err != nil {
		return err
	}
	priceMinor, err := r.calculatedPlanPrice(ctx, planID, discountPercent)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `UPDATE plans SET price_minor = $2, updated_at = now() WHERE id = $1`, planID, priceMinor)
	return err
}

func (r *repository) refreshPlanPricesForProduct(ctx context.Context, productID string) error {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT plan_id
		FROM plan_products
		WHERE product_id = $1
		UNION
		SELECT DISTINCT pf.plan_id
		FROM plan_features pf
		JOIN product_features f ON f.id = pf.feature_id
		LEFT JOIN plan_feature_products pfp ON pfp.feature_id = f.id
		WHERE COALESCE(pfp.product_id, f.product_id) = $1
	`, productID)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var planID string
		if err := rows.Scan(&planID); err != nil {
			return err
		}
		if err := r.refreshPlanPrice(ctx, planID); err != nil {
			return err
		}
	}
	return rows.Err()
}

func (r *repository) quotePlans(ctx context.Context, planIDs []string, billingPeriod string) (SubscriptionQuote, error) {
	if billingPeriod == "" {
		billingPeriod = "month"
	}
	if billingPeriod != "month" && billingPeriod != "year" {
		return SubscriptionQuote{}, errInvalid
	}
	cleanPlanIDs := []string{}
	seenPlans := map[string]bool{}
	for _, planID := range planIDs {
		planID = strings.TrimSpace(planID)
		if planID == "" || seenPlans[planID] {
			continue
		}
		seenPlans[planID] = true
		cleanPlanIDs = append(cleanPlanIDs, planID)
	}
	if len(cleanPlanIDs) == 0 {
		return SubscriptionQuote{}, errInvalid
	}
	quote := SubscriptionQuote{Currency: "GBP", BillingPeriod: billingPeriod, Products: []QuoteProduct{}, Features: []QuoteFeature{}, SkippedDuplicateFeatures: []QuoteFeature{}}
	seenFeatures := map[string]bool{}
	seenProducts := map[string]bool{}
	for _, planID := range cleanPlanIDs {
		plan, err := r.getPlan(ctx, planID)
		if err != nil {
			return SubscriptionQuote{}, err
		}
		if plan.Currency != "" {
			quote.Currency = plan.Currency
		}
		planProductStart := len(quote.Products)
		planTotal := 0
		for _, planProduct := range plan.Products {
			if len(plan.Features) > 0 {
				break
			}
			product, err := r.getProduct(ctx, planProduct.ProductID)
			if err != nil {
				return SubscriptionQuote{}, err
			}
			if product.Currency != "" {
				quote.Currency = product.Currency
			}
			features, err := r.listFeatures(ctx, 100, 0, planProduct.ProductID)
			if err != nil {
				return SubscriptionQuote{}, err
			}
			productBase := product.PriceMinor
			productAlreadyPriced := seenProducts[product.ID]
			for _, feature := range features {
				if feature.Status != "ACTIVE" {
					continue
				}
				quoteFeature := QuoteFeature{
					FeatureID:      feature.ID,
					FeatureName:    feature.Name,
					ProductID:      planProduct.ProductID,
					ProductName:    product.Name,
					BasePriceMinor: feature.BasePriceMinor,
					Currency:       feature.Currency,
				}
				if seenFeatures[feature.ID] {
					quote.SkippedDuplicateFeatures = append(quote.SkippedDuplicateFeatures, quoteFeature)
					continue
				}
				seenFeatures[feature.ID] = true
				quote.Features = append(quote.Features, quoteFeature)
			}
			if productAlreadyPriced {
				quote.DuplicateFeatureSavingsMinor += productBase
				continue
			}
			seenProducts[product.ID] = true
			adjustment := int(math.Round(float64(productBase) * planProduct.PriceAdjustmentPercent / 100))
			productTotal := productBase + adjustment
			if productTotal < 0 {
				productTotal = 0
				adjustment = -productBase
			}
			quote.Products = append(quote.Products, QuoteProduct{
				PlanID:            plan.ID,
				PlanName:          plan.Name,
				ProductID:         product.ID,
				ProductName:       product.Name,
				BaseMinor:         productBase,
				AdjustmentPercent: planProduct.PriceAdjustmentPercent,
				AdjustmentMinor:   adjustment,
				TotalMinor:        productTotal,
			})
			quote.SubtotalMinor += productBase
			quote.AdjustmentMinor += adjustment
			quote.TotalMinor += productTotal
			planTotal += productTotal
		}
		if len(plan.Features) > 0 {
			productTotals := map[string]int{}
			productNames := map[string]string{}
			productSeen := map[string]bool{}
			for _, planFeature := range plan.Features {
				feature, err := r.getFeature(ctx, planFeature.FeatureID)
				if err != nil {
					return SubscriptionQuote{}, err
				}
				if feature.Status != "ACTIVE" {
					continue
				}
				productIDs := normalizeProductIDs(feature.ProductIDs, feature.ProductID)
				if seenFeatures[feature.ID] {
					for _, productID := range productIDs {
						product, err := r.getProduct(ctx, productID)
						if err != nil {
							return SubscriptionQuote{}, err
						}
						quote.SkippedDuplicateFeatures = append(quote.SkippedDuplicateFeatures, QuoteFeature{
							FeatureID:      feature.ID,
							FeatureName:    feature.Name,
							ProductID:      product.ID,
							ProductName:    product.Name,
							BasePriceMinor: feature.BasePriceMinor,
							Currency:       feature.Currency,
						})
					}
					continue
				}
				seenFeatures[feature.ID] = true
				for _, productID := range productIDs {
					product, err := r.getProduct(ctx, productID)
					if err != nil {
						return SubscriptionQuote{}, err
					}
					if product.Currency != "" {
						quote.Currency = product.Currency
					}
					quoteFeature := QuoteFeature{
						FeatureID:      feature.ID,
						FeatureName:    feature.Name,
						ProductID:      product.ID,
						ProductName:    product.Name,
						BasePriceMinor: feature.BasePriceMinor,
						Currency:       feature.Currency,
					}
					if !productSeen[product.ID] && !seenProducts[product.ID] {
						productTotals[product.ID] += product.PriceMinor
						productSeen[product.ID] = true
						seenProducts[product.ID] = true
					} else if !productSeen[product.ID] {
						quote.DuplicateFeatureSavingsMinor += product.PriceMinor
						productSeen[product.ID] = true
					}
					productNames[product.ID] = product.Name
					quote.Features = append(quote.Features, quoteFeature)
				}
			}
			productIDs := make([]string, 0, len(productTotals))
			for productID := range productTotals {
				productIDs = append(productIDs, productID)
			}
			sort.Strings(productIDs)
			for _, productID := range productIDs {
				productTotal := productTotals[productID]
				quote.Products = append(quote.Products, QuoteProduct{
					PlanID:      plan.ID,
					PlanName:    plan.Name,
					ProductID:   productID,
					ProductName: productNames[productID],
					BaseMinor:   productTotal,
					TotalMinor:  productTotal,
				})
				quote.SubtotalMinor += productTotal
				quote.TotalMinor += productTotal
				planTotal += productTotal
			}
		}
		if planTotal == 0 && plan.PriceMinor > 0 && len(quote.Products) > planProductStart {
			quote.Products[planProductStart].BaseMinor = plan.PriceMinor
			quote.Products[planProductStart].TotalMinor = plan.PriceMinor
			quote.SubtotalMinor += plan.PriceMinor
			quote.TotalMinor += plan.PriceMinor
			planTotal += plan.PriceMinor
		}
		if planTotal > 0 && plan.DiscountPercent > 0 {
			discountMinor := int(math.Round(float64(planTotal) * math.Min(100, math.Max(0, plan.DiscountPercent)) / 100))
			quote.AdjustmentMinor -= discountMinor
			quote.TotalMinor = int(math.Max(0, float64(quote.TotalMinor-discountMinor)))
		}
	}
	if billingPeriod == "year" {
		quote.SubtotalMinor *= 12
		quote.AdjustmentMinor *= 12
		quote.DuplicateFeatureSavingsMinor *= 12
		quote.TotalMinor *= 12
		for index := range quote.Products {
			quote.Products[index].BaseMinor *= 12
			quote.Products[index].AdjustmentMinor *= 12
			quote.Products[index].TotalMinor *= 12
		}
		for index := range quote.Features {
			quote.Features[index].BasePriceMinor *= 12
		}
		for index := range quote.SkippedDuplicateFeatures {
			quote.SkippedDuplicateFeatures[index].BasePriceMinor *= 12
		}
	}
	return quote, nil
}

func (r *repository) listSubscriptions(ctx context.Context, ownerID string, limit, offset int) ([]Subscription, error) {
	return r.listSubscriptionsByOwner(ctx, "application", ownerID, limit, offset)
}

const subscriptionSelectColumns = `id, COALESCE(application_id, ''), COALESCE(organisation_id, ''), owner_type, owner_id, plan_id, status, billing_period_start, billing_period_end, trial_start, trial_end, cancel_at, cancelled_at, created_at, updated_at`

func (r *repository) listSubscriptionsByOwner(ctx context.Context, ownerType string, ownerID string, limit, offset int) ([]Subscription, error) {
	ownerType = strings.ToLower(strings.TrimSpace(ownerType))
	ownerID = strings.TrimSpace(ownerID)
	if ownerType == "" || ownerID == "" {
		return nil, errInvalid
	}
	rows, err := r.db.QueryContext(ctx, `SELECT `+subscriptionSelectColumns+` FROM subscriptions WHERE owner_type = $1 AND owner_id = $2 ORDER BY created_at DESC LIMIT LEAST(GREATEST($3, 1), 100) OFFSET GREATEST($4, 0)`, ownerType, ownerID, limit, offset)
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
	err := row.Scan(&item.ID, &item.ApplicationID, &item.OrganisationID, &item.OwnerType, &item.OwnerID, &item.PlanID, &item.Status, &item.BillingStart, &item.BillingEnd, &item.TrialStart, &item.TrialEnd, &item.CancelAt, &item.CancelledAt, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *repository) createSubscription(ctx context.Context, item Subscription) (Subscription, error) {
	if item.OwnerType == "" {
		item.OwnerType = "application"
	}
	item.OwnerType = strings.ToLower(strings.TrimSpace(item.OwnerType))
	item.OwnerID = strings.TrimSpace(item.OwnerID)
	item.ApplicationID = strings.TrimSpace(item.ApplicationID)
	item.OrganisationID = strings.TrimSpace(item.OrganisationID)
	if item.ApplicationID == "" && item.OwnerType == "application" {
		item.ApplicationID = item.OwnerID
	}
	if item.OwnerID == "" || item.PlanID == "" {
		return Subscription{}, errInvalid
	}
	if item.BillingStart.IsZero() {
		item.BillingStart = time.Now().UTC()
	}
	if item.BillingEnd.IsZero() {
		item.BillingEnd = item.BillingStart.AddDate(0, 1, 0)
	}
	var planID string
	var discountPercent float64
	var planBillingCycle string
	if err := r.db.QueryRowContext(ctx, `SELECT id, discount_percent, billing_cycle FROM plans WHERE id = $1 AND status = 'ACTIVE'`, item.PlanID).Scan(&planID, &discountPercent, &planBillingCycle); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Subscription{}, errInvalid
		}
		return Subscription{}, err
	}
	planPriceMinor, err := r.calculatedPlanPrice(ctx, planID, discountPercent)
	if err != nil {
		return Subscription{}, err
	}
	if item.Status == "" {
		item.Status = "ACTIVE"
	}
	if planPriceMinor > 0 && stripeBillableCycle(planBillingCycle) && activatesSubscription(item.Status) {
		item.Status = "checkout_pending"
	}
	_, err = scanSubscription(r.db.QueryRowContext(ctx, `
		SELECT `+subscriptionSelectColumns+`
		FROM subscriptions
		WHERE owner_type = $1
		  AND owner_id = $2
		  AND plan_id = $3
		  AND status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'active', 'past_due', 'scheduled_downgrade', 'cancel_at_period_end', 'suspended')
		ORDER BY created_at DESC
		LIMIT 1
	`, item.OwnerType, item.OwnerID, item.PlanID))
	if err == nil {
		return Subscription{}, errConflict
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, err
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO subscriptions (application_id, organisation_id, owner_type, owner_id, plan_id, status, billing_period_start, billing_period_end, trial_start, trial_end)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING `+subscriptionSelectColumns+`
	`, item.ApplicationID, item.OrganisationID, item.OwnerType, item.OwnerID, item.PlanID, item.Status, item.BillingStart, item.BillingEnd, item.TrialStart, item.TrialEnd)
	result, err := scanSubscription(row)
	if err != nil {
		return Subscription{}, err
	}
	if err := r.createSubscriptionAuditEvent(ctx, auditEventForSubscription("subscription_created", Subscription{}, result, nil)); err != nil {
		return Subscription{}, err
	}
	return result, nil
}

func (r *repository) getSubscription(ctx context.Context, id string) (Subscription, error) {
	item, err := scanSubscription(r.db.QueryRowContext(ctx, `SELECT `+subscriptionSelectColumns+` FROM subscriptions WHERE id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errNotFound
	}
	return item, err
}

type subscriptionAuditExecer interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}

func (r *repository) createSubscriptionAuditEvent(ctx context.Context, event subscriptionAuditEvent) error {
	return createSubscriptionAuditEvent(ctx, r.db, event)
}

func createSubscriptionAuditEvent(ctx context.Context, execer subscriptionAuditExecer, event subscriptionAuditEvent) error {
	if event.EventType == "" {
		return errInvalid
	}
	if len(event.Metadata) == 0 {
		event.Metadata = []byte(`{}`)
	}
	_, err := execer.ExecContext(ctx, `
		INSERT INTO subscription_audit_events (
			subscription_id, application_id, organisation_id, owner_type, owner_id, event_type,
			previous_status, new_status, previous_plan_id, new_plan_id, actor_id, metadata
		)
		VALUES (
			NULLIF($1, ''), $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12
		)
	`, event.SubscriptionID, event.ApplicationID, event.OrganisationID, event.OwnerType, event.OwnerID, event.EventType, event.PreviousStatus, event.NewStatus, event.PreviousPlanID, event.NewPlanID, event.ActorID, event.Metadata)
	return err
}

func auditEventForSubscription(eventType string, previous Subscription, current Subscription, metadata map[string]string) subscriptionAuditEvent {
	encodedMetadata, _ := json.Marshal(metadata)
	return subscriptionAuditEvent{
		SubscriptionID: current.ID,
		ApplicationID:  current.ApplicationID,
		OrganisationID: current.OrganisationID,
		OwnerType:      current.OwnerType,
		OwnerID:        current.OwnerID,
		EventType:      eventType,
		PreviousStatus: previous.Status,
		NewStatus:      current.Status,
		PreviousPlanID: previous.PlanID,
		NewPlanID:      current.PlanID,
		Metadata:       encodedMetadata,
	}
}

func (r *repository) setSubscriptionStatus(ctx context.Context, id string, status string, planID string) (Subscription, error) {
	if status == "" {
		status = "CANCELLED"
	}
	previous, err := r.getSubscription(ctx, id)
	if err != nil {
		return Subscription{}, err
	}
	query := `UPDATE subscriptions SET status = $2, cancelled_at = CASE WHEN $2 = 'CANCELLED' THEN now() ELSE cancelled_at END, updated_at = now()`
	args := []any{id, status}
	if planID != "" {
		query += `, plan_id = $3`
		args = append(args, planID)
	}
	query += ` WHERE id = $1 RETURNING ` + subscriptionSelectColumns
	item, err := scanSubscription(r.db.QueryRowContext(ctx, query, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errNotFound
	}
	if err != nil {
		return Subscription{}, err
	}
	if err := r.createSubscriptionAuditEvent(ctx, auditEventForSubscription("subscription_status_updated", previous, item, nil)); err != nil {
		return Subscription{}, err
	}
	return item, nil
}

func (r *repository) cancelSubscriptionAtPeriodEnd(ctx context.Context, id string) (Subscription, error) {
	previous, err := r.getSubscription(ctx, id)
	if err != nil {
		return Subscription{}, err
	}
	item, err := scanSubscription(r.db.QueryRowContext(ctx, `
		UPDATE subscriptions
		SET status = 'cancel_at_period_end',
		    cancel_at = billing_period_end,
		    cancelled_at = NULL,
		    updated_at = now()
		WHERE id = $1
		  AND status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'active', 'past_due', 'scheduled_downgrade', 'cancel_at_period_end')
		RETURNING `+subscriptionSelectColumns+`
	`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errNotFound
	}
	if err != nil {
		return Subscription{}, err
	}
	if err := r.createSubscriptionAuditEvent(ctx, auditEventForSubscription("subscription_cancel_scheduled", previous, item, nil)); err != nil {
		return Subscription{}, err
	}
	return item, nil
}

func (r *repository) reactivateSubscription(ctx context.Context, id string) (Subscription, error) {
	previous, err := r.getSubscription(ctx, id)
	if err != nil {
		return Subscription{}, err
	}
	item, err := scanSubscription(r.db.QueryRowContext(ctx, `
		UPDATE subscriptions
		SET status = 'active',
		    cancel_at = NULL,
		    cancelled_at = NULL,
		    updated_at = now()
		WHERE id = $1
		  AND status = 'cancel_at_period_end'
		  AND (cancel_at IS NULL OR cancel_at > now())
		RETURNING `+subscriptionSelectColumns+`
	`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, errNotFound
	}
	if err != nil {
		return Subscription{}, err
	}
	if err := r.createSubscriptionAuditEvent(ctx, auditEventForSubscription("subscription_reactivated", previous, item, nil)); err != nil {
		return Subscription{}, err
	}
	return item, nil
}

func (r *repository) deleteSubscription(ctx context.Context, id string) error {
	previous, err := r.getSubscription(ctx, id)
	if err != nil {
		return err
	}
	result, err := r.db.ExecContext(ctx, `DELETE FROM subscriptions WHERE id = $1`, id)
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
	return r.createSubscriptionAuditEvent(ctx, auditEventForSubscription("subscription_deleted", previous, previous, nil))
}

func scanPlanChange(row interface{ Scan(...any) error }) (PlanChange, error) {
	var item PlanChange
	err := row.Scan(&item.ID, &item.SubscriptionID, &item.ApplicationID, &item.OrganisationID, &item.FromPlanID, &item.ToPlanID, &item.ChangeType, &item.Status, &item.EffectiveAt, &item.PaymentID, &item.CheckoutID, &item.RequestedBy, &item.ApprovedBy, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func scanPlanChanges(rows *sql.Rows) ([]PlanChange, error) {
	items := []PlanChange{}
	for rows.Next() {
		item, err := scanPlanChange(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *repository) listPlanChanges(ctx context.Context, subscriptionID string, limit, offset int) ([]PlanChange, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, subscription_id, application_id, organisation_id, COALESCE(from_plan_id, ''), COALESCE(to_plan_id, ''), change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by, created_at, updated_at
		FROM subscription_plan_changes
		WHERE subscription_id = $1
		ORDER BY created_at DESC
		LIMIT LEAST(GREATEST($2, 1), 100) OFFSET GREATEST($3, 0)
	`, subscriptionID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPlanChanges(rows)
}

func (r *repository) createPlanChange(ctx context.Context, item PlanChange) (PlanChange, error) {
	if item.SubscriptionID == "" || item.ChangeType == "" {
		return PlanChange{}, errInvalid
	}
	if item.Status == "" {
		item.Status = "requested"
	}
	if item.ID == "" {
		item.ID = newUUID()
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO subscription_plan_changes (id, subscription_id, application_id, organisation_id, from_plan_id, to_plan_id, change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by)
		SELECT $1, s.id, COALESCE(NULLIF($2, ''), s.owner_id), $3, NULLIF($4, ''), NULLIF($5, ''), $6, $7, $8, $9, $10, $11, $12
		FROM subscriptions s
		WHERE s.id = $13
		RETURNING id, subscription_id, application_id, organisation_id, COALESCE(from_plan_id, ''), COALESCE(to_plan_id, ''), change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by, created_at, updated_at
	`, item.ID, item.ApplicationID, item.OrganisationID, item.FromPlanID, item.ToPlanID, item.ChangeType, item.Status, item.EffectiveAt, item.PaymentID, item.CheckoutID, item.RequestedBy, item.ApprovedBy, item.SubscriptionID)
	result, err := scanPlanChange(row)
	if errors.Is(err, sql.ErrNoRows) {
		return PlanChange{}, errNotFound
	}
	return result, err
}

func (r *repository) applyDueScheduledDowngrades(ctx context.Context, now time.Time, limit int) ([]PlanChange, []BillingEvent, error) {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, subscription_id, application_id, organisation_id, COALESCE(from_plan_id, ''), COALESCE(to_plan_id, ''), change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by, created_at, updated_at
		FROM subscription_plan_changes
		WHERE change_type = 'downgrade'
		  AND status = 'scheduled'
		  AND effective_at IS NOT NULL
		  AND effective_at <= $1
		  AND COALESCE(to_plan_id, '') <> ''
		ORDER BY effective_at ASC, created_at ASC
		LIMIT LEAST(GREATEST($2, 1), 500)
	`, now, limit)
	if err != nil {
		return nil, nil, err
	}
	due, err := scanPlanChanges(rows)
	if closeErr := rows.Close(); closeErr != nil && err == nil {
		err = closeErr
	}
	if err != nil {
		return nil, nil, err
	}
	applied := []PlanChange{}
	events := []BillingEvent{}
	for _, change := range due {
		appliedChange, event, err := r.applyScheduledDowngrade(ctx, change.ID, now)
		if err != nil {
			return nil, nil, err
		}
		if appliedChange.ID != "" {
			applied = append(applied, appliedChange)
			events = append(events, event)
		}
	}
	return applied, events, nil
}

func (r *repository) applyScheduledDowngrade(ctx context.Context, planChangeID string, appliedAt time.Time) (PlanChange, BillingEvent, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	defer tx.Rollback()
	change, err := scanPlanChange(tx.QueryRowContext(ctx, `
		SELECT id, subscription_id, application_id, organisation_id, COALESCE(from_plan_id, ''), COALESCE(to_plan_id, ''), change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by, created_at, updated_at
		FROM subscription_plan_changes
		WHERE id = $1
		FOR UPDATE
	`, planChangeID))
	if errors.Is(err, sql.ErrNoRows) {
		return PlanChange{}, BillingEvent{}, errNotFound
	}
	if err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	if change.ChangeType != "downgrade" || change.Status != "scheduled" || change.ToPlanID == "" || change.EffectiveAt == nil || change.EffectiveAt.After(appliedAt) {
		return PlanChange{}, BillingEvent{}, nil
	}
	previous, err := scanSubscription(tx.QueryRowContext(ctx, `
		SELECT `+subscriptionSelectColumns+`
		FROM subscriptions
		WHERE id = $1
		FOR UPDATE
	`, change.SubscriptionID))
	if err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	updatedSubscription, err := scanSubscription(tx.QueryRowContext(ctx, `
		UPDATE subscriptions
		SET plan_id = $2,
		    status = 'active',
		    updated_at = now()
		WHERE id = $1
		RETURNING `+subscriptionSelectColumns+`
	`, change.SubscriptionID, change.ToPlanID))
	if err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	if err := createSubscriptionAuditEvent(ctx, tx, auditEventForSubscription("scheduled_downgrade_applied", previous, updatedSubscription, map[string]string{"plan_change_id": change.ID})); err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	appliedChange, err := scanPlanChange(tx.QueryRowContext(ctx, `
		UPDATE subscription_plan_changes
		SET status = 'applied',
		    updated_at = now()
		WHERE id = $1
		RETURNING id, subscription_id, application_id, organisation_id, COALESCE(from_plan_id, ''), COALESCE(to_plan_id, ''), change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by, created_at, updated_at
	`, change.ID))
	if err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	metadata, err := json.Marshal(map[string]string{"applied_at": appliedAt.Format(time.RFC3339)})
	if err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	event, err := scanBillingEvent(tx.QueryRowContext(ctx, `
		INSERT INTO subscription_billing_events (subscription_id, plan_change_id, payment_id, event_type, status, amount_minor, currency, provider, provider_reference, metadata)
		VALUES ($1, $2, $3, 'scheduled_downgrade_applied', $4, 0, 'GBP', 'subscription-service', $2, $5::jsonb)
		RETURNING id, COALESCE(subscription_id, ''), COALESCE(plan_change_id, ''), payment_id, event_type, status, amount_minor, currency, provider, provider_reference, metadata, created_at
	`, appliedChange.SubscriptionID, appliedChange.ID, appliedChange.PaymentID, appliedChange.Status, metadata))
	if err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	if err := tx.Commit(); err != nil {
		return PlanChange{}, BillingEvent{}, err
	}
	return appliedChange, event, nil
}

func (r *repository) recordPlanChangePaymentResult(ctx context.Context, planChangeID string, result planChangePaymentResult) (PlanChange, Subscription, BillingEvent, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return PlanChange{}, Subscription{}, BillingEvent{}, err
	}
	defer tx.Rollback()
	change, err := scanPlanChange(tx.QueryRowContext(ctx, `
		SELECT id, subscription_id, application_id, organisation_id, COALESCE(from_plan_id, ''), COALESCE(to_plan_id, ''), change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by, created_at, updated_at
		FROM subscription_plan_changes
		WHERE id = $1
		FOR UPDATE
	`, planChangeID))
	if errors.Is(err, sql.ErrNoRows) {
		return PlanChange{}, Subscription{}, BillingEvent{}, errNotFound
	}
	if err != nil {
		return PlanChange{}, Subscription{}, BillingEvent{}, err
	}
	paymentID := strings.TrimSpace(result.PaymentID)
	if paymentID == "" {
		paymentID = change.PaymentID
	}
	success := result.Status == "success" || result.Status == "succeeded"
	nextStatus := "failed"
	eventType := "payment_failed"
	if success {
		nextStatus = "payment_confirmed"
		eventType = "payment_confirmed"
	}
	appliedPlanID := change.ToPlanID
	if success && appliedPlanID == "" {
		return PlanChange{}, Subscription{}, BillingEvent{}, errInvalid
	}
	updatedChange, err := scanPlanChange(tx.QueryRowContext(ctx, `
		UPDATE subscription_plan_changes
		SET status = $2,
		    payment_id = COALESCE(NULLIF($3, ''), payment_id),
		    updated_at = now()
		WHERE id = $1
		RETURNING id, subscription_id, application_id, organisation_id, COALESCE(from_plan_id, ''), COALESCE(to_plan_id, ''), change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by, created_at, updated_at
	`, change.ID, nextStatus, paymentID))
	if err != nil {
		return PlanChange{}, Subscription{}, BillingEvent{}, err
	}
	subscription, err := scanSubscription(tx.QueryRowContext(ctx, `
		SELECT `+subscriptionSelectColumns+`
		FROM subscriptions
		WHERE id = $1
		FOR UPDATE
	`, change.SubscriptionID))
	if err != nil {
		return PlanChange{}, Subscription{}, BillingEvent{}, err
	}
	if success {
		previous := subscription
		subscription, err = scanSubscription(tx.QueryRowContext(ctx, `
			UPDATE subscriptions
			SET plan_id = $2,
			    status = 'active',
			    updated_at = now()
			WHERE id = $1
			RETURNING `+subscriptionSelectColumns+`
		`, change.SubscriptionID, appliedPlanID))
		if err != nil {
			return PlanChange{}, Subscription{}, BillingEvent{}, err
		}
		if err := createSubscriptionAuditEvent(ctx, tx, auditEventForSubscription("plan_change_applied", previous, subscription, map[string]string{"plan_change_id": change.ID, "payment_id": paymentID})); err != nil {
			return PlanChange{}, Subscription{}, BillingEvent{}, err
		}
		updatedChange, err = scanPlanChange(tx.QueryRowContext(ctx, `
			UPDATE subscription_plan_changes
			SET status = 'applied',
			    updated_at = now()
			WHERE id = $1
			RETURNING id, subscription_id, application_id, organisation_id, COALESCE(from_plan_id, ''), COALESCE(to_plan_id, ''), change_type, status, effective_at, payment_id, checkout_id, requested_by, approved_by, created_at, updated_at
		`, change.ID))
		if err != nil {
			return PlanChange{}, Subscription{}, BillingEvent{}, err
		}
		eventType = "plan_change_applied"
	}
	eventAmountMinor := 0
	eventCurrency := "GBP"
	if success {
		_ = tx.QueryRowContext(ctx, `
			SELECT amount_minor, currency
			FROM subscription_billing_events
			WHERE plan_change_id = $1
			  AND event_type = 'checkout_created'
			ORDER BY created_at DESC
			LIMIT 1
		`, updatedChange.ID).Scan(&eventAmountMinor, &eventCurrency)
	}
	provider := strings.TrimSpace(result.Provider)
	if provider == "" {
		provider = "payment-service"
	}
	providerReference := strings.TrimSpace(result.ProviderReference)
	if providerReference == "" {
		providerReference = updatedChange.CheckoutID
	}
	metadata, err := json.Marshal(map[string]string{"payment_status": result.Status})
	if err != nil {
		return PlanChange{}, Subscription{}, BillingEvent{}, err
	}
	event, err := scanBillingEvent(tx.QueryRowContext(ctx, `
		INSERT INTO subscription_billing_events (subscription_id, plan_change_id, payment_id, event_type, status, amount_minor, currency, provider, provider_reference, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
		RETURNING id, COALESCE(subscription_id, ''), COALESCE(plan_change_id, ''), payment_id, event_type, status, amount_minor, currency, provider, provider_reference, metadata, created_at
	`, updatedChange.SubscriptionID, updatedChange.ID, updatedChange.PaymentID, eventType, updatedChange.Status, eventAmountMinor, eventCurrency, provider, providerReference, metadata))
	if err != nil {
		return PlanChange{}, Subscription{}, BillingEvent{}, err
	}
	if err := tx.Commit(); err != nil {
		return PlanChange{}, Subscription{}, BillingEvent{}, err
	}
	return updatedChange, subscription, event, nil
}

func scanBillingEvent(row interface{ Scan(...any) error }) (BillingEvent, error) {
	var item BillingEvent
	err := row.Scan(&item.ID, &item.SubscriptionID, &item.PlanChangeID, &item.PaymentID, &item.EventType, &item.Status, &item.AmountMinor, &item.Currency, &item.Provider, &item.ProviderReference, &item.Metadata, &item.CreatedAt)
	return item, err
}

func scanBillingEvents(rows *sql.Rows) ([]BillingEvent, error) {
	items := []BillingEvent{}
	for rows.Next() {
		item, err := scanBillingEvent(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *repository) listBillingEvents(ctx context.Context, subscriptionID string, limit, offset int) ([]BillingEvent, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(subscription_id, ''), COALESCE(plan_change_id, ''), payment_id, event_type, status, amount_minor, currency, provider, provider_reference, metadata, created_at
		FROM subscription_billing_events
		WHERE subscription_id = $1
		ORDER BY created_at DESC
		LIMIT LEAST(GREATEST($2, 1), 100) OFFSET GREATEST($3, 0)
	`, subscriptionID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBillingEvents(rows)
}

func (r *repository) createBillingEvent(ctx context.Context, item BillingEvent) (BillingEvent, error) {
	if item.EventType == "" {
		return BillingEvent{}, errInvalid
	}
	if item.Currency == "" {
		item.Currency = "GBP"
	}
	if len(item.Metadata) == 0 {
		item.Metadata = json.RawMessage(`{}`)
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO subscription_billing_events (subscription_id, plan_change_id, payment_id, event_type, status, amount_minor, currency, provider, provider_reference, metadata)
		VALUES (NULLIF($1, ''), NULLIF($2, ''), $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, COALESCE(subscription_id, ''), COALESCE(plan_change_id, ''), payment_id, event_type, status, amount_minor, currency, provider, provider_reference, metadata, created_at
	`, item.SubscriptionID, item.PlanChangeID, item.PaymentID, item.EventType, item.Status, item.AmountMinor, item.Currency, item.Provider, item.ProviderReference, item.Metadata)
	return scanBillingEvent(row)
}

func (r *repository) entitlements(ctx context.Context, ownerID string) (Subscription, []PlanFeature, error) {
	return r.entitlementsByOwner(ctx, "application", ownerID)
}

func (r *repository) entitlementsByOwner(ctx context.Context, ownerType string, ownerID string) (Subscription, []PlanFeature, error) {
	subscriptions, features, err := r.entitlementsByOwnerAll(ctx, ownerType, ownerID)
	if err != nil {
		return Subscription{}, nil, err
	}
	if len(subscriptions) == 0 {
		return Subscription{}, []PlanFeature{}, nil
	}
	return subscriptions[0], features, nil
}

func (r *repository) entitlementsByOwnerAll(ctx context.Context, ownerType string, ownerID string) ([]Subscription, []PlanFeature, error) {
	subscriptions, err := r.activeSubscriptionsByOwner(ctx, ownerType, ownerID)
	if err != nil {
		return nil, nil, err
	}
	if len(subscriptions) == 0 {
		return []Subscription{}, []PlanFeature{}, nil
	}
	featuresByFeatureID := map[string]PlanFeature{}
	orderedFeatures := []PlanFeature{}
	for _, sub := range subscriptions {
		features, err := r.listPlanFeatures(ctx, sub.PlanID)
		if err != nil {
			return nil, nil, err
		}
		for _, feature := range features {
			key := strings.TrimSpace(feature.FeatureID)
			if key == "" {
				key = feature.ID
			}
			if _, exists := featuresByFeatureID[key]; exists {
				continue
			}
			featuresByFeatureID[key] = feature
			orderedFeatures = append(orderedFeatures, feature)
		}
	}
	return subscriptions, orderedFeatures, nil
}

func (r *repository) activeSubscriptionsByOwner(ctx context.Context, ownerType string, ownerID string) ([]Subscription, error) {
	ownerType = strings.ToLower(strings.TrimSpace(ownerType))
	ownerID = strings.TrimSpace(ownerID)
	if ownerType == "" || ownerID == "" {
		return nil, errInvalid
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+subscriptionSelectColumns+`
		FROM subscriptions
		WHERE owner_type = $1
		  AND owner_id = $2
		  AND status IN ('ACTIVE', 'TRIAL', 'active', 'scheduled_downgrade', 'cancel_at_period_end')
		  AND (status != 'cancel_at_period_end' OR cancel_at IS NULL OR cancel_at > now())
		ORDER BY created_at DESC
	`, ownerType, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSubscriptions(rows)
}

func (r *repository) activeSubscription(ctx context.Context, ownerType string, ownerID string) (Subscription, error) {
	items, err := r.activeSubscriptionsByOwner(ctx, ownerType, ownerID)
	if err != nil {
		return Subscription{}, err
	}
	if len(items) == 0 {
		return Subscription{}, errNotFound
	}
	return items[0], nil
}

func (r *repository) planIncludesFeature(ctx context.Context, planID string, featureID string) (bool, error) {
	var included bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM plan_features pf
			JOIN product_features f ON f.id = pf.feature_id
			JOIN products p ON p.id = f.product_id
			WHERE pf.plan_id = $1
			  AND pf.feature_id = $2
			  AND f.status = 'ACTIVE'
			  AND f.is_selectable = true
			  AND p.status = 'ACTIVE'
			  AND p.is_selectable = true
		)
	`, planID, featureID).Scan(&included)
	return included, err
}

func (r *repository) activeOwnerIncludesFeature(ctx context.Context, ownerType string, ownerID string, featureID string) (Subscription, bool, error) {
	subscriptions, _, err := r.entitlementsByOwnerAll(ctx, ownerType, ownerID)
	if err != nil {
		return Subscription{}, false, err
	}
	if len(subscriptions) == 0 {
		return Subscription{}, false, errNotFound
	}
	for _, subscription := range subscriptions {
		included, err := r.planIncludesFeature(ctx, subscription.PlanID, featureID)
		if err != nil {
			return Subscription{}, false, err
		}
		if included {
			return subscription, true, nil
		}
	}
	return subscriptions[0], false, nil
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
