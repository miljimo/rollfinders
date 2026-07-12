package server

import "time"

type usageRequest struct {
	IdempotencyKey     string     `json:"idempotency_key,omitempty"`
	OwnerType          string     `json:"owner_type"`
	OwnerID            string     `json:"owner_id"`
	SubscriptionPlanID string     `json:"subscription_plan_id,omitempty"`
	ResourceType       string     `json:"resource_type"`
	ActionKey          string     `json:"action_key"`
	Amount             int        `json:"amount"`
	PeriodType         string     `json:"period_type"`
	PeriodStart        *time.Time `json:"period_start,omitempty"`
	PeriodEnd          *time.Time `json:"period_end,omitempty"`
}

type usageDecision struct {
	Allowed       bool   `json:"allowed"`
	ReservationID string `json:"reservation_id,omitempty"`
	Decision      string `json:"decision"`
	Reason        string `json:"reason,omitempty"`
	Limit         *int   `json:"limit"`
	Used          int    `json:"used"`
	Reserved      int    `json:"reserved"`
	Remaining     *int   `json:"remaining"`
	PeriodType    string `json:"period_type"`
}

type ownerSummary struct {
	OwnerType string        `json:"owner_type"`
	OwnerID   string        `json:"owner_id"`
	Items     []summaryItem `json:"items"`
	Audit     []auditEvent  `json:"audit_events"`
}

type summaryItem struct {
	ResourceType string     `json:"resource_type"`
	ActionKey    string     `json:"action_key"`
	PeriodType   string     `json:"period_type"`
	PeriodStart  *time.Time `json:"period_start,omitempty"`
	PeriodEnd    *time.Time `json:"period_end,omitempty"`
	Used         int        `json:"used"`
	Reserved     int        `json:"reserved"`
}

type auditEvent struct {
	ID                 string    `json:"id"`
	SubscriptionPlanID string    `json:"subscription_plan_id,omitempty"`
	ResourceType       string    `json:"resource_type"`
	ActionKey          string    `json:"action_key"`
	Decision           string    `json:"decision"`
	Reason             string    `json:"reason,omitempty"`
	Limit              *int      `json:"limit"`
	Used               *int      `json:"used"`
	Reserved           *int      `json:"reserved"`
	Amount             *int      `json:"amount"`
	CreatedAt          time.Time `json:"created_at"`
}

type reservationRecord struct {
	ID string
	usageRequest
	Status string
}
