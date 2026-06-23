package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"notification/internal/dataaccess"
	"notification/internal/handlers"
)

const queuedStatus = "QUEUED"

var validPriorities = map[string]struct{}{
	"CRITICAL": {},
	"HIGH":     {},
	"NORMAL":   {},
	"LOW":      {},
	"BULK":     {},
}

func (s *server) createNotification(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeError(w, r, http.StatusServiceUnavailable, "service_unavailable", "Notification persistence is not configured.", nil)
		return
	}

	var req CreateNotificationRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Request body must be valid notification JSON.", nil)
		return
	}
	if details := validateCreateNotification(req); len(details) > 0 {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Notification request failed validation.", details)
		return
	}

	notificationID := newNotificationID()
	notification, duplicate, err := s.store.Create(r.Context(), dataaccess.CreateNotificationInput{
		ID:             notificationID,
		ClientScope:    clientScope(req.Metadata),
		IdempotencyKey: strings.TrimSpace(req.IdempotencyKey),
		Channel:        req.Channel,
		Priority:       req.Priority,
		Subject:        strings.TrimSpace(req.Subject),
		ContentText:    req.ContentText,
		IsContentHTML:  req.IsContentHTML,
		FromEmail:      strings.TrimSpace(req.From.Email),
		FromName:       strings.TrimSpace(req.From.Name),
		ReplyToEmail:   contactEmail(req.ReplyTo),
		ReplyToName:    contactName(req.ReplyTo),
		Metadata:       req.Metadata,
		MaxAttempts:    dataaccess.DefaultMaxAttempts,
		Recipients:     recipientInputs(notificationID, req),
		Attachments:    attachmentInputs(notificationID, req.Attachments),
	})
	if errors.Is(err, dataaccess.ErrConflict) {
		writeError(w, r, http.StatusConflict, "conflict", "Notification request conflicts with an existing notification.", nil)
		return
	}
	if err != nil {
		s.logger.Error("failed to create notification", "error", err, "request_id", requestIDFrom(r))
		writeError(w, r, http.StatusInternalServerError, "internal_error", "Notification could not be queued.", nil)
		return
	}

	status := http.StatusAccepted
	if duplicate {
		status = http.StatusOK
	}
	writeJSON(w, status, CreateNotificationResponse{
		NotificationID: notification.ID,
		Status:         notification.Status,
	})
}

func (s *server) listNotifications(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeError(w, r, http.StatusServiceUnavailable, "service_unavailable", "Notification persistence is not configured.", nil)
		return
	}

	filter := dataaccess.SearchFilter{
		Status:         strings.TrimSpace(r.URL.Query().Get("status")),
		Channel:        strings.TrimSpace(r.URL.Query().Get("channel")),
		RecipientEmail: strings.TrimSpace(r.URL.Query().Get("recipient")),
		SourceService:  strings.TrimSpace(r.URL.Query().Get("sourceService")),
		Limit:          intQuery(r, "limit", 50),
		Offset:         intQuery(r, "offset", 0),
	}
	if value := strings.TrimSpace(r.URL.Query().Get("createdFrom")); value != "" {
		filter.CreatedFrom, _ = time.Parse(time.RFC3339, value)
	}
	if value := strings.TrimSpace(r.URL.Query().Get("createdTo")); value != "" {
		filter.CreatedTo, _ = time.Parse(time.RFC3339, value)
	}

	items, err := s.store.Search(r.Context(), filter)
	if err != nil {
		s.logger.Error("failed to search notifications", "error", err, "request_id", requestIDFrom(r))
		writeError(w, r, http.StatusInternalServerError, "internal_error", "Notifications could not be searched.", nil)
		return
	}
	summaries := make([]NotificationSummary, 0, len(items))
	for _, item := range items {
		summaries = append(summaries, notificationSummary(item))
	}
	writeJSON(w, http.StatusOK, ListNotificationsResponse{Notifications: summaries})
}

func (s *server) getNotification(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeError(w, r, http.StatusServiceUnavailable, "service_unavailable", "Notification persistence is not configured.", nil)
		return
	}

	notificationID := strings.TrimSpace(handlers.Param(r, "notification_id"))
	if notificationID == "" {
		writeError(w, r, http.StatusBadRequest, "validation_error", "Notification id is required.", nil)
		return
	}

	notification, err := s.store.Get(r.Context(), notificationID)
	if errors.Is(err, dataaccess.ErrNotFound) {
		writeError(w, r, http.StatusNotFound, "not_found", "Notification was not found.", nil)
		return
	}
	if err != nil {
		s.logger.Error("failed to get notification", "error", err, "request_id", requestIDFrom(r))
		writeError(w, r, http.StatusInternalServerError, "internal_error", "Notification could not be loaded.", nil)
		return
	}
	writeJSON(w, http.StatusOK, notificationDetails(notification))
}

