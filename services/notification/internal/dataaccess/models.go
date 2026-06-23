package dataaccess

import "time"

type Notification struct {
	ID                string
	ClientScope       string
	IdempotencyKey    string
	Channel           string
	Priority          string
	Status            string
	Subject           string
	ContentText       string
	IsContentHTML     bool
	FromEmail         string
	FromName          string
	ReplyToEmail      string
	ReplyToName       string
	Metadata          map[string]any
	ProviderName      string
	ProviderMessageID string
	ProviderResponse  map[string]any
	AttemptCount      int
	MaxAttempts       int
	NextAttemptAt     time.Time
	LockedAt          time.Time
	LockedBy          string
	LastError         string
	SentAt            time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
	Recipients        []Recipient
	Attachments       []Attachment
	Attempts          []Attempt
}

type Recipient struct {
	ID             string
	NotificationID string
	RecipientType  string
	Email          string
	Name           string
	CreatedAt      time.Time
}

type Attachment struct {
	ID             string
	NotificationID string
	Filename       string
	ContentType    string
	SizeBytes      int64
	StorageURL     string
	Metadata       map[string]any
	CreatedAt      time.Time
}

type Attempt struct {
	ID                string
	NotificationID    string
	AttemptNumber     int
	ProviderName      string
	ProviderMessageID string
	Status            string
	Error             string
	ProviderResponse  map[string]any
	StartedAt         time.Time
	CompletedAt       time.Time
	CreatedAt         time.Time
}

type CreateNotificationInput struct {
	ID             string
	ClientScope    string
	IdempotencyKey string
	Channel        string
	Priority       string
	Subject        string
	ContentText    string
	IsContentHTML  bool
	FromEmail      string
	FromName       string
	ReplyToEmail   string
	ReplyToName    string
	Metadata       map[string]any
	MaxAttempts    int
	NextAttemptAt  time.Time
	Recipients     []RecipientInput
	Attachments    []AttachmentInput
}

type RecipientInput struct {
	ID            string
	RecipientType string
	Email         string
	Name          string
}

type AttachmentInput struct {
	ID          string
	Filename    string
	ContentType string
	SizeBytes   int64
	StorageURL  string
	Metadata    map[string]any
}

type SearchFilter struct {
	Status         string
	Channel        string
	RecipientEmail string
	SourceService  string
	CreatedFrom    time.Time
	CreatedTo      time.Time
	Limit          int
	Offset         int
}

type AttemptUpdate struct {
	AttemptID         string
	NotificationID    string
	ProviderName      string
	ProviderMessageID string
	Status            string
	Error             string
	ProviderResponse  map[string]any
	NextAttemptAt     time.Time
	CompletedAt       time.Time
}
