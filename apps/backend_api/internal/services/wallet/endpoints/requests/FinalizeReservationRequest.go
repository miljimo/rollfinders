package requests

type FinalizeReservationRequest struct {
	CounterWalletID string `json:"counter_wallet_id"`
	Description     string `json:"description"`
}
