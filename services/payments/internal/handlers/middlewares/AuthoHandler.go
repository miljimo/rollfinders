//go:build ignore

package middlewares

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"example.com/events/internal/dataaccess"
	"example.com/events/pkg/handlers"
)

type SessionError string

func (s SessionError) Error() error {
	return errors.New(string(s))
}

const (
	errorSessionExpired SessionError = "session has expired"
)

type SessionExpireDetails struct {
	Expired string `json:"expired"`
}

func Authentication(handler handlers.HttpHandler) handlers.HttpHandler {

	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := strings.TrimSpace(handlers.Header(r, "sessionid"))
		if sessionID == "" {
			handlers.ErrorWithStatus(w, errorSessionExpired.Error(), http.StatusUnauthorized)
			return
		}

		session, err := dataaccess.FetchUserCredentialSession(r.Context(), sessionID)
		if err != nil {
			handlers.ErrorWithStatus(w, fmt.Errorf("server related error = %s", err), http.StatusUnauthorized)
			return
		}

		if strings.ToLower(session.Status) != dataaccess.SessionStatusActivated {
			handlers.ErrorWithStatus(w, errorSessionExpired.Error(), http.StatusUnauthorized)
			return
		}

		var details SessionExpireDetails
		if err := json.Unmarshal([]byte(session.Details), &details); err != nil {
			handlers.ErrorWithStatus(w, errorSessionExpired.Error(), http.StatusUnauthorized)
			return
		}

		expiredAt, err := parseDateString(details.Expired)
		if err != nil {
			handlers.ErrorWithStatus(w, errorSessionExpired.Error(), http.StatusUnauthorized)
			return
		}

		if time.Now().After(expiredAt) {
			updateData := dataaccess.UpdateUserCredentialSessionRequest{
				Status:  dataaccess.SessionStatusDeactivated,
				Details: nil,
			}
			if err := dataaccess.UpdateUserCredentialSessionStatus(r.Context(), sessionID, updateData); err != nil {
				handlers.ErrorWithStatus(w, err, http.StatusInternalServerError)
				return
			}
			handlers.ErrorWithStatus(w, errorSessionExpired.Error(), http.StatusUnauthorized)
			return
		}
		handler(w, r)
	}
}

func parseDateString(value string) (time.Time, error) {
	value = strings.TrimSpace(value)

	// Unix timestamp
	if unix, err := strconv.ParseInt(value, 10, 64); err == nil {
		return time.Unix(unix, 0).UTC(), nil
	}

	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		time.DateTime,
		time.DateOnly,
		time.UnixDate,
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse expiry timestamp %q", value)
}
