package domain

type WalletType string
type Currency string
type WalletStatus string
type TransactionType string
type TransactionStatus string
type ReservationStatus string
type LinkedAccountProvider string
type LinkedAccountConnectionType string
type LinkedAccountStatus string

const (
	WalletInternal WalletType = "internal"
	WalletExternal WalletType = "external"
)

const (
	CurrencyGBP    Currency = "GBP"
	CurrencyPoints Currency = "Points"
)

const (
	LinkedAccountProviderStripe LinkedAccountProvider = "STRIPE"
	LinkedAccountProviderPayPal LinkedAccountProvider = "PAYPAL"
	LinkedAccountProviderCard   LinkedAccountProvider = "CARD"
	LinkedAccountProviderBank   LinkedAccountProvider = "BANK"
)

const (
	LinkedAccountTopUp  LinkedAccountConnectionType = "TOPUP"
	LinkedAccountPayout LinkedAccountConnectionType = "PAYOUT"
	LinkedAccountBoth   LinkedAccountConnectionType = "BOTH"
)

const (
	LinkedAccountPending   LinkedAccountStatus = "PENDING"
	LinkedAccountConnected LinkedAccountStatus = "CONNECTED"
	LinkedAccountFailed    LinkedAccountStatus = "FAILED"
	LinkedAccountDisabled  LinkedAccountStatus = "DISABLED"
)

const (
	WalletActive    WalletStatus = "active"
	WalletInactive  WalletStatus = "inactive"
	WalletFrozen    WalletStatus = "frozen"
	WalletSuspended WalletStatus = "suspended"
	WalletClosed    WalletStatus = "closed"
)

const (
	TransactionTransfer         TransactionType = "TRANSFER"
	TransactionReversal         TransactionType = "REVERSAL"
	TransactionManualCredit     TransactionType = "MANUAL_CREDIT"
	TransactionManualDebit      TransactionType = "MANUAL_DEBIT"
	TransactionRefund           TransactionType = "REFUND"
	TransactionCommission       TransactionType = "COMMISSION"
	TransactionSubscription     TransactionType = "SUBSCRIPTION"
	TransactionBookingPayment   TransactionType = "BOOKING_PAYMENT"
	TransactionReward           TransactionType = "REWARD"
	TransactionBonus            TransactionType = "BONUS"
	TransactionSystemAdjustment TransactionType = "SYSTEM_ADJUSTMENT"
)

const (
	TransactionPending    TransactionStatus = "PENDING"
	TransactionProcessing TransactionStatus = "PROCESSING"
	TransactionCompleted  TransactionStatus = "COMPLETED"
	TransactionFailed     TransactionStatus = "FAILED"
	TransactionAWaiting   TransactionStatus = "AWAITING"
	TransactionReversed   TransactionStatus = "REVERSED"
	TransactionCancelled  TransactionStatus = "CANCELLED"
)

const (
	ReservationActive    ReservationStatus = "ACTIVE"
	ReservationReleased  ReservationStatus = "RELEASED"
	ReservationFinalized ReservationStatus = "FINALIZED"
)
