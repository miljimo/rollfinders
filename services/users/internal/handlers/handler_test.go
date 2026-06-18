package handlers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMethod_Handler_With_Invalid_Method(t *testing.T) {
	router := &Router{}
	_, err := router.Handle("/user/{userId}", []string{"GET", "POST", "SAILED"}, func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Hello world")
	})

	if err == nil {
		t.Error("expected unsupported method error")
	}
}

func TestMiddleware_When_Use_IsCalled_TheMiddleWareIsDecorated(t *testing.T) {
	router := &Router{}
	_, params, err := router.compilePattern("/user/{userId}/{password}")
	if err != nil {
		t.Error(err)
	}
	if params[0] != "userId" {
		t.Errorf("failed: userid not found")
	}
	if params[1] != "password" {
		t.Errorf("failed: password arg not found")
	}
}

func TestHandler_WithPatternsWorkSuccessfully(t *testing.T) {
	router := &Router{}
	req, err := router.Handle("/user/{userId}/section/{id}", nil, func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Hello world")
	})
	if err != nil {
		t.Error(err)
		return
	}

	matches := req.regex.FindStringSubmatch("/user/098787223/section/79872873")

	if matches == nil {
		return
	}

	params := make(Params, 0)

	for i, name := range req.paramNames {
		params[name] = matches[i+1]
	}
}

func TestRouter_RoutesPatternAndPopulatesParams(t *testing.T) {
	router := &Router{}

	_, err := router.Handle("/user/{id}", []string{"GET"}, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%s", Param(r, "id"))
	})
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodGet, "/user/123", nil)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}

	if got := resp.Body.String(); got != "123" {
		t.Fatalf("expected body 123, got %q", got)
	}
}

func TestInvalidMethod_DoesNotBreakServer(t *testing.T) {
	router := &Router{}

	_, err := router.Handle("/bad/{id}", []string{"SAILED"}, func(w http.ResponseWriter, r *http.Request) {})
	if err == nil {
		t.Fatal("expected error when registering unsupported method")
	}

	_, err = router.Handle("/user/{id}", []string{"GET"}, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%s", Param(r, "id"))
	})
	if err != nil {
		t.Fatalf("failed to register valid handler: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/user/456", nil)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
	if got := resp.Body.String(); got != "456" {
		t.Fatalf("expected body 456, got %q", got)
	}
}

func TestQueryParameter_CanBeRetrieved(t *testing.T) {
	router := &Router{}

	_, err := router.Handle("/user/{id}/create", []string{"GET"}, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%s", Query(r, "name"))
	})
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodGet, "/user/i9090did/create?name=obaro", nil)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
	if got := resp.Body.String(); got != "obaro" {
		t.Fatalf("expected body obaro, got %q", got)
	}
}

func TestHeaderInformation_CanBeRetrieved(t *testing.T) {
	router := &Router{}

	_, err := router.Handle("/user/{id}/create", []string{"GET"}, func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%s", Header(r, "X-Request-Id"))
	})
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodGet, "/user/i9090did/create", nil)
	req.Header.Set("X-Request-Id", "abc-123")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
	if got := resp.Body.String(); got != "abc-123" {
		t.Fatalf("expected header value abc-123, got %q", got)
	}
}

func TestBodyJSON_CanDecodeRequestBody(t *testing.T) {
	router := &Router{}
	type payload struct {
		Name string `json:"name"`
	}

	_, err := router.Handle("/user/{id}/create", []string{"POST"}, func(w http.ResponseWriter, r *http.Request) {
		var p payload
		if err := BodyJSON(r, &p); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		fmt.Fprintf(w, "%s", p.Name)
	})
	if err != nil {
		t.Fatal(err)
	}

	reqBody := strings.NewReader(`{"name":"obaro"}`)
	req := httptest.NewRequest(http.MethodPost, "/user/i9090did/create", reqBody)
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}
	if got := resp.Body.String(); got != "obaro" {
		t.Fatalf("expected body obaro, got %q", got)
	}
}
