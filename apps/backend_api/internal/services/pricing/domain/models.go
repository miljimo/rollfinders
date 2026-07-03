package domain

import "time"

type PlatformFeePolicy struct {
	ID                    string       `json:"id"`
	PolicyType            PolicyType   `json:"policy_type"`
	ProviderID            string       `json:"provider_id"`
	PercentageBasisPoints int          `json:"percentage_basis_points"`
	FixedAmountMinor      int64        `json:"fixed_amount_minor"`
	Currency              Currency     `json:"currency"`
	Status                PolicyStatus `json:"status"`
	Version               int          `json:"version"`
	CreatedBy             string       `json:"created_by,omitempty"`
	UpdatedBy             string       `json:"updated_by,omitempty"`
	CreatedAt             time.Time    `json:"created_at"`
	UpdatedAt             time.Time    `json:"updated_at"`
}

type PlatformFeePreview struct {
	AmountMinor           int64    `json:"amount_minor"`
	ProviderID            string   `json:"provider_id"`
	Currency              Currency `json:"currency"`
	PercentageBasisPoints int      `json:"percentage_basis_points"`
	FixedAmountMinor      int64    `json:"fixed_amount_minor"`
	PercentageFeeMinor    int64    `json:"percentage_fee_minor"`
	PlatformFeeMinor      int64    `json:"platform_fee_minor"`
	NetAmountMinor        int64    `json:"net_amount_minor"`
	PolicyID              string   `json:"policy_id"`
	PolicyVersion         int      `json:"policy_version"`
}
