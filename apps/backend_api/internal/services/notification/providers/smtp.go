package providers

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/mail"
	"net/smtp"
	"strconv"
	"strings"
	"time"
)

type TLSMode string

const (
	TLSModeNone     TLSMode = "none"
	TLSModeStartTLS TLSMode = "starttls"
	TLSModeTLS      TLSMode = "tls"
)

type SMTPConfig struct {
	Host          string
	Port          int
	Username      string
	Password      string
	TLSMode       TLSMode
	DefaultSender Address
	Timeout       time.Duration
}

type StorageClient interface {
	Open(ctx context.Context, storageURL string) (AttachmentContent, error)
}

type AttachmentContent struct {
	FileName    string
	ContentType string
	Reader      io.ReadCloser
}

type SMTPSender interface {
	Send(ctx context.Context, cfg SMTPConfig, from string, recipients []string, raw []byte) (string, map[string]string, error)
}

type SMTPProvider struct {
	cfg     SMTPConfig
	storage StorageClient
	sender  SMTPSender
	now     func() time.Time
}

func NewSMTPProvider(cfg SMTPConfig, storage StorageClient, sender SMTPSender) (*SMTPProvider, error) {
	if cfg.Host == "" {
		return nil, errors.New("smtp host is required")
	}
	if cfg.Port == 0 {
		cfg.Port = 25
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 10 * time.Second
	}
	if cfg.TLSMode == "" {
		cfg.TLSMode = TLSModeStartTLS
	}
	if sender == nil {
		sender = NetSMTPSender{}
	}
	return &SMTPProvider{cfg: cfg, storage: storage, sender: sender, now: time.Now}, nil
}

func (p *SMTPProvider) Name() string {
	return "smtp"
}

func (p *SMTPProvider) Send(ctx context.Context, msg Message) (SendResult, error) {
	if msg.Channel != "" && msg.Channel != EmailChannel {
		return SendResult{ProviderName: p.Name()}, PermanentError("unsupported notification channel", nil)
	}
	if err := validateMessage(msg); err != nil {
		return SendResult{ProviderName: p.Name()}, PermanentError("invalid email message", err)
	}
	if msg.From.Email == "" {
		msg.From = p.cfg.DefaultSender
	}
	if msg.From.Email == "" {
		return SendResult{ProviderName: p.Name()}, PermanentError("sender is required", nil)
	}
	raw, err := p.buildMessage(ctx, msg)
	if err != nil {
		return SendResult{ProviderName: p.Name()}, err
	}
	recipients := recipientEmails(msg)
	providerID, metadata, err := p.sender.Send(ctx, p.cfg, msg.From.Email, recipients, raw)
	if err != nil {
		if isPermanentSMTPError(err) {
			return SendResult{ProviderName: p.Name()}, PermanentError("smtp permanent failure", err)
		}
		return SendResult{ProviderName: p.Name()}, RetryableError("smtp temporary failure", err)
	}
	return SendResult{
		ProviderName:      p.Name(),
		ProviderMessageID: providerID,
		ResponseMetadata:  metadata,
		Retryable:         false,
		SentAt:            p.now().UTC(),
	}, nil
}

func validateMessage(msg Message) error {
	if strings.TrimSpace(msg.Subject) == "" {
		return errors.New("subject is required")
	}
	if strings.TrimSpace(msg.ContentText) == "" {
		return errors.New("content text is required")
	}
	for _, addr := range append(append([]Address{}, msg.To...), append(msg.CC, msg.BCC...)...) {
		if _, err := mail.ParseAddress(formatAddress(addr)); err != nil {
			return err
		}
	}
	if len(msg.To) == 0 && len(msg.CC) == 0 && len(msg.BCC) == 0 {
		return errors.New("at least one recipient is required")
	}
	return nil
}

