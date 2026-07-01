package requests

type ReverseTransactionRequest struct {
	TransactionID string `json:"transaction_id"`
	Description   string `json:"description"`
	ReferenceType string `json:"reference_type"`
	ReferenceID   string `json:"reference_id"`
}
