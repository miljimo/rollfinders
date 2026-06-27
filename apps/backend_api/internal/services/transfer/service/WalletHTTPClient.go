package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"rollfinders/internal/services/transfer/domain"
)

type WalletHTTPClient struct {
	baseURL string
	client  *http.Client
}

func NewWalletHTTPClient(baseURL string, timeout time.Duration) *WalletHTTPClient {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return &WalletHTTPClient{baseURL: strings.TrimRight(baseURL, "/"), client: &http.Client{Timeout: timeout}}
}

func (client *WalletHTTPClient) CreateTransfer(ctx context.Context, input domain.TransferRequest) (domain.WalletTransaction, error) {
	payload := map[string]interface{}{
		"source_wallet_id":      input.SourceWalletID,
		"destination_wallet_id": input.DestinationWalletID,
		"amount":                input.Amount,
		"currency":              input.Currency,
		"reference_type":        input.ReferenceType,
		"reference_id":          input.ReferenceID,
		"description":           input.Description,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return domain.WalletTransaction{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, client.baseURL+"/v1/wallets/transfer", bytes.NewReader(body))
	if err != nil {
		return domain.WalletTransaction{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", input.IdempotencyKey)
	resp, err := client.client.Do(req)
	if err != nil {
		return domain.WalletTransaction{}, domain.ErrWalletServiceUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if resp.StatusCode == http.StatusBadGateway || resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusGatewayTimeout {
			return domain.WalletTransaction{}, domain.ErrWalletServiceUnavailable
		}
		return domain.WalletTransaction{}, domain.ErrWalletTransferFailed
	}
	var transaction domain.WalletTransaction
	if err := json.NewDecoder(resp.Body).Decode(&transaction); err != nil {
		return domain.WalletTransaction{}, errors.Join(domain.ErrWalletTransferFailed, err)
	}
	return transaction, nil
}
