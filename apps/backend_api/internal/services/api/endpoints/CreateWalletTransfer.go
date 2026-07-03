package endpoints

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"rollfinders/internal/services/api/domain"
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

type ErrorWriter func(w http.ResponseWriter, r *http.Request, status int, code string, message string, details any)

type WalletTransferOptions struct {
	TransferBaseURL string
	WalletBaseURL   string
	RequestIDFrom   func(*http.Request) string
	WriteError      ErrorWriter
}

type walletTransferEndpoint struct {
	opts WalletTransferOptions
}

func CreateWalletTransfer(opts WalletTransferOptions) http.HandlerFunc {
	endpoint := walletTransferEndpoint{opts: opts}
	return endpoint.handle
}

func (trans walletTransferEndpoint) handle(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		trans.writeError(w, r, http.StatusBadRequest, domain.ErrorCodeInvalidRequestBody, domain.ErrorMessageInvalidRequestBody, nil)
		return
	}
	defer r.Body.Close()

	client := &http.Client{Timeout: 10 * time.Second}
	createResult, status, responseBody, err := trans.postTransferServiceJSON(r, client, domain.TransferCreatePath, body)
	if err != nil {
		trans.writeError(w, r, http.StatusBadGateway, domain.ErrorCodeTransferServiceUnavailable, domain.ErrorMessageTransferCreateFailed, nil)
		return
	}
	if status < 200 || status >= 300 {
		writeRawServiceResponse(w, status, responseBody)
		return
	}
	if createResult.Transfer.ID == "" {
		trans.writeError(w, r, http.StatusBadGateway, domain.ErrorCodeTransferResponseInvalid, domain.ErrorMessageTransferInvalid, nil)
		return
	}

	_, _, _, _ = trans.updateTransferStatus(r, client, createResult.Transfer.ID, domain.TransferStatusProcessing, "")

	walletPayload := map[string]any{
		domain.JSONKeyType:                domain.TransferType,
		domain.JSONKeySourceWalletID:      createResult.Transfer.SourceWalletID,
		domain.JSONKeyDestinationWalletID: createResult.Transfer.DestinationWalletID,
		domain.JSONKeyAmount:              createResult.Transfer.Amount,
		domain.JSONKeyCurrency:            createResult.Transfer.Currency,
		domain.JSONKeyReferenceType:       coalesce(createResult.Transfer.ReferenceType, domain.TransferReferenceType),
		domain.JSONKeyReferenceID:         coalesce(createResult.Transfer.ReferenceID, createResult.Transfer.ID),
		domain.JSONKeyDescription:         createResult.Transfer.Description,
	}
	walletBody, _ := json.Marshal(walletPayload)
	walletStatus, walletResponseBody, walletErr := trans.postServiceJSONWithIdempotency(r, client, trans.opts.WalletBaseURL+domain.WalletTransferPath, walletBody, createResult.Transfer.ID)
	if walletErr != nil || walletStatus < 200 || walletStatus >= 300 {
		reason := transferFailureReason(walletStatus, walletResponseBody)
		if walletErr != nil {
			reason = walletErr.Error()
		}
		_ = trans.markTransferFailed(r, client, createResult.Transfer.ID, reason)
		if walletErr != nil {
			trans.writeError(w, r, http.StatusBadGateway, domain.ErrorCodeWalletServiceUnavailable, domain.ErrorMessageWalletApplyFailed, nil)
			return
		}
		writeRawServiceResponse(w, walletStatus, walletResponseBody)
		return
	}

	var walletResult walletTransferResponse
	if err := json.Unmarshal(walletResponseBody, &walletResult); err != nil || walletResult.ID == "" {
		_ = trans.markTransferFailed(r, client, createResult.Transfer.ID, domain.ErrorMessageWalletInvalid)
		trans.writeError(w, r, http.StatusBadGateway, domain.ErrorCodeWalletResponseInvalid, domain.ErrorMessageWalletInvalid, nil)
		return
	}

	completed, status, completedBody, err := trans.completeTransfer(r, client, createResult.Transfer.ID)
	if err != nil {
		trans.writeError(w, r, http.StatusBadGateway, domain.ErrorCodeTransferServiceUnavailable, domain.ErrorMessageTransferCompleteFailed, nil)
		return
	}
	if status < 200 || status >= 300 {
		writeRawServiceResponse(w, status, completedBody)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{domain.JSONKeyTransfer: completed.Transfer, domain.JSONKeyWalletTransaction: walletResult})
}

func (trans walletTransferEndpoint) postTransferServiceJSON(r *http.Request, client *http.Client, path string, body []byte) (transferCreateResponse, int, []byte, error) {
	status, responseBody, err := trans.postServiceJSON(r, client, trans.opts.TransferBaseURL+path, body)
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

func (trans walletTransferEndpoint) completeTransfer(r *http.Request, client *http.Client, transferID string) (transferCreateResponse, int, []byte, error) {
	return trans.updateTransferStatus(r, client, transferID, domain.TransferStatusCompleted, "")
}

func (trans walletTransferEndpoint) markTransferFailed(r *http.Request, client *http.Client, transferID string, reason string) error {
	_, _, _, err := trans.updateTransferStatus(r, client, transferID, domain.TransferStatusFailed, reason)
	return err
}

func (trans walletTransferEndpoint) updateTransferStatus(r *http.Request, client *http.Client, transferID string, status string, failureReason string) (transferCreateResponse, int, []byte, error) {
	body, _ := json.Marshal(map[string]string{
		domain.JSONKeyStatus:        status,
		domain.JSONKeyFailureReason: failureReason,
	})
	return trans.postTransferServiceJSON(r, client, fmt.Sprintf(domain.TransferStatusPathFormat, transferID), body)
}

func (trans walletTransferEndpoint) postServiceJSON(r *http.Request, client *http.Client, target string, body []byte) (int, []byte, error) {
	return trans.postServiceJSONWithIdempotency(r, client, target, body, r.Header.Get(domain.IdempotencyHeader))
}

func (trans walletTransferEndpoint) postServiceJSONWithIdempotency(r *http.Request, client *http.Client, target string, body []byte, idempotencyKey string) (int, []byte, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, target, bytes.NewReader(body))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
	if idempotencyKey != "" {
		req.Header.Set(domain.IdempotencyHeader, idempotencyKey)
	}
	if trans.opts.RequestIDFrom != nil {
		if requestID := trans.opts.RequestIDFrom(r); requestID != "" {
			req.Header.Set(domain.RequestIDHeader, requestID)
		}
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

func (trans walletTransferEndpoint) writeError(w http.ResponseWriter, r *http.Request, status int, code string, message string, details any) {
	if trans.opts.WriteError != nil {
		trans.opts.WriteError(w, r, status, code, message, details)
		return
	}
	writeJSON(w, status, map[string]any{domain.JSONKeyError: map[string]any{domain.JSONKeyCode: code, domain.JSONKeyMessage: message}})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeRawServiceResponse(w http.ResponseWriter, status int, body []byte) {
	if status == 0 {
		status = http.StatusBadGateway
	}
	w.Header().Set(domain.ContentTypeHeader, domain.ContentTypeJSON)
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
		return domain.ErrorMessageWalletUnsuccessful
	}
	return strings.TrimSpace(string(body))
}
