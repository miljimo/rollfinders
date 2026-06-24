package server

import (
	"encoding/json"
	"strings"
)

const defaultMinimumPayoutAmount int64 = 100

type createPayoutRequestPayload struct {
	ClientID             string `json:"client_id"`
	Amount               int64  `json:"amount"`
	Currency             string `json:"currency"`
	DestinationAccountID string `json:"destination_account_id"`
	RequestedBy          string `json:"requested_by"`
	Notes                string `json:"notes"`
}

type payoutTransitionPayload struct {
	ActorID           string `json:"actor_id"`
	ProviderReference string `json:"provider_reference"`
	Reason            string `json:"reason"`
	Notes             string `json:"notes"`
}

type payoutRequestListResponse struct {
	PayoutRequests []PayoutRequest `json:"payout_requests"`
	Count          int             `json:"count"`
	Pagination     paginationMeta  `json:"pagination"`
}

func decodeCreatePayoutRequest(raw []byte) (createPayoutRequestPayload, map[string]string) {
	var req createPayoutRequestPayload
	details := map[string]string{}
	if err := json.Unmarshal(raw, &req); err != nil {
		details["body"] = "does not match the payout request schema"
		return req, details
	}
	req.ClientID = strings.TrimSpace(req.ClientID)
	req.Currency = strings.ToUpper(strings.TrimSpace(req.Currency))
	req.DestinationAccountID = strings.TrimSpace(req.DestinationAccountID)
	req.RequestedBy = strings.TrimSpace(req.RequestedBy)
	req.Notes = strings.TrimSpace(req.Notes)
	if req.ClientID == "" {
		details["client_id"] = "required"
	}
	if req.Amount <= 0 {
		details["amount"] = "must be a positive integer in minor currency units"
	}
	if !validCurrency(req.Currency) {
		details["currency"] = "must be a three-letter uppercase currency code"
	}
	if req.DestinationAccountID == "" {
		details["destination_account_id"] = "required"
	}
	return req, details
}

func decodePayoutTransition(raw []byte) (payoutTransitionPayload, map[string]string) {
	var req payoutTransitionPayload
	details := map[string]string{}
	if len(raw) > 0 && string(raw) != "{}" {
		if err := json.Unmarshal(raw, &req); err != nil {
			details["body"] = "does not match the payout transition schema"
			return req, details
		}
	}
	req.ActorID = strings.TrimSpace(req.ActorID)
	req.ProviderReference = strings.TrimSpace(req.ProviderReference)
	req.Reason = strings.TrimSpace(req.Reason)
	req.Notes = strings.TrimSpace(req.Notes)
	return req, details
}

func validPayoutTransition(from, to string) bool {
	if from == to {
		return true
	}
	allowed := map[string][]string{
		payoutStatusPendingReview: {payoutStatusApproved, payoutStatusHeld, payoutStatusRejected, payoutStatusCancelled},
		payoutStatusHeld:          {payoutStatusPendingReview, payoutStatusApproved, payoutStatusRejected},
		payoutStatusApproved:      {payoutStatusProcessing, payoutStatusPaid, payoutStatusHeld, payoutStatusFailed},
		payoutStatusProcessing:    {payoutStatusPaid, payoutStatusFailed},
		payoutStatusFailed:        {payoutStatusApproved, payoutStatusCancelled},
	}
	for _, candidate := range allowed[from] {
		if candidate == to {
			return true
		}
	}
	return false
}

func payoutEventPayload(p PayoutRequest) map[string]any {
	return map[string]any{
		"payout_request_id": p.ID,
		"client_id":         p.ClientID,
		"payee_id":          p.PayeeID,
		"status":            p.Status,
		"amount":            p.Amount,
		"currency":          p.Currency,
		"updated_at":        p.UpdatedAt,
	}
}

func clonePayoutRequest(p *PayoutRequest) *PayoutRequest {
	cp := *p
	return &cp
}
