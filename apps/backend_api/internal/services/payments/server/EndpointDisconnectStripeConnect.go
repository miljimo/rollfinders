package server

import (
	"encoding/json"
	"errors"
	"net/http"
)

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