func validateCreateNotification(req CreateNotificationRequest) map[string]string {
	details := make(map[string]string)
	if req.Channel != "EMAIL" {
		details["channel"] = "must be EMAIL"
	}
	if _, ok := validPriorities[req.Priority]; !ok {
		details["priority"] = "must be one of CRITICAL, HIGH, NORMAL, LOW, BULK"
	}
	if strings.TrimSpace(req.Subject) == "" {
		details["subject"] = "is required"
	}
	if strings.TrimSpace(req.ContentText) == "" {
		details["contentText"] = "is required"
	}
	if strings.TrimSpace(req.From.Email) == "" {
		details["from.email"] = "is required"
	}
	if req.ReplyTo != nil && strings.TrimSpace(req.ReplyTo.Email) == "" {
		details["replyTo.email"] = "is required when replyTo is supplied"
	}
	if len(req.To) == 0 {
		details["to"] = "at least one recipient is required"
	}
	for i, recipient := range req.To {
		if strings.TrimSpace(recipient.Email) == "" {
			details["to.email"] = "recipient email is required"
			if i > 0 {
				details["to.email"] = "all recipient emails are required"
			}
			break
		}
	}
	for _, attachment := range req.Attachments {
		if strings.TrimSpace(attachment.FileName) == "" {
			details["attachments.fileName"] = "all attachment file names are required"
		}
		if strings.TrimSpace(attachment.StorageURL) == "" {
			details["attachments.storageUrl"] = "all attachment storage URLs are required"
		}
	}
	return details
}

func clientScope(metadata map[string]any) string {
	if raw, ok := metadata["sourceService"]; ok {
		if value, ok := raw.(string); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return "notification-service"
}

func recipientInputs(notificationID string, req CreateNotificationRequest) []dataaccess.RecipientInput {
	recipients := make([]dataaccess.RecipientInput, 0, len(req.To)+len(req.CC)+len(req.BCC))
	appendContacts := func(kind string, contacts []Contact) {
		for index, contact := range contacts {
			recipients = append(recipients, dataaccess.RecipientInput{
				ID:            newChildID(notificationID, strings.ToLower(kind), index),
				RecipientType: kind,
				Email:         strings.TrimSpace(contact.Email),
				Name:          strings.TrimSpace(contact.Name),
			})
		}
	}
	appendContacts("TO", req.To)
	appendContacts("CC", req.CC)
	appendContacts("BCC", req.BCC)
	return recipients
}

func attachmentInputs(notificationID string, attachments []Attachment) []dataaccess.AttachmentInput {
	items := make([]dataaccess.AttachmentInput, 0, len(attachments))
	for index, attachment := range attachments {
		items = append(items, dataaccess.AttachmentInput{
			ID:          newChildID(notificationID, "attachment", index),
			Filename:    strings.TrimSpace(attachment.FileName),
			ContentType: strings.TrimSpace(attachment.ContentType),
			SizeBytes:   attachment.SizeBytes,
			StorageURL:  strings.TrimSpace(attachment.StorageURL),
		})
	}
	return items
}

func newChildID(notificationID, kind string, index int) string {
	return notificationID + "-" + kind + "-" + strconv.Itoa(index+1)
}

func intQuery(r *http.Request, key string, fallback int) int {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 0 {
		return fallback
	}
	return parsed
}

func notificationSummary(item dataaccess.Notification) NotificationSummary {
	return NotificationSummary{
		NotificationID: item.ID,
		Channel:        item.Channel,
		Priority:       item.Priority,
		Status:         item.Status,
		Subject:        item.Subject,
		CreatedAt:      item.CreatedAt,
		UpdatedAt:      item.UpdatedAt,
	}
}

func notificationDetails(item dataaccess.Notification) NotificationDetails {
	details := NotificationDetails{
		NotificationSummary: notificationSummary(item),
		ContentText:         item.ContentText,
		IsContentHTML:       item.IsContentHTML,
		From:                Contact{Email: item.FromEmail, Name: item.FromName},
		Metadata:            item.Metadata,
		Provider:            ProviderFields{Name: item.ProviderName, MessageID: item.ProviderMessageID},
	}
	for _, recipient := range item.Recipients {
		contact := Contact{Email: recipient.Email, Name: recipient.Name}
		switch recipient.RecipientType {
		case "TO":
			details.To = append(details.To, contact)
		case "CC":
			details.CC = append(details.CC, contact)
		case "BCC":
			details.BCC = append(details.BCC, contact)
		}
	}
	for _, attachment := range item.Attachments {
		details.Attachments = append(details.Attachments, Attachment{
			FileName:    attachment.Filename,
			ContentType: attachment.ContentType,
			SizeBytes:   attachment.SizeBytes,
			StorageURL:  attachment.StorageURL,
		})
	}
	for _, attempt := range item.Attempts {
		completedAt := attempt.CompletedAt
		details.Attempts = append(details.Attempts, DeliveryAttempt{
			AttemptNumber: attempt.AttemptNumber,
			Status:        attempt.Status,
			Provider:      attempt.ProviderName,
			ErrorMessage:  attempt.Error,
			AttemptedAt:   attempt.StartedAt,
			CompletedAt:   &completedAt,
		})
	}
	if item.ReplyToEmail != "" {
		details.ReplyTo = &Contact{Email: item.ReplyToEmail, Name: item.ReplyToName}
	}
	return details
}

func contactEmail(contact *Contact) string {
	if contact == nil {
		return ""
	}
	return strings.TrimSpace(contact.Email)
}

func contactName(contact *Contact) string {
	if contact == nil {
		return ""
	}
	return strings.TrimSpace(contact.Name)
}
