package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
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
	features, err := s.repo.listFeatures(r.Context(), 100, 0, product.ID)
	if err != nil {
		s.handleError(w, r, err, "product feature list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"product": product, "features": features})
}

func (s *server) updateProduct(w http.ResponseWriter, r *http.Request) {
	s.upsertProduct(w, r, r.PathValue("product_key"))
}

func (s *server) suspendProduct(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	result, err := s.repo.setProductStatus(r.Context(), r.PathValue("product_key"), "INACTIVE")
	if err != nil {
		s.handleError(w, r, err, "product suspend failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"product": result})
}

func (s *server) deleteProduct(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	if err := s.repo.deleteProduct(r.Context(), r.PathValue("product_key")); err != nil {
		s.handleError(w, r, err, "product delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
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
		product.ID = pathKey
	} else {
		product.ID = newUUID()
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
	features, err := s.repo.listFeatures(r.Context(), intQuery(r, "limit", 100), intQuery(r, "offset", 0), r.URL.Query().Get("product_id"))
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

func (s *server) disableFeature(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	result, err := s.repo.setFeatureStatus(r.Context(), r.PathValue("feature_key"), "INACTIVE")
	if err != nil {
		s.handleError(w, r, err, "feature disable failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"feature": result})
}

func (s *server) deleteFeature(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	if err := s.repo.deleteFeature(r.Context(), r.PathValue("feature_key")); err != nil {
		s.handleError(w, r, err, "feature delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (s *server) upsertFeature(w http.ResponseWriter, r *http.Request, pathKey string) {
	if !s.requireRepository(w, r) {
		return
	}
	var feature ProductFeature
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&feature); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err == nil {
		if _, ok := raw["subscription_controlled"]; !ok {
			feature.SubscriptionControlled = true
		}
	}
	if pathKey != "" {
		feature.ID = pathKey
	} else {
		feature.ID = newUUID()
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
	limit := intQuery(r, "limit", 50)
	offset := intQuery(r, "offset", 0)
	plans, err := s.repo.listPlans(r.Context(), limit+1, offset)
	if err != nil {
		s.handleError(w, r, err, "plan list failed")
		return
	}
	hasMore := len(plans) > limit
	if hasMore {
		plans = plans[:limit]
	}
	meta := pagination(limit, offset, len(plans))
	meta.HasMore = hasMore
	if hasMore {
		nextOffset := offset + len(plans)
		meta.NextOffset = &nextOffset
	} else {
		meta.NextOffset = nil
	}
	writeJSON(w, http.StatusOK, map[string]any{"plans": plans, "pagination": meta})
}

func (s *server) listBillingCycles(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	cycles, err := s.repo.listBillingCycles(r.Context())
	if err != nil {
		s.handleError(w, r, err, "billing cycle list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"billing_cycles": cycles})
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

func (s *server) suspendPlan(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	result, err := s.repo.setPlanStatus(r.Context(), r.PathValue("plan_key"), "INACTIVE")
	if err != nil {
		s.handleError(w, r, err, "plan suspend failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"plan": result})
}

func (s *server) deletePlan(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	if err := s.repo.deletePlan(r.Context(), r.PathValue("plan_key")); err != nil {
		s.handleError(w, r, err, "plan delete failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (s *server) upsertPlan(w http.ResponseWriter, r *http.Request, pathKey string) {
	if !s.requireRepository(w, r) {
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	var plan Plan
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&plan); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	raw := map[string]json.RawMessage{}
	if err := json.Unmarshal(body, &raw); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	if pathKey != "" {
		plan.ID = pathKey
	} else {
		plan.ID = newUUID()
	}
	result, err := s.repo.upsertPlan(r.Context(), plan)
	if err != nil {
		s.handleError(w, r, err, "plan upsert failed")
		return
	}
	if _, hasFeatures := raw["features"]; hasFeatures {
		result.Features, err = s.repo.replacePlanFeatures(r.Context(), result.ID, plan.Features)
		if err != nil {
			s.handleError(w, r, err, "plan features replace failed")
			return
		}
	}
	if _, hasFeatureIDs := raw["included_feature_ids"]; hasFeatureIDs {
		features := make([]PlanFeature, 0, len(plan.IncludedFeatureIDs))
		for _, id := range plan.IncludedFeatureIDs {
			features = append(features, PlanFeature{FeatureID: id})
		}
		result.Features, err = s.repo.replacePlanFeatures(r.Context(), result.ID, features)
		if err != nil {
			s.handleError(w, r, err, "plan features replace failed")
			return
		}
	}
	if _, hasFeatureIDs := raw["feature_ids"]; hasFeatureIDs {
		features := make([]PlanFeature, 0)
		var ids []string
		if err := json.Unmarshal(raw["feature_ids"], &ids); err != nil {
			writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
			return
		}
		for _, id := range ids {
			features = append(features, PlanFeature{FeatureID: id})
		}
		result.Features, err = s.repo.replacePlanFeatures(r.Context(), result.ID, features)
		if err != nil {
			s.handleError(w, r, err, "plan features replace failed")
			return
		}
	}
	status := http.StatusOK
	if pathKey == "" {
		status = http.StatusCreated
	}
	writeJSON(w, status, map[string]any{"plan": result})
}

type replacePlanFeaturesRequest struct {
	Features   []PlanFeature `json:"features"`
	FeatureIDs []string      `json:"feature_ids"`
}

type replacePlanProductsRequest struct {
	ProductIDs []string `json:"product_ids"`
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
	for _, id := range req.FeatureIDs {
		features = append(features, PlanFeature{FeatureID: id})
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

func (s *server) replacePlanProducts(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req replacePlanProductsRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	result, err := s.repo.replacePlanProducts(r.Context(), r.PathValue("plan_key"), req.ProductIDs)
	if err != nil {
		s.handleError(w, r, err, "plan products replace failed")
		return
	}
	plan, _ := s.repo.getPlan(r.Context(), r.PathValue("plan_key"))
	plan.Products = result
	writeJSON(w, http.StatusOK, map[string]any{"plan": plan, "products": result})
}

func (s *server) listOwnerPolicies(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	items, err := s.repo.listOwnerPolicies(r.Context())
	if err != nil {
		s.handleError(w, r, err, "owner policy list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"owner_policies": items})
}

func (s *server) getOwnerPolicy(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	item, err := s.repo.getOwnerPolicy(r.Context(), r.PathValue("owner_type"))
	if err != nil {
		s.handleError(w, r, err, "owner policy get failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"owner_policy": item})
}

type updateOwnerPolicyRequest struct {
	SubscriptionSupported bool   `json:"subscription_supported"`
	SubscriptionRequired  bool   `json:"subscription_required"`
	DefaultPlanID         string `json:"default_plan_id"`
}

func (s *server) updateOwnerPolicy(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req updateOwnerPolicyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	item, err := s.repo.updateOwnerPolicy(r.Context(), SubscriptionOwnerPolicy{
		OwnerType:             r.PathValue("owner_type"),
		SubscriptionSupported: req.SubscriptionSupported,
		SubscriptionRequired:  req.SubscriptionRequired,
		DefaultPlanID:         req.DefaultPlanID,
	})
	if err != nil {
		s.handleError(w, r, err, "owner policy update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"owner_policy": item})
}

func (s *server) availableProductFeatures(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	applicationID := r.PathValue("application_id")
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
		if feature.Status == "ACTIVE" && feature.IsSelectable {
			activeFeatures = append(activeFeatures, feature)
		}
	}
	source := "organisation_service"
	fallback := false
	candidate := false
	bootstrapCandidates := []bootstrapProductCandidate{}
	services, err := s.org.listApplicationServices(r.Context(), applicationID)
	if err != nil {
		source = "bootstrap_fallback"
		fallback = true
		candidate = true
		if permissions, permissionErr := s.authz.listPermissions(r.Context()); permissionErr == nil {
			bootstrapCandidates = bootstrapCandidatesFromPermissions(permissions)
		}
	} else {
		enabledServices := map[string]bool{}
		for _, service := range services {
			if service.Enabled {
				enabledServices[strings.ToLower(strings.TrimSpace(service.ServiceKey))] = true
			}
		}
		enabledProductIDs := map[string]bool{}
		filteredProducts := []Product{}
		for _, product := range products {
			if enabledServices[strings.ToLower(strings.TrimSpace(product.ServiceID))] {
				filteredProducts = append(filteredProducts, product)
				enabledProductIDs[product.ID] = true
			}
		}
		filteredFeatures := []ProductFeature{}
		for _, feature := range activeFeatures {
			if enabledProductIDs[feature.ProductID] {
				filteredFeatures = append(filteredFeatures, feature)
			}
		}
		products = filteredProducts
		activeFeatures = filteredFeatures
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"application_id":       applicationID,
		"source":               source,
		"fallback":             fallback,
		"candidate_data":       candidate,
		"products":             products,
		"features":             activeFeatures,
		"bootstrap_candidates": bootstrapCandidates,
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

func (s *server) listOwnerSubscriptions(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	items, err := s.repo.listSubscriptionsByOwner(r.Context(), r.PathValue("owner_type"), r.PathValue("owner_id"), intQuery(r, "limit", 50), intQuery(r, "offset", 0))
	if err != nil {
		s.handleError(w, r, err, "owner subscription list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscriptions": items, "pagination": pagination(intQuery(r, "limit", 50), intQuery(r, "offset", 0), len(items))})
}

func (s *server) currentApplicationSubscription(w http.ResponseWriter, r *http.Request) {
	s.currentSubscriptionForOwner(w, r, "application", r.PathValue("application_id"))
}

func (s *server) currentOwnerSubscription(w http.ResponseWriter, r *http.Request) {
	s.currentSubscriptionForOwner(w, r, r.PathValue("owner_type"), r.PathValue("owner_id"))
}

func (s *server) currentSubscriptionForOwner(w http.ResponseWriter, r *http.Request, ownerType string, ownerID string) {
	if !s.requireRepository(w, r) {
		return
	}
	item, err := s.repo.activeSubscription(r.Context(), ownerType, ownerID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			writeJSON(w, http.StatusOK, map[string]any{"subscription": nil, "pending_change": nil, "billing_events": []BillingEvent{}, "cancellation": nil})
			return
		}
		s.handleError(w, r, err, "current owner subscription lookup failed")
		return
	}
	response, err := s.currentSubscriptionResponse(r.Context(), item)
	if err != nil {
		s.handleError(w, r, err, "current owner subscription state lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *server) currentSubscriptionResponse(ctx context.Context, item Subscription) (map[string]any, error) {
	planChanges, err := s.repo.listPlanChanges(ctx, item.ID, 10, 0)
	if err != nil {
		return nil, err
	}
	pendingChange := PlanChange{}
	for _, change := range planChanges {
		switch change.Status {
		case "requested", "checkout_pending", "payment_confirmed", "scheduled":
			pendingChange = change
		}
		if pendingChange.ID != "" {
			break
		}
	}
	billingEvents, err := s.repo.listBillingEvents(ctx, item.ID, 10, 0)
	if err != nil {
		return nil, err
	}
	var cancellation any
	if item.Status == "cancel_at_period_end" {
		cancellation = map[string]any{
			"status":    item.Status,
			"cancel_at": item.CancelAt,
		}
	}
	response := map[string]any{
		"subscription":   item,
		"pending_change": nil,
		"billing_events": billingEvents,
		"cancellation":   cancellation,
	}
	if pendingChange.ID != "" {
		response["pending_change"] = pendingChange
	}
	return response, nil
}

type createSubscriptionRequest struct {
	ApplicationID      string `json:"application_id"`
	OwnerType          string `json:"owner_type"`
	OwnerID            string `json:"owner_id"`
	OrganisationID     string `json:"organisation_id"`
	PlanID             string `json:"plan_id"`
	Status             string `json:"status"`
	BillingPeriodStart string `json:"billing_period_start"`
	BillingPeriodEnd   string `json:"billing_period_end"`
}

func (s *server) createSubscription(w http.ResponseWriter, r *http.Request) {
	s.createSubscriptionForOwner(w, r, "application", r.PathValue("application_id"))
}

func (s *server) createOwnerSubscription(w http.ResponseWriter, r *http.Request) {
	s.createSubscriptionForOwner(w, r, r.PathValue("owner_type"), r.PathValue("owner_id"))
}

func (s *server) createSubscriptionForOwner(w http.ResponseWriter, r *http.Request, pathOwnerType string, pathOwnerID string) {
	if !s.requireRepository(w, r) {
		return
	}
	var req createSubscriptionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	ownerType := strings.TrimSpace(req.OwnerType)
	if ownerType == "" {
		ownerType = strings.TrimSpace(pathOwnerType)
	}
	ownerID := strings.TrimSpace(req.OwnerID)
	if ownerID == "" {
		ownerID = strings.TrimSpace(pathOwnerID)
	}
	applicationID := strings.TrimSpace(req.ApplicationID)
	if applicationID == "" && pathOwnerType == "application" {
		applicationID = strings.TrimSpace(pathOwnerID)
	}
	organisationID := strings.TrimSpace(req.OrganisationID)
	if pathOwnerType == "application" && applicationID != "" {
		application, err := s.org.getApplication(r.Context(), applicationID)
		if err != nil {
			s.handleError(w, r, err, "application organisation lookup failed")
			return
		}
		if application.OrganisationID == "" {
			s.handleError(w, r, errInvalid, "application organisation lookup failed")
			return
		}
		if organisationID != "" && organisationID != application.OrganisationID {
			s.handleError(w, r, errInvalid, "application organisation mismatch")
			return
		}
		organisationID = application.OrganisationID
	}
	item := Subscription{
		ApplicationID:  applicationID,
		OrganisationID: organisationID,
		OwnerType:      ownerType,
		OwnerID:        ownerID,
		PlanID:         req.PlanID,
		Status:         req.Status,
	}
	plan, err := s.repo.getPlan(r.Context(), req.PlanID)
	if err != nil {
		s.handleError(w, r, err, "subscription plan lookup failed")
		return
	}
	checkoutRequired := plan.PriceMinor > 0 && stripeBillableCycle(plan.BillingCycle)
	if checkoutRequired && activatesSubscription(item.Status) {
		item.Status = "checkout_pending"
	}
	item.BillingStart = parseTimeOr(req.BillingPeriodStart, time.Now().UTC())
	item.BillingEnd = parseTimeOr(req.BillingPeriodEnd, item.BillingStart.AddDate(0, 1, 0))
	result, err := s.repo.createSubscription(r.Context(), item)
	if err != nil {
		s.handleError(w, r, err, "subscription create failed")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"subscription": result, "checkout_required": checkoutRequired})
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
	item, err := s.repo.cancelSubscriptionAtPeriodEnd(r.Context(), r.PathValue("subscription_id"))
	if err != nil {
		s.handleError(w, r, err, "subscription cancel failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscription": item})
}

func (s *server) reactivateSubscription(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	item, err := s.repo.reactivateSubscription(r.Context(), r.PathValue("subscription_id"))
	if err != nil {
		s.handleError(w, r, err, "subscription reactivate failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscription": item})
}

func (s *server) suspendSubscription(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	item, err := s.repo.setSubscriptionStatus(r.Context(), r.PathValue("subscription_id"), "SUSPENDED", "")
	if err != nil {
		s.handleError(w, r, err, "subscription suspend failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscription": item})
}

type updateSubscriptionRequest struct {
	PlanID string `json:"plan_id"`
	Status string `json:"status"`
}

func (s *server) updateSubscription(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req updateSubscriptionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	status := strings.TrimSpace(req.Status)
	if status == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "status is required.")
		return
	}
	item, err := s.repo.setSubscriptionStatus(r.Context(), r.PathValue("subscription_id"), status, strings.TrimSpace(req.PlanID))
	if err != nil {
		s.handleError(w, r, err, "subscription update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscription": item})
}

func (s *server) deleteSubscription(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	if err := s.repo.deleteSubscription(r.Context(), r.PathValue("subscription_id")); err != nil {
		s.handleError(w, r, err, "subscription delete failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type changePlanRequest struct {
	PlanID string `json:"plan_id"`
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
	if strings.TrimSpace(req.PlanID) == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "plan_id is required.")
		return
	}
	item, err := s.repo.setSubscriptionStatus(r.Context(), r.PathValue("subscription_id"), "ACTIVE", req.PlanID)
	if err != nil {
		s.handleError(w, r, err, "subscription change plan failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"subscription": item})
}

type createPlanChangeRequest struct {
	PlanID         string `json:"plan_id"`
	ToPlanID       string `json:"to_plan_id"`
	ChangeType     string `json:"change_type"`
	OrganisationID string `json:"organisation_id"`
	RequestedBy    string `json:"requested_by"`
	PaymentID      string `json:"payment_id"`
	CheckoutID     string `json:"checkout_id"`
	EffectiveAt    string `json:"effective_at"`
}

type applyDuePlanChangesRequest struct {
	Now   string `json:"now"`
	Limit int    `json:"limit"`
}

type planChangePaymentResultRequest struct {
	Status            string `json:"status"`
	PaymentID         string `json:"payment_id"`
	Provider          string `json:"provider"`
	ProviderReference string `json:"provider_reference"`
}

type subscriptionCheckoutRequest struct {
	PlanID         string `json:"plan_id"`
	OrganisationID string `json:"organisation_id"`
	RequestedBy    string `json:"requested_by"`
	CustomerEmail  string `json:"customer_email"`
	SuccessURL     string `json:"success_url"`
	CancelURL      string `json:"cancel_url"`
	IdempotencyKey string `json:"idempotency_key"`
	PlanChangeID   string `json:"-"`
}

func (s *server) listPlanChanges(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	items, err := s.repo.listPlanChanges(r.Context(), r.PathValue("subscription_id"), intQuery(r, "limit", 50), intQuery(r, "offset", 0))
	if err != nil {
		s.handleError(w, r, err, "plan change list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"plan_changes": items, "pagination": pagination(intQuery(r, "limit", 50), intQuery(r, "offset", 0), len(items))})
}

func (s *server) listBillingEvents(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	items, err := s.repo.listBillingEvents(r.Context(), r.PathValue("subscription_id"), intQuery(r, "limit", 50), intQuery(r, "offset", 0))
	if err != nil {
		s.handleError(w, r, err, "billing event list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"billing_events": items, "pagination": pagination(intQuery(r, "limit", 50), intQuery(r, "offset", 0), len(items))})
}

func (s *server) createSubscriptionCheckout(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req subscriptionCheckoutRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	subscription, err := s.repo.getSubscription(r.Context(), r.PathValue("subscription_id"))
	if err != nil {
		s.handleError(w, r, err, "subscription get for checkout failed")
		return
	}
	toPlanID := strings.TrimSpace(req.PlanID)
	if toPlanID == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "plan_id is required.")
		return
	}
	fromPlan, err := s.repo.getPlan(r.Context(), subscription.PlanID)
	if err != nil {
		s.handleError(w, r, err, "current plan get for checkout failed")
		return
	}
	toPlan, err := s.repo.getPlan(r.Context(), toPlanID)
	if err != nil {
		s.handleError(w, r, err, "target plan get for checkout failed")
		return
	}
	changeType := inferPlanChangeType(fromPlan, toPlan)
	status := "checkout_pending"
	checkoutRequired := toPlan.PriceMinor > 0 && stripeBillableCycle(toPlan.BillingCycle)
	if !checkoutRequired {
		status = "applied"
	}
	planChangeID := newUUID()
	req.PlanChangeID = planChangeID
	if strings.TrimSpace(req.SuccessURL) == "" {
		req.SuccessURL = s.cfg.CheckoutSuccessURL
	}
	if strings.TrimSpace(req.CancelURL) == "" {
		req.CancelURL = s.cfg.CheckoutCancelURL
	}
	if strings.TrimSpace(req.IdempotencyKey) == "" {
		req.IdempotencyKey = "subscription-checkout:" + subscription.ID + ":" + toPlan.ID + ":" + planChangeID
	}
	session := checkoutSession{}
	if checkoutRequired {
		if !s.billing.configured() {
			writeError(w, r, http.StatusServiceUnavailable, "billing_not_configured", "Subscription billing provider is not configured.")
			return
		}
		session, err = s.billing.createSubscriptionCheckout(req, subscription, toPlan)
		if err != nil {
			s.logger.Error("subscription checkout create failed", "request_id", requestIDFrom(r), "error", err)
			writeError(w, r, http.StatusBadGateway, "billing_provider_error", "Subscription billing provider request failed.")
			return
		}
	}
	planChange, err := s.repo.createPlanChange(r.Context(), PlanChange{
		ID:             planChangeID,
		SubscriptionID: subscription.ID,
		ApplicationID:  subscription.OwnerID,
		OrganisationID: strings.TrimSpace(req.OrganisationID),
		FromPlanID:     subscription.PlanID,
		ToPlanID:       toPlan.ID,
		ChangeType:     changeType,
		Status:         status,
		CheckoutID:     session.ID,
		RequestedBy:    strings.TrimSpace(req.RequestedBy),
	})
	if err != nil {
		s.handleError(w, r, err, "checkout plan change create failed")
		return
	}
	eventType := "checkout_created"
	provider := "stripe"
	providerReference := session.ID
	if !checkoutRequired {
		eventType = "plan_change_applied"
		provider = "subscription-service"
		item, err := s.repo.setSubscriptionStatus(r.Context(), subscription.ID, "active", toPlan.ID)
		if err != nil {
			s.handleError(w, r, err, "subscription apply checkout-free plan change failed")
			return
		}
		subscription = item
	}
	event, err := s.repo.createBillingEvent(r.Context(), BillingEvent{
		SubscriptionID:    subscription.ID,
		PlanChangeID:      planChange.ID,
		EventType:         eventType,
		Status:            planChange.Status,
		AmountMinor:       toPlan.PriceMinor,
		Currency:          toPlan.Currency,
		Provider:          provider,
		ProviderReference: providerReference,
		Metadata:          checkoutMetadata(session.URL),
	})
	if err != nil {
		s.handleError(w, r, err, "checkout billing event create failed")
		return
	}
	response := map[string]any{
		"subscription":      subscription,
		"plan_change":       planChange,
		"billing_event":     event,
		"checkout_required": checkoutRequired,
	}
	if checkoutRequired {
		response["checkout"] = billingCheckoutResult{
			CheckoutURL: session.URL,
			SessionID:   session.ID,
			Provider:    "stripe",
		}
	}
	writeJSON(w, http.StatusCreated, response)
}

func (s *server) applyDuePlanChanges(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	req := applyDuePlanChangesRequest{Limit: 100}
	if r.Body != nil && r.ContentLength != 0 {
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
			return
		}
	}
	now := parseTimeOr(req.Now, time.Now().UTC())
	if req.Limit <= 0 || req.Limit > 500 {
		req.Limit = 100
	}
	planChanges, billingEvents, err := s.repo.applyDueScheduledDowngrades(r.Context(), now, req.Limit)
	if err != nil {
		s.handleError(w, r, err, "due plan changes apply failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"applied_plan_changes": planChanges,
		"billing_events":       billingEvents,
		"count":                len(planChanges),
	})
}

func (s *server) recordPlanChangePaymentResult(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req planChangePaymentResultRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "success" && status != "succeeded" && status != "failed" && status != "cancelled" && status != "canceled" && status != "expired" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "status is invalid.")
		return
	}
	planChange, subscription, event, err := s.repo.recordPlanChangePaymentResult(r.Context(), r.PathValue("plan_change_id"), planChangePaymentResult{
		Status:            status,
		PaymentID:         strings.TrimSpace(req.PaymentID),
		Provider:          strings.TrimSpace(req.Provider),
		ProviderReference: strings.TrimSpace(req.ProviderReference),
	})
	if err != nil {
		s.handleError(w, r, err, "plan change payment result failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"plan_change":   planChange,
		"subscription":  subscription,
		"billing_event": event,
	})
}

func (s *server) createPlanChange(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req createPlanChangeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	toPlanID := strings.TrimSpace(req.ToPlanID)
	if toPlanID == "" {
		toPlanID = strings.TrimSpace(req.PlanID)
	}
	subscription, err := s.repo.getSubscription(r.Context(), r.PathValue("subscription_id"))
	if err != nil {
		s.handleError(w, r, err, "subscription get for plan change failed")
		return
	}
	if toPlanID == "" && req.ChangeType != "cancel" && req.ChangeType != "reactivate" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "plan_id or to_plan_id is required.")
		return
	}
	fromPlan, err := s.repo.getPlan(r.Context(), subscription.PlanID)
	if err != nil {
		s.handleError(w, r, err, "current plan get for plan change failed")
		return
	}
	toPlan := Plan{}
	if toPlanID != "" {
		toPlan, err = s.repo.getPlan(r.Context(), toPlanID)
		if err != nil {
			s.handleError(w, r, err, "target plan get for plan change failed")
			return
		}
	}
	changeType := strings.TrimSpace(req.ChangeType)
	if changeType == "" {
		changeType = inferPlanChangeType(fromPlan, toPlan)
	}
	if !validPlanChangeType(changeType) {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "change_type is invalid.")
		return
	}
	status := "requested"
	var effectiveAt *time.Time
	if req.EffectiveAt != "" {
		parsed := parseTimeOr(req.EffectiveAt, time.Time{})
		if !parsed.IsZero() {
			effectiveAt = &parsed
		}
	}
	checkoutRequired := false
	if changeType == "downgrade" {
		status = "scheduled"
		if effectiveAt == nil {
			periodEnd := subscription.BillingEnd
			effectiveAt = &periodEnd
		}
	} else if toPlan.PriceMinor > 0 && toPlan.BillingCycle != "manual" {
		status = "checkout_pending"
		checkoutRequired = true
	} else if changeType == "switch" || changeType == "subscribe" || changeType == "upgrade" {
		status = "applied"
	}
	item := PlanChange{
		SubscriptionID: subscription.ID,
		ApplicationID:  subscription.OwnerID,
		OrganisationID: strings.TrimSpace(req.OrganisationID),
		FromPlanID:     subscription.PlanID,
		ToPlanID:       toPlanID,
		ChangeType:     changeType,
		Status:         status,
		EffectiveAt:    effectiveAt,
		PaymentID:      strings.TrimSpace(req.PaymentID),
		CheckoutID:     strings.TrimSpace(req.CheckoutID),
		RequestedBy:    strings.TrimSpace(req.RequestedBy),
	}
	result, err := s.repo.createPlanChange(r.Context(), item)
	if err != nil {
		s.handleError(w, r, err, "plan change create failed")
		return
	}
	eventType := "plan_change_requested"
	if checkoutRequired {
		eventType = "checkout_required"
	} else if status == "scheduled" {
		eventType = "plan_change_scheduled"
	} else if status == "applied" {
		eventType = "plan_change_applied"
		_, err = s.repo.setSubscriptionStatus(r.Context(), subscription.ID, "active", toPlanID)
		if err != nil {
			s.handleError(w, r, err, "subscription apply plan change failed")
			return
		}
	}
	event, err := s.repo.createBillingEvent(r.Context(), BillingEvent{
		SubscriptionID: subscription.ID,
		PlanChangeID:   result.ID,
		PaymentID:      result.PaymentID,
		EventType:      eventType,
		Status:         result.Status,
		AmountMinor:    toPlan.PriceMinor,
		Currency:       toPlan.Currency,
		Provider:       "payment-service",
		Metadata:       json.RawMessage(`{}`),
	})
	if err != nil {
		s.handleError(w, r, err, "billing event create failed")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"plan_change":       result,
		"billing_event":     event,
		"checkout_required": checkoutRequired,
	})
}

func checkoutMetadata(checkoutURL string) json.RawMessage {
	if strings.TrimSpace(checkoutURL) == "" {
		return json.RawMessage(`{}`)
	}
	body, err := json.Marshal(map[string]string{"checkout_url": checkoutURL})
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return body
}

func activatesSubscription(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", "active", "trial":
		return true
	default:
		return false
	}
}

func inferPlanChangeType(fromPlan Plan, toPlan Plan) string {
	if toPlan.ID == "" || fromPlan.ID == toPlan.ID {
		return "switch"
	}
	if toPlan.PriceMinor > fromPlan.PriceMinor {
		return "upgrade"
	}
	if toPlan.PriceMinor < fromPlan.PriceMinor {
		return "downgrade"
	}
	return "switch"
}

func validPlanChangeType(value string) bool {
	switch value {
	case "subscribe", "upgrade", "downgrade", "switch", "cancel", "reactivate":
		return true
	default:
		return false
	}
}

func (s *server) entitlements(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	applicationID := r.PathValue("application_id")
	subscription, features, err := s.repo.entitlements(r.Context(), applicationID)
	if err != nil {
		s.handleError(w, r, err, "entitlement lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"owner_type":      subscription.OwnerType,
		"owner_id":        subscription.OwnerID,
		"application_id":  applicationID,
		"subscription_id": subscription.ID,
		"plan_id":         subscription.PlanID,
		"status":          subscription.Status,
		"features":        features,
	})
}

func (s *server) ownerEntitlements(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	ownerType := strings.ToLower(strings.TrimSpace(r.PathValue("owner_type")))
	ownerID := strings.TrimSpace(r.PathValue("owner_id"))
	subscription, features, err := s.repo.entitlementsByOwner(r.Context(), ownerType, ownerID)
	if err != nil {
		s.handleError(w, r, err, "owner entitlement lookup failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"owner_type":      ownerType,
		"owner_id":        ownerID,
		"subscription_id": subscription.ID,
		"plan_id":         subscription.PlanID,
		"status":          subscription.Status,
		"features":        features,
	})
}

type entitlementCheckRequest struct {
	OwnerType      string `json:"owner_type"`
	OwnerID        string `json:"owner_id"`
	FeatureKey     string `json:"feature_key"`
	SubjectID      string `json:"subject_id"`
	Permission     string `json:"permission"`
	ApplicationID  string `json:"application_id"`
	OrganisationID string `json:"organisation_id"`
	ResourceID     string `json:"resource_id"`
	Route          string `json:"route"`
	HTTPMethod     string `json:"http_method"`
}

type entitlementCheckResponse struct {
	Allowed                bool                    `json:"allowed"`
	Decision               string                  `json:"decision"`
	Reason                 string                  `json:"reason"`
	OwnerPolicy            SubscriptionOwnerPolicy `json:"owner_policy"`
	SubscriptionID         string                  `json:"subscription_id,omitempty"`
	PlanID                 string                  `json:"plan_id,omitempty"`
	FeatureKey             string                  `json:"feature_key"`
	FeatureID              string                  `json:"feature_id,omitempty"`
	SubscriptionControlled bool                    `json:"subscription_controlled"`
	OwnerType              string                  `json:"owner_type"`
	OwnerID                string                  `json:"owner_id"`
	ApplicationID          string                  `json:"application_id,omitempty"`
	OrganisationID         string                  `json:"organisation_id,omitempty"`
	ResourceID             string                  `json:"resource_id,omitempty"`
}

func (s *server) auditEntitlementDenial(r *http.Request, req entitlementCheckRequest, response entitlementCheckResponse) {
	metadata, err := json.Marshal(map[string]string{
		"request_id":            requestIDFrom(r),
		"subject_id":            strings.TrimSpace(req.SubjectID),
		"resource_id":           strings.TrimSpace(req.ResourceID),
		"route":                 strings.TrimSpace(req.Route),
		"http_method":           strings.TrimSpace(req.HTTPMethod),
		"permission":            strings.TrimSpace(req.Permission),
		"feature_key":           response.FeatureKey,
		"iam_decision":          "allow",
		"subscription_decision": "deny",
		"final_decision":        "deny",
		"reason":                response.Reason,
	})
	if err != nil {
		return
	}
	if err := s.repo.createSubscriptionAuditEvent(r.Context(), subscriptionAuditEvent{
		SubscriptionID: response.SubscriptionID,
		ApplicationID:  response.ApplicationID,
		OrganisationID: response.OrganisationID,
		OwnerType:      response.OwnerType,
		OwnerID:        response.OwnerID,
		EventType:      "subscription_check_denied",
		NewStatus:      "deny",
		ActorID:        strings.TrimSpace(req.SubjectID),
		Metadata:       metadata,
	}); err != nil {
		s.logger.Warn("subscription denial audit failed", "request_id", requestIDFrom(r), "error", err)
	}
}

func (s *server) checkEntitlement(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}
	var req entitlementCheckRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	req.OwnerType = strings.ToLower(strings.TrimSpace(req.OwnerType))
	req.OwnerID = strings.TrimSpace(req.OwnerID)
	req.FeatureKey = strings.ToLower(strings.TrimSpace(req.FeatureKey))
	if req.OwnerType == "" || req.OwnerID == "" || req.FeatureKey == "" {
		writeError(w, r, http.StatusBadRequest, "invalid_request", "owner_type, owner_id, and feature_key are required.")
		return
	}

	policy, err := s.repo.getOwnerPolicy(r.Context(), req.OwnerType)
	if err != nil {
		s.handleError(w, r, err, "owner policy lookup failed")
		return
	}
	response := entitlementCheckResponse{
		Allowed:        true,
		Decision:       "ALLOW",
		Reason:         "IAM_ONLY",
		OwnerPolicy:    policy,
		FeatureKey:     req.FeatureKey,
		OwnerType:      req.OwnerType,
		OwnerID:        req.OwnerID,
		ApplicationID:  strings.TrimSpace(req.ApplicationID),
		OrganisationID: strings.TrimSpace(req.OrganisationID),
		ResourceID:     strings.TrimSpace(req.ResourceID),
	}
	if !policy.SubscriptionSupported && !policy.SubscriptionRequired {
		writeJSON(w, http.StatusOK, response)
		return
	}

	feature, err := s.repo.getFeature(r.Context(), req.FeatureKey)
	if err != nil {
		if errors.Is(err, errNotFound) {
			response.Allowed = false
			response.Decision = "DENY"
			response.Reason = "PLAN_FEATURE_NOT_INCLUDED"
			s.auditEntitlementDenial(r, req, response)
			writeJSON(w, http.StatusOK, response)
			return
		}
		s.handleError(w, r, err, "entitlement feature lookup failed")
		return
	}
	response.FeatureID = feature.ID
	response.FeatureKey = feature.FeatureKey
	response.SubscriptionControlled = feature.SubscriptionControlled
	if !feature.SubscriptionControlled {
		response.Reason = "FEATURE_NOT_SUBSCRIPTION_CONTROLLED"
		writeJSON(w, http.StatusOK, response)
		return
	}

	subscription, err := s.repo.activeSubscription(r.Context(), req.OwnerType, req.OwnerID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			if !policy.SubscriptionRequired {
				response.Reason = "NO_ACTIVE_SUBSCRIPTION_IAM_ONLY"
				writeJSON(w, http.StatusOK, response)
				return
			}
			response.Allowed = false
			response.Decision = "DENY"
			response.Reason = "SUBSCRIPTION_REQUIRED"
			s.auditEntitlementDenial(r, req, response)
			writeJSON(w, http.StatusOK, response)
			return
		}
		s.handleError(w, r, err, "active subscription lookup failed")
		return
	}
	response.SubscriptionID = subscription.ID
	response.PlanID = subscription.PlanID

	included, err := s.repo.planIncludesFeature(r.Context(), subscription.PlanID, feature.ID)
	if err != nil {
		s.handleError(w, r, err, "plan feature lookup failed")
		return
	}
	if !included {
		response.Allowed = false
		response.Decision = "DENY"
		response.Reason = "PLAN_FEATURE_NOT_INCLUDED"
		s.auditEntitlementDenial(r, req, response)
		writeJSON(w, http.StatusOK, response)
		return
	}
	response.Reason = "PLAN_FEATURE_INCLUDED"
	writeJSON(w, http.StatusOK, response)
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
