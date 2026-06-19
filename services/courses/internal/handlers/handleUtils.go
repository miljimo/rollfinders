package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const maxBodyBytes = 1 << 20

func Param(r *http.Request, key string) string {
	params, ok := r.Context().Value(paramsContextKey).(Params)
	if !ok {
		return ""
	}
	return params[key]
}

func Query(r *http.Request, key string) string {
	if r == nil || r.URL == nil {
		return ""
	}
	return r.URL.Query().Get(key)
}

func Header(r *http.Request, key string) string {
	if r == nil || r.Header == nil {
		return ""
	}
	return r.Header.Get(key)
}

func RequestId(r *http.Request) string {
	requestId := Header(r, "REQUEST-ID")
	if strings.TrimSpace(requestId) != "" {
		return requestId
	}
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "req_unknown"
	}
	requestId = hex.EncodeToString(b[:])
	r.Header.Set("REQUEST-ID", requestId)
	return requestId
}

func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func WriteError(w http.ResponseWriter, status int, code string, messages ...string) {
	message := code
	if len(messages) > 0 && strings.TrimSpace(messages[0]) != "" {
		message = messages[0]
	}
	WriteJSON(w, status, map[string]string{"error": code, "message": message})
}

func WriteCreated(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusCreated, data)
}

func WriteOK(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusOK, data)
}

func Json(r *http.Request, v interface{}) error {
	if r == nil || r.Body == nil {
		return errors.New("request body is empty")
	}
	defer r.Body.Close()
	if r.ContentLength > maxBodyBytes {
		return errors.New("request body too large")
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, maxBodyBytes+1))
	if err != nil {
		return fmt.Errorf("failed to read request body: %w", err)
	}
	if len(body) == 0 {
		return errors.New("request body is empty")
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	return decoder.Decode(v)
}
