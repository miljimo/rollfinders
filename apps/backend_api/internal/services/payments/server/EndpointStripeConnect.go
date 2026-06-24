package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

func (s *server) getPaymentAccountSetting(w http.ResponseWriter, r *http.Request) {
	owner, ok := ownerFromQuery(w, r)
	if !ok {
		return
	}
	setting, err := s.store.getPaymentAccountSettingDB(owner.OwnerType, owner.OwnerID, "stripe")
	if errors.Is(err, errNotFound) {
		writeError(w, r, http.StatusNotFound, "payment_account_not_found", "Payment account setting was not found.", nil)
		return
	}
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "payment_account_read_failed", "Payment account setting could not be read.", nil)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

func (s *server) createStripeConnectAccountLink(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, false)
	if !ok {
		return
	}
	var req stripeConnectRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body is invalid JSON.", nil)
		return
	}
	owner, ok := ownerFromPayload(w, r, req.OwnerType, req.OwnerID)
	if !ok {
		return
	}
	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.RefreshURL) == "" || strings.TrimSpace(req.ReturnURL) == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Email, refresh URL and return URL are required.", nil)
		return
	}
	adapter, ok := s.providers["stripe"].(stripeAdapter)
	if !ok {
		writeError(w, r, http.StatusBadGateway, "provider_not_configured", "Stripe provider is not configured.", nil)
		return
	}

	var account stripeAccount
	setting, err := s.store.getPaymentAccountSettingDB(owner.OwnerType, owner.OwnerID, "stripe")
	if err == nil && setting.ProviderAccountID != "" {
		account, err = adapter.RetrieveConnectedAccount(setting.ProviderAccountID)
		if err != nil {
			account = stripeAccount{}
		}
	}
	if account.ID == "" {
		reusable, found, err := adapter.FindReusableConnectedAccount(owner)
		if err != nil {
			writeError(w, r, http.StatusBadGateway, "provider_error", "Stripe account lookup failed.", nil)
			return
		}
		if found {
			account = reusable
		}
	}
	if account.ID == "" {
		account, err = adapter.CreateConnectedAccount(req.Email, owner)
		if err != nil {
			writeError(w, r, http.StatusBadGateway, "provider_error", "Stripe connected account creation failed.", nil)
			return
		}
	}
	setting, err = s.store.upsertPaymentAccountSettingDB(owner, account)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "payment_account_save_failed", "Payment account setting could not be saved.", nil)
		return
	}
	if err := adapter.DeleteDuplicateConnectedAccounts(owner, account.ID); err != nil {
		writeError(w, r, http.StatusBadGateway, "provider_error", "Duplicate Stripe account cleanup failed.", nil)
		return
	}
	link, err := adapter.CreateAccountLink(account.ID, req.RefreshURL, req.ReturnURL)
	if err != nil {
		writeError(w, r, http.StatusBadGateway, "provider_error", "Stripe account link creation failed.", nil)
		return
	}
	writeJSON(w, http.StatusOK, stripeConnectResponse{Account: setting, RedirectURL: link.URL})
}

func (s *server) refreshStripeConnectAccount(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, false)
	if !ok {
		return
	}
	var req stripeRefreshRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body is invalid JSON.", nil)
		return
	}
	owner, ok := ownerFromPayload(w, r, req.OwnerType, req.OwnerID)
	if !ok {
		return
	}
	adapter, ok := s.providers["stripe"].(stripeAdapter)
	if !ok {
		writeError(w, r, http.StatusBadGateway, "provider_not_configured", "Stripe provider is not configured.", nil)
		return
	}
	setting, err := s.store.getPaymentAccountSettingDB(owner.OwnerType, owner.OwnerID, "stripe")
	if errors.Is(err, errNotFound) || setting.ProviderAccountID == "" {
		writeError(w, r, http.StatusNotFound, "payment_account_not_found", "Payment account setting was not found.", nil)
		return
	}
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "payment_account_read_failed", "Payment account setting could not be read.", nil)
		return
	}
	account, err := adapter.RetrieveConnectedAccount(setting.ProviderAccountID)
	if err != nil {
		writeError(w, r, http.StatusBadGateway, "provider_error", "Stripe connected account refresh failed.", nil)
		return
	}
	setting, err = s.store.upsertPaymentAccountSettingDB(owner, account)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "payment_account_save_failed", "Payment account setting could not be saved.", nil)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

func (s *server) disconnectStripeConnectAccount(w http.ResponseWriter, r *http.Request) {
	raw, ok := readJSONEndpoint(w, r, false)
	if !ok {
		return
	}
	var req stripeDisconnectRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body is invalid JSON.", nil)
		return
	}
	owner, ok := ownerFromPayload(w, r, req.OwnerType, req.OwnerID)
	if !ok {
		return
	}
	setting, err := s.store.disconnectPaymentAccountSettingDB(owner)
	if errors.Is(err, errNotFound) {
		writeError(w, r, http.StatusNotFound, "payment_account_not_found", "Payment account setting was not found.", nil)
		return
	}
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "payment_account_save_failed", "Payment account setting could not be saved.", nil)
		return
	}
	writeJSON(w, http.StatusOK, setting)
}

func ownerFromQuery(w http.ResponseWriter, r *http.Request) (PaymentAccountOwner, bool) {
	return ownerFromPayload(w, r, r.URL.Query().Get("owner_type"), r.URL.Query().Get("owner_id"))
}

func ownerFromPayload(w http.ResponseWriter, r *http.Request, ownerType, ownerID string) (PaymentAccountOwner, bool) {
	owner := PaymentAccountOwner{OwnerType: strings.TrimSpace(ownerType), OwnerID: strings.TrimSpace(ownerID)}
	if owner.OwnerType != "academy" && owner.OwnerType != "platform" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Owner type must be academy or platform.", nil)
		return PaymentAccountOwner{}, false
	}
	if owner.OwnerID == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Owner id is required.", nil)
		return PaymentAccountOwner{}, false
	}
	return owner, true
}
