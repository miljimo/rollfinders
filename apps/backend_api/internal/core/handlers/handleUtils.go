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
	"strconv"
	"strings"
)

const maxBodyBytes = 1 << 20 // 1MB
const DefaultPageSize = 10
const MaxPageSize = 5000

type PaginationMeta struct {
	Limit      int  `json:"limit"`
	Offset     int  `json:"offset"`
	Count      int  `json:"count"`
	HasMore    bool `json:"has_more"`
	NextOffset *int `json:"next_offset,omitempty"`
	Page       int  `json:"page,omitempty"`
	PageSize   int  `json:"page_size,omitempty"`
	TotalItems *int `json:"total_items,omitempty"`
	TotalPages *int `json:"total_pages,omitempty"`
	NextPage   *int `json:"next_page,omitempty"`
}

func Pagination(limit int, offset int, count int) PaginationMeta {
	limit = PageLimit(limit)
	offset = PageOffset(offset)
	hasMore := count >= limit
	meta := PaginationMeta{Limit: limit, Offset: offset, Count: count, HasMore: hasMore}
	if hasMore {
		nextOffset := offset + count
		meta.NextOffset = &nextOffset
	}
	return meta
}

func PagePagination(page int, pageSize int, count int, totalItems int, totalPages int) PaginationMeta {
	pageSize = PageLimit(pageSize)
	if page <= 0 {
		page = 1
	}
	if totalPages <= 0 {
		totalPages = 1
	}
	offset := (page - 1) * pageSize
	totalItemsValue := totalItems
	totalPagesValue := totalPages
	meta := PaginationMeta{
		Limit:      pageSize,
		Offset:     offset,
		Count:      count,
		HasMore:    page < totalPages,
		Page:       page,
		PageSize:   pageSize,
		TotalItems: &totalItemsValue,
		TotalPages: &totalPagesValue,
	}
	if meta.HasMore {
		nextPage := page + 1
		nextOffset := offset + count
		meta.NextPage = &nextPage
		meta.NextOffset = &nextOffset
	}
	return meta
}

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

func IntQuery(r *http.Request, key string, fallback int) int {
	if r == nil || r.URL == nil {
		return fallback
	}
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func PageLimit(value int) int {
	if value <= 0 {
		return DefaultPageSize
	}
	if value > MaxPageSize {
		return MaxPageSize
	}
	return value
}

func PageOffset(value int) int {
	if value < 0 {
		return 0
	}
	return value
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
	Error     string            `json:"error"`
	Code      int               `json:"code"`
	ErrorCode string            `json:"error_code,omitempty"`
	Details   map[string]string `json:"details,omitempty"`
	Success   bool              `json:"success"`
}

type StatusError struct {
	Status  int
	Code    string
	Message string
	Details map[string]string
	Err     error
}

func NewStatusError(status int, code string, message string, err error, details map[string]string) StatusError {
	return StatusError{Status: status, Code: code, Message: message, Err: err, Details: details}
}

func (err StatusError) Error() string {
	if strings.TrimSpace(err.Message) != "" {
		return err.Message
	}
	if err.Err != nil {
		return err.Err.Error()
	}
	return http.StatusText(err.status())
}

func (err StatusError) Unwrap() error {
	return err.Err
}

func (err StatusError) status() int {
	if err.Status > 0 {
		return err.Status
	}
	return http.StatusInternalServerError
}

func ErrorWithStatus(w http.ResponseWriter, err error, code int) {
	if err == nil {
		err = errors.New("")
	}

	var statusErr StatusError
	if errors.As(err, &statusErr) {
		status := statusErr.status()
		resp := errorResponse{
			Error:     statusErr.Error(),
			Code:      status,
			ErrorCode: statusErr.Code,
			Details:   statusErr.Details,
			Success:   false,
		}
		WriteJSON(w, status, resp)
		return
	}

	resp := errorResponse{
		Error:   err.Error(),
		Code:    code,
		Success: false,
	}

	WriteJSON(w, code, resp)
}

func WriteError(w http.ResponseWriter, code int, payload ...interface{}) {
	if len(payload) == 1 {
		WriteJSON(w, code, payload[0])
		return
	}
	if len(payload) >= 2 {
		WriteJSON(w, code, map[string]interface{}{
			"error":   payload[0],
			"message": payload[1],
			"success": false,
		})
		return
	}
	ErrorWithStatus(w, errors.New(http.StatusText(code)), code)
}

func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(data)
}

func WriteOK(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusOK, data)
}

func WriteCreated(w http.ResponseWriter, data interface{}) {
	WriteJSON(w, http.StatusCreated, data)
}

func WriteNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
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
	WriteJSON(w, status, data)
	return nil
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