func (p *SMTPProvider) buildMessage(ctx context.Context, msg Message) ([]byte, error) {
	var body bytes.Buffer
	headers := map[string]string{
		"From":         formatAddress(msg.From),
		"To":           joinAddresses(msg.To),
		"Cc":           joinAddresses(msg.CC),
		"Subject":      mime.QEncoding.Encode("utf-8", msg.Subject),
		"MIME-Version": "1.0",
		"Date":         p.now().UTC().Format(time.RFC1123Z),
	}
	if msg.ID != "" {
		headers["X-Notification-ID"] = msg.ID
	}
	if msg.ReplyTo.Email != "" {
		headers["Reply-To"] = formatAddress(msg.ReplyTo)
	}

	var attachmentParts []attachmentPart
	for _, attachment := range msg.Attachments {
		part, err := p.resolveAttachment(ctx, attachment)
		if err != nil {
			return nil, err
		}
		attachmentParts = append(attachmentParts, part)
	}

	if len(attachmentParts) > 0 {
		writer := multipart.NewWriter(&body)
		headers["Content-Type"] = `multipart/mixed; boundary="` + writer.Boundary() + `"`
		writeHeaders(&body, headers)
		if err := writeBodyPart(writer, msg); err != nil {
			return nil, err
		}
		for _, attachment := range attachmentParts {
			if err := writeAttachmentPart(writer, attachment); err != nil {
				return nil, err
			}
		}
		if err := writer.Close(); err != nil {
			return nil, RetryableError("failed to close email body", err)
		}
		return body.Bytes(), nil
	}

	if msg.IsHTML {
		headers["Content-Type"] = "text/html; charset=utf-8"
	} else {
		headers["Content-Type"] = "text/plain; charset=utf-8"
	}
	headers["Content-Transfer-Encoding"] = "quoted-printable"
	writeHeaders(&body, headers)
	body.WriteString(msg.ContentText)
	return body.Bytes(), nil
}

type attachmentPart struct {
	FileName    string
	ContentType string
	Data        []byte
}

func (p *SMTPProvider) resolveAttachment(ctx context.Context, attachment Attachment) (attachmentPart, error) {
	if attachment.StorageURL == "" {
		return attachmentPart{}, PermanentError("attachment storage url is required", nil)
	}
	if p.storage == nil {
		return attachmentPart{}, PermanentError("attachment storage client is not configured", nil)
	}
	content, err := p.storage.Open(ctx, attachment.StorageURL)
	if err != nil {
		return attachmentPart{}, RetryableError("failed to load attachment", err)
	}
	defer content.Reader.Close()
	data, err := io.ReadAll(content.Reader)
	if err != nil {
		return attachmentPart{}, RetryableError("failed to read attachment", err)
	}
	fileName := firstNonEmpty(content.FileName, attachment.FileName, attachment.ID, "attachment")
	contentType := firstNonEmpty(content.ContentType, attachment.ContentType, "application/octet-stream")
	return attachmentPart{FileName: fileName, ContentType: contentType, Data: data}, nil
}

func writeBodyPart(writer *multipart.Writer, msg Message) error {
	if msg.IsHTML {
		return writeTextPart(writer, "text/html; charset=utf-8", msg.ContentText)
	}
	return writeTextPart(writer, "text/plain; charset=utf-8", msg.ContentText)
}

func writeTextPart(writer *multipart.Writer, contentType, value string) error {
	part, err := writer.CreatePart(map[string][]string{
		"Content-Type":              {contentType},
		"Content-Transfer-Encoding": {"quoted-printable"},
	})
	if err != nil {
		return RetryableError("failed to create text part", err)
	}
	_, err = part.Write([]byte(value))
	if err != nil {
		return RetryableError("failed to write text part", err)
	}
	return nil
}

func writeAttachmentPart(writer *multipart.Writer, attachment attachmentPart) error {
	part, err := writer.CreatePart(map[string][]string{
		"Content-Type":              {attachment.ContentType + `; name="` + escapeHeader(attachment.FileName) + `"`},
		"Content-Disposition":       {`attachment; filename="` + escapeHeader(attachment.FileName) + `"`},
		"Content-Transfer-Encoding": {"base64"},
	})
	if err != nil {
		return RetryableError("failed to create attachment part", err)
	}
	encoder := base64.NewEncoder(base64.StdEncoding, newLineWriter{w: part})
	if _, err := encoder.Write(attachment.Data); err != nil {
		return RetryableError("failed to write attachment", err)
	}
	if err := encoder.Close(); err != nil {
		return RetryableError("failed to close attachment", err)
	}
	return nil
}

