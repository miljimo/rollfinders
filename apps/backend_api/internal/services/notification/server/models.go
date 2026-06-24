package server

import "time"

type CreateNotificationRequest struct {
	Channel        string         `json:"channel"`
	Priority       string         `json:"priority"`
	Subject        string         `json:"subject"`
	ContentText    string         `json:"contentText"`
	IsContentHTML  bool           `json:"isContentHtml"`
	From           Contact        `json:"from"`
	ReplyTo        *Contact       `json:"replyTo,omitempty"`
	To             []Contact      `json:"to"`
	CC             []Contact      `json:"cc,omitempty"`
	BCC            []Contact      `json:"bcc,omitempty"`
	Attachments    []Attachment   `json:"attachments,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
	IdempotencyKey string         `json:"idempotencyKey,omitempty"`
}

type Contact struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type Attachment struct {
	FileName    string `json:"fileName"`
	ContentType string `json:"contentType"`
	SizeBytes   int64  `json:"sizeBytes,omitempty"`
	StorageURL  string `json:"storageUrl"`
}

type CreateNotificationResponse struct {
	NotificationID string `json:"notificationId"`
	Status         string `json:"status"`
}

type NotificationSummary struct {
	NotificationID string    `json:"notificationId"`
	Channel        string    `json:"channel"`
	Priority       string    `json:"priority"`
	Status         string    `json:"status"`
	Subject        string    `json:"subject"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type ListNotificationsResponse struct {
	Notifications []NotificationSummary `json:"notifications"`
	NextCursor    string                `json:"nextCursor,omitempty"`
	Pagination    paginationMeta        `json:"pagination"`
}

type NotificationDetails struct {
	NotificationSummary
	ContentText   string            `json:"contentText"`
	IsContentHTML bool              `json:"isContentHtml"`
	From          Contact           `json:"from"`
	ReplyTo       *Contact          `json:"replyTo,omitempty"`
	To            []Contact         `json:"to"`
	CC            []Contact         `json:"cc,omitempty"`
	BCC           []Contact         `json:"bcc,omitempty"`
	Attachments   []Attachment      `json:"attachments,omitempty"`
	Metadata      map[string]any    `json:"metadata,omitempty"`
	Provider      ProviderFields    `json:"provider,omitempty"`
	Attempts      []DeliveryAttempt `json:"attempts,omitempty"`
}

type ProviderFields struct {
	Name      string `json:"name,omitempty"`
	MessageID string `json:"messageId,omitempty"`
}

type DeliveryAttempt struct {
	AttemptNumber int        `json:"attemptNumber"`
	Status        string     `json:"status"`
	Provider      string     `json:"provider,omitempty"`
	ErrorCode     string     `json:"errorCode,omitempty"`
	ErrorMessage  string     `json:"errorMessage,omitempty"`
	AttemptedAt   time.Time  `json:"attemptedAt"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
}
