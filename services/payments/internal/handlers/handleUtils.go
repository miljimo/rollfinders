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

const maxBodyBytes = 1 << 20 // 1MB

func Param(r *http.Request, key string) string {
	params, ok := r.Context().
		Value(paramsContextKey).(Params)

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

	requestId = newRequestId()
	r.Header.Set("REQUEST-ID", requestId)
	return requestId

}

func newRequestId() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "req_unknown"
	}
	return hex.EncodeToString(b[:])
}

type errorResponse struct {
	Error   string `json:"error"`
	Code    int    `json:"code"`
	Success bool   `json:"success"`
}

func ErrorWithStatus(w http.ResponseWriter, err error, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	if err == nil {
		err = errors.New("")
	}

	resp := errorResponse{
		Error:   err.Error(),
		Code:    code,
		Success: false,
	}

	_ = json.NewEncoder(w).Encode(resp)
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

// BodyJSON is a compatibility wrapper used by tests and older callers.
func BodyJSON(r *http.Request, v interface{}) error {
	return Json(r, v)
}

func SuccessWithData(w http.ResponseWriter, data interface{}, status int) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data == nil {
		return nil
	}
	bdata, err := json.Marshal(data)
	if err != nil {
		return err
	}
	_, err = w.Write(bdata)

	return err

}

func Handle(pattern string, methods []string, handler HttpHandler, middlewares ...MiddlewareFunc) {

	rt, err := DefaultRouter.Handle(pattern, methods, handler)

	if err != nil {
		panic(err)
	}
	rt.handler = WithMiddleware(rt.handler).Apply(middlewares...)
	// Apply the defaults ones
	rt.handler = WithMiddleware(rt.handler).Apply(DefaultRouter.middlewares...)

}

func Middlewares(middlewares ...MiddlewareFunc) {
	if len(middlewares) > 0 {
		DefaultRouter.middlewares = append(DefaultRouter.middlewares, middlewares...)
	}
}

func Listen(addr string) error {
	if addr == "" {
		addr = ":8080"
	}
	fmt.Printf("Serve on %s:%s\n", "http://localhost", addr)
	return http.ListenAndServe(addr, DefaultRouter)
}
func EndPoint() string {
	u := *DefaultRouter.endPoint
	return u.String()
}
