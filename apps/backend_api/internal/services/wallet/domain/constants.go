package domain

type OwnerType string
type WalletStatus string
type TransactionType string
type TransactionStatus string
type ReservationStatus string

const (
	OwnerPlatform OwnerType = "platform"
	OwnerAcademy  OwnerType = "academy"
	OwnerUser     OwnerType = "user"
	OwnerEvent    OwnerType = "event"
	OwnerSystem   OwnerType = "system"
)

const (
	WalletActive    WalletStatus = "active"
	WalletFrozen    WalletStatus = "frozen"
	WalletSuspended WalletStatus = "suspended"
	WalletClosed    WalletStatus = "closed"
)

const (
	TransactionTransfer         TransactionType = "TRANSFER"
	TransactionReserve          TransactionType = "RESERVE"
	TransactionRelease          TransactionType = "RELEASE"
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
	TransactionReversed   TransactionStatus = "REVERSED"
	TransactionCancelled  TransactionStatus = "CANCELLED"
)

const (
	ReservationActive   ReservationStatus = "ACTIVE"
	ReservationReleased ReservationStatus = "RELEASED"
	ReservationCaptured ReservationStatus = "CAPTURED"
	ReservationExpired  ReservationStatus = "EXPIRED"
)