type newLineWriter struct {
	w io.Writer
}

func (w newLineWriter) Write(p []byte) (int, error) {
	written := 0
	for len(p) > 76 {
		if _, err := w.w.Write(p[:76]); err != nil {
			return written, err
		}
		if _, err := w.w.Write([]byte("\r\n")); err != nil {
			return written, err
		}
		written += 76
		p = p[76:]
	}
	if len(p) == 0 {
		return written, nil
	}
	n, err := w.w.Write(p)
	return written + n, err
}

func writeHeaders(body *bytes.Buffer, headers map[string]string) {
	for _, key := range []string{"From", "To", "Cc", "Subject", "MIME-Version", "Date", "X-Notification-ID", "Content-Type", "Content-Transfer-Encoding"} {
		if value := headers[key]; value != "" {
			body.WriteString(key)
			body.WriteString(": ")
			body.WriteString(value)
			body.WriteString("\r\n")
		}
	}
	body.WriteString("\r\n")
}

func recipientEmails(msg Message) []string {
	all := append(append([]Address{}, msg.To...), append(msg.CC, msg.BCC...)...)
	recipients := make([]string, 0, len(all))
	for _, addr := range all {
		recipients = append(recipients, addr.Email)
	}
	return recipients
}

func joinAddresses(addresses []Address) string {
	formatted := make([]string, 0, len(addresses))
	for _, addr := range addresses {
		formatted = append(formatted, formatAddress(addr))
	}
	return strings.Join(formatted, ", ")
}

func formatAddress(addr Address) string {
	if addr.Name == "" {
		return addr.Email
	}
	return (&mail.Address{Name: addr.Name, Address: addr.Email}).String()
}

func escapeHeader(value string) string {
	return strings.ReplaceAll(value, `"`, `'`)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func isPermanentSMTPError(err error) bool {
	var smtpErr *SMTPStatusError
	if errors.As(err, &smtpErr) {
		return smtpErr.Code >= 500 && smtpErr.Code < 600
	}
	return false
}

type SMTPStatusError struct {
	Code    int
	Message string
}

func (e *SMTPStatusError) Error() string {
	return fmt.Sprintf("smtp status %d: %s", e.Code, e.Message)
}

type NetSMTPSender struct{}

func (NetSMTPSender) Send(ctx context.Context, cfg SMTPConfig, from string, recipients []string, raw []byte) (string, map[string]string, error) {
	addr := net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))
	var conn net.Conn
	var err error
	dialer := &net.Dialer{Timeout: cfg.Timeout}
	if cfg.TLSMode == TLSModeTLS {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: cfg.Host, MinVersion: tls.VersionTLS12})
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return "", nil, err
	}
	defer conn.Close()
	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return "", nil, err
	}
	defer client.Close()
	if cfg.TLSMode == TLSModeStartTLS {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: cfg.Host, MinVersion: tls.VersionTLS12}); err != nil {
				return "", nil, err
			}
		}
	}
	if cfg.Username != "" {
		if err := client.Auth(smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)); err != nil {
			return "", nil, err
		}
	}
	if err := client.Mail(from); err != nil {
		return "", nil, err
	}
	for _, recipient := range recipients {
		if err := client.Rcpt(recipient); err != nil {
			return "", nil, err
		}
	}
	writer, err := client.Data()
	if err != nil {
		return "", nil, err
	}
	if _, err := writer.Write(raw); err != nil {
		writer.Close()
		return "", nil, err
	}
	if err := writer.Close(); err != nil {
		return "", nil, err
	}
	if err := client.Quit(); err != nil {
		return "", nil, err
	}
	return "", map[string]string{"host": cfg.Host, "tls_mode": string(cfg.TLSMode)}, nil
}
