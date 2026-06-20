package server

import (
	"encoding/json"
	"errors"
	"net/http"
)

func decodeJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func requireIdempotencyKey(r *http.Request) error {
	if cleanString(r.Header.Get("Idempotency-Key")) == "" {
		return errors.New("idempotency key is required")
	}
	return nil
}

func metadataJSON(metadata map[string]any) string {
	if metadata == nil {
		return "{}"
	}
	data, err := json.Marshal(metadata)
	if err != nil {
		return "{}"
	}
	return string(data)
}
