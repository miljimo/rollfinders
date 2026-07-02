package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

type transferCreateResponse struct {
	Transfer transferRecord `json:"transfer"`
}

type transferRecord struct {
	ID                  string `json:"id"`
	Status              string `json:"status"`
	SourceWalletID      string `json:"source_wallet_id"`
	DestinationWalletID string `json:"destination_wallet_id"`
	Amount              int64  `json:"amount"`
	Currency            string `json:"currency"`
	ReferenceType       string `json:"reference_type,omitempty"`
	ReferenceID         string `json:"reference_id,omitempty"`
	Description         string `json:"description,omitempty"`
	IdempotencyKey      string `json:"idempotency_key,omitempty"`
	FailureReason       string `json:"failure_reason,omitempty"`
}

type walletTransferResponse struct {
	ID string `json:"id"`
}

func (s *server) orchestrateTransfer(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_request_body", "Request body could not be read.", nil)
		return
	}
	defer r.Body.Close()

	client := &http.Client{Timeout: 10 * time.Second}
	createResult, status, responseBody, err := s.postTransferServiceJSON(r, client, "/v1/transfers", body)
	if err != nil {
		writeError(w, r, http.StatusBadGateway, "transfer_service_unavailable", "Transfer service could not create the transfer request.", nil)
		return
	}
	if status < 200 || status >= 300 {
		writeRawServiceResponse(w, status, responseBody)
		return
	}
	if createResult.Transfer.ID == "" {
		writeError(w, r, http.StatusBadGateway, "transfer_response_invalid", "Transfer service returned an invalid transfer response.", nil)
		return
	}

	_, _, _, _ = s.updateTransferStatus(r, client, createResult.Transfer.ID, "PROCESSING", "")

	walletPayload := map[string]any{
		"type":                  "TRANSFER",
		"source_wallet_id":      createResult.Transfer.SourceWalletID,
		"destination_wallet_id": createResult.Transfer.DestinationWalletID,
		"amount":                createResult.Transfer.Amount,
		"currency":              createResult.Transfer.Currency,
		"reference_type":        coalesce(createResult.Transfer.ReferenceType, "transfer"),
		"reference_id":          coalesce(createResult.Transfer.ReferenceID, createResult.Transfer.ID),
		"description":           createResult.Transfer.Description,
	}
	walletBody, _ := json.Marshal(walletPayload)
	walletStatus, walletResponseBody, walletErr := s.postServiceJSONWithIdempotency(r, client, s.cfg.WalletBaseURL+"/v1/wallets/transfer", walletBody, createResult.Transfer.ID)
	if walletErr != nil || walletStatus < 200 || walletStatus >= 300 {
		reason := transferFailureReason(walletStatus, walletResponseBody)
		if walletErr != nil {
			reason = walletErr.Error()
		}
		_ = s.markTransferFailed(r, client, createResult.Transfer.ID, reason)
		if walletErr != nil {
			writeError(w, r, http.StatusBadGateway, "wallet_service_unavailable", "Wallet service could not apply the transfer ledger movement.", nil)
			return
		}
		writeRawServiceResponse(w, walletStatus, walletResponseBody)
		return
	}

	var walletResult walletTransferResponse
	if err := json.Unmarshal(walletResponseBody, &walletResult); err != nil || walletResult.ID == "" {
		_ = s.markTransferFailed(r, client, createResult.Transfer.ID, "Wallet service returned an invalid transfer response.")
		writeError(w, r, http.StatusBadGateway, "wallet_response_invalid", "Wallet service returned an invalid transfer response.", nil)
		return
	}

	completed, status, completedBody, err := s.completeTransfer(r, client, createResult.Transfer.ID)
	if err != nil {
		writeError(w, r, http.StatusBadGateway, "transfer_service_unavailable", "Transfer service could not complete the transfer request.", nil)
		return
	}
	if status < 200 || status >= 300 {
		writeRawServiceResponse(w, status, completedBody)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"transfer": completed.Transfer, "wallet_transaction": walletResult})
}

func (s *server) postTransferServiceJSON(r *http.Request, client *http.Client, path string, body []byte) (transferCreateResponse, int, []byte, error) {
	status, responseBody, err := s.postServiceJSON(r, client, s.cfg.TransferBaseURL+path, body)
	if err != nil {
		return transferCreateResponse{}, status, responseBody, err
	}
	var decoded transferCreateResponse
	if status >= 200 && status < 300 {
		if err := json.Unmarshal(responseBody, &decoded); err != nil {
			return transferCreateResponse{}, status, responseBody, err
		}
	}
	return decoded, status, responseBody, nil
}

func (s *server) completeTransfer(r *http.Request, client *http.Client, transferID string) (transferCreateResponse, int, []byte, error) {
	return s.updateTransferStatus(r, client, transferID, "COMPLETED", "")
}

func (s *server) markTransferFailed(r *http.Request, client *http.Client, transferID string, reason string) error {
	_, _, _, err := s.updateTransferStatus(r, client, transferID, "FAILED", reason)
	return err
}

func (s *server) updateTransferStatus(r *http.Request, client *http.Client, transferID string, status string, failureReason string) (transferCreateResponse, int, []byte, error) {
	body, _ := json.Marshal(map[string]string{
		"status":         status,
		"failure_reason": failureReason,
	})
	return s.postTransferServiceJSON(r, client, "/v1/transfers/"+transferID+"/status", body)
}

func (s *server) postServiceJSON(r *http.Request, client *http.Client, target string, body []byte) (int, []byte, error) {
	return s.postServiceJSONWithIdempotency(r, client, target, body, r.Header.Get("Idempotency-Key"))
}

func (s *server) postServiceJSONWithIdempotency(r *http.Request, client *http.Client, target string, body []byte, idempotencyKey string) (int, []byte, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, target, bytes.NewReader(body))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	if requestID := requestIDFrom(r); requestID != "" {
		req.Header.Set(requestIDHeader, requestID)
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, err
	}
	return resp.StatusCode, responseBody, nil
}

func writeRawServiceResponse(w http.ResponseWriter, status int, body []byte) {
	if status == 0 {
		status = http.StatusBadGateway
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func coalesce(value string, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}

func transferFailureReason(status int, body []byte) string {
	if len(body) == 0 {
		return "Wallet service returned an unsuccessful response."
	}
	return strings.TrimSpace(string(body))
}
