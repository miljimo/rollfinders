package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

func (s *server) requireRepository(w http.ResponseWriter, r *http.Request) bool {
	if s.repo != nil {
		return true
	}
	writeError(w, r, http.StatusServiceUnavailable, "not_ready", "Subscriptions database is not available.")
	return false
}

func decodeJSON(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func statusForError(err error) (int, string, string) {
	switch {
	case errors.Is(err, errNotFound):
		return http.StatusNotFound, "not_found", "Requested record was not found."
	case errors.Is(err, errInvalid):
		return http.StatusBadRequest, "invalid_request", "Request validation failed."
	case errors.Is(err, errDuplicate):
		return http.StatusConflict, "duplicate_record", "Request contains duplicate records."
	case errors.Is(err, errConflict):
		return http.StatusConflict, "conflict", "Request conflicts with current state."
	default:
		return http.StatusInternalServerError, "internal_error", "Subscription service request failed."
	}
}

func (s *server) handleError(w http.ResponseWriter, r *http.Request, err error, logMessage string) {
	status, code, message := statusForError(err)
	if status == http.StatusInternalServerError {
		s.logger.Error(logMessage, "request_id", requestIDFrom(r), "error", err)
	}
	writeError(w, r, status, code, message)
}

func (s *server) listProducts(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	products, err := s.repo.listProducts(r.Context(), intQuery(r, "limit", 50), intQuery(r, "offset", 0), r.URL.Query().Get("status"))
	if err != nil {
		s.handleError(w, r, err, "product list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"products": products, "pagination": pagination(intQuery(r, "limit", 50), intQuery(r, "offset", 0), len(products))})
}

func (s *server) createProduct(w http.ResponseWriter, r *http.Request) {
	s.upsertProduct(w, r, "")
}

func (s *server) getProduct(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	product, err := s.repo.getProduct(r.Context(), r.PathValue("product_key"))
	if err != nil {
		s.handleError(w, r, err, "product get failed")
		return
	}
	features, err := s.repo.listFeatures(r.Context(), 100, 0, product.Key)
	if err != nil {
		s.handleError(w, r, err, "product feature list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"product": product, "features": features})
}

func (s *server) updateProduct(w http.ResponseWriter, r *http.Request) {
	s.upsertProduct(w, r, r.PathValue("product_key"))
}

func (s *server) upsertProduct(w http.ResponseWriter, r *http.Request, pathKey string) {
	if !s.requireRepository(w, r) {
		return
	}
	var product Product
	if err := decodeJSON(r, &product); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if pathKey != "" {
		product.Key = pathKey
	}
	result, err := s.repo.upsertProduct(r.Context(), product)
	if err != nil {
		s.handleError(w, r, err, "product upsert failed")
		return
	}
	status := http.StatusOK
	if pathKey == "" {
		status = http.StatusCreated
	}
	writeJSON(w, status, map[string]any{"product": result})
}

func (s *server) listFeatures(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	features, err := s.repo.listFeatures(r.Context(), intQuery(r, "limit", 100), intQuery(r, "offset", 0), r.URL.Query().Get("product_key"))
	if err != nil {
		s.handleError(w, r, err, "feature list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"features": features, "pagination": pagination(intQuery(r, "limit", 100), intQuery(r, "offset", 0), len(features))})
}

func (s *server) createFeature(w http.ResponseWriter, r *http.Request) {
	s.upsertFeature(w, r, "")
}

func (s *server) getFeature(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	feature, err := s.repo.getFeature(r.Context(), r.PathValue("feature_key"))
	if err != nil {
		s.handleError(w, r, err, "feature get failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"feature": feature})
}

func (s *server) updateFeature(w http.ResponseWriter, r *http.Request) {
	s.upsertFeature(w, r, r.PathValue("feature_key"))
}

func (s *server) upsertFeature(w http.ResponseWriter, r *http.Request, pathKey string) {
	if !s.requireRepository(w, r) {
		return
	}
	var feature ProductFeature
	if err := decodeJSON(r, &feature); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if pathKey != "" {
		feature.Key = pathKey
	}
	result, err := s.repo.upsertFeature(r.Context(), feature)
	if err != nil {
		s.handleError(w, r, err, "feature upsert failed")
		return
	}
	status := http.StatusOK
	if pathKey == "" {
		status = http.StatusCreated
	}
	writeJSON(w, status, map[string]any{"feature": result})
}

func (s *server) listPlans(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	plans, err := s.repo.listPlans(r.Context(), intQuery(r, "limit", 50), intQuery(r, "offset", 0))
	if err != nil {
		s.handleError(w, r, err, "plan list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"plans": plans, "pagination": pagination(intQuery(r, "limit", 50), intQuery(r, "offset", 0), len(plans))})
}

func (s *server) createPlan(w http.ResponseWriter, r *http.Request) {
	s.upsertPlan(w, r, "")
}

func (s *server) getPlan(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	plan, err := s.repo.getPlan(r.Context(), r.PathValue("plan_key"))
	if err != nil {
		s.handleError(w, r, err, "plan get failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"plan": plan})
}

func (s *server) updatePlan(w http.ResponseWriter, r *http.Request) {
	s.upsertPlan(w, r, r.PathValue("plan_key"))
}

func (s *server) upsertPlan(w http.ResponseWriter, r *http.Request, pathKey string) {
	if !s.requireRepository(w, r) {
		return
	}
	var plan Plan
	if err := decodeJSON(r, &plan); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if pathKey != "" {
		plan.Key = pathKey
	}
	result, err := s.repo.upsertPlan(r.Context(), plan)
	if err != nil {
		s.handleError(w, r, err, "plan upsert failed")
		return
	}
	status := http.StatusOK
	if pathKey == "" {
		status = http.StatusCreated
	}
	writeJSON(w, status, map[string]any{"plan": result})
}

type replacePlanFeaturesRequest struct {
	Features    []PlanFeature `json:"features"`
	FeatureKeys []string      `json:"feature_keys"`
}

func (s *server) replacePlanFeatures(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req replacePlanFeaturesRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	features := req.Features
	for _, key := range req.FeatureKeys {
		features = append(features, PlanFeature{FeatureKey: key})
	}
	result, err := s.repo.replacePlanFeatures(r.Context(), r.PathValue("plan_key"), features)
	if err != nil {
		s.handleError(w, r, err, "plan features replace failed")
		return
	}
	plan, _ := s.repo.getPlan(r.Context(), r.PathValue("plan_key"))
	plan.Features = result
	writeJSON(w, http.StatusOK, map[string]any{"plan": plan, "features": result})
}

func (s *server) availableProductFeatures(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	products, err := s.repo.listProducts(r.Context(), 100, 0, "ACTIVE")
	if err != nil {
		s.handleError(w, r, err, "available products failed")
		return
	}
	features, err := s.repo.listFeatures(r.Context(), 100, 0, "")
	if err != nil {
		s.handleError(w, r, err, "available features failed")
		return
	}
	activeFeatures := []ProductFeature{}
	for _, feature := range features {
		if feature.Status == "ACTIVE" && feature.PlanSelectable {
			activeFeatures = append(activeFeatures, feature)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"application_id": r.PathValue("application_id"),
		"source":         "subscription_catalogue",
		"fallback":       false,
		"products":       products,
		"features":       activeFeatures,
	})
}

func (s *server) listSubscriptions(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	items, err := s.repo.listSubscriptions(r.Context(), r.PathValue("application_id"), intQuery(r, "limit", 50), intQuery(r, "offset", 0))
	if err != nil {
		s.handleError(w, r, err, "subscription list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscriptions": items, "pagination": pagination(intQuery(r, "limit", 50), intQuery(r, "offset", 0), len(items))})
}

type createSubscriptionRequest struct {
	OrganisationID     string `json:"organisation_id"`
	PlanKey            string `json:"plan_key"`
	Status             string `json:"status"`
	BillingPeriodStart string `json:"billing_period_start"`
	BillingPeriodEnd   string `json:"billing_period_end"`
}

func (s *server) createSubscription(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req createSubscriptionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	item := Subscription{OrganisationID: req.OrganisationID, ApplicationID: r.PathValue("application_id"), PlanKey: req.PlanKey, Status: req.Status}
	item.BillingStart = parseTimeOr(req.BillingPeriodStart, time.Now().UTC())
	item.BillingEnd = parseTimeOr(req.BillingPeriodEnd, item.BillingStart.AddDate(0, 1, 0))
	result, err := s.repo.createSubscription(r.Context(), item)
	if err != nil {
		s.handleError(w, r, err, "subscription create failed")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"subscription": result})
}

func (s *server) getSubscription(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	item, err := s.repo.getSubscription(r.Context(), r.PathValue("subscription_id"))
	if err != nil {
		s.handleError(w, r, err, "subscription get failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscription": item})
}

func (s *server) cancelSubscription(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	item, err := s.repo.setSubscriptionStatus(r.Context(), r.PathValue("subscription_id"), "CANCELLED", "")
	if err != nil {
		s.handleError(w, r, err, "subscription cancel failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscription": item})
}

type changePlanRequest struct {
	PlanKey string `json:"plan_key"`
}

func (s *server) changePlan(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req changePlanRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if strings.TrimSpace(req.PlanKey) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "plan_key is required.")
		return
	}
	item, err := s.repo.setSubscriptionStatus(r.Context(), r.PathValue("subscription_id"), "ACTIVE", req.PlanKey)
	if err != nil {
		s.handleError(w, r, err, "subscription change plan failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscription": item})
}

func (s *server) entitlements(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	subscription, features, err := s.repo.entitlements(r.Context(), r.PathValue("application_id"))
	if err != nil {
		s.handleError(w, r, err, "entitlement lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"organisation_id": subscription.OrganisationID,
		"application_id":  r.PathValue("application_id"),
		"subscription_id": subscription.ID,
		"plan_key":        subscription.PlanKey,
		"status":          subscription.Status,
		"features":        features,
	})
}

func parseTimeOr(value string, fallback time.Time) time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return fallback
	}
	return parsed
}
