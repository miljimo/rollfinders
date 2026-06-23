package server

import (
	"net/http"
	"strings"
)

type RouteDefinition struct {
	Method          string
	Path            string
	Service         string
	Permission      string
	ResourceType    string
	ResourceIDParam string
}

type routeMatch struct {
	Definition RouteDefinition
	Params     map[string]string
}

type PermissionDefinition struct {
	Code         string
	Name         string
	Description  string
	ResourceType string
}

func routePermissionCatalog() []PermissionDefinition {
	seen := map[string]PermissionDefinition{}
	for _, route := range protectedRoutes() {
		if route.Permission == "" {
			continue
		}
		if _, ok := seen[route.Permission]; ok {
			continue
		}
		seen[route.Permission] = PermissionDefinition{
			Code:         route.Permission,
			Name:         permissionName(route.Permission),
			Description:  "Allows calling orchestrator route " + route.Method + " " + route.Path + ".",
			ResourceType: route.ResourceType,
		}
	}
	catalog := make([]PermissionDefinition, 0, len(seen))
	for _, definition := range seen {
		catalog = append(catalog, definition)
	}
	return catalog
}

func protectedRoutes() []RouteDefinition {
	return []RouteDefinition{
		{Method: http.MethodGet, Path: "/v1/users", Service: "user-service", Permission: "user.search"},
		{Method: http.MethodPost, Path: "/v1/users", Service: "user-service", Permission: "user.create"},
		{Method: http.MethodGet, Path: "/v1/accounts/{accountId}", Service: "user-service", Permission: "account.read", ResourceType: "account", ResourceIDParam: "accountId"},
		{Method: http.MethodPatch, Path: "/v1/accounts/{accountId}", Service: "user-service", Permission: "account.update", ResourceType: "account", ResourceIDParam: "accountId"},

		{Method: http.MethodGet, Path: "/v1/academies", Service: "academy-service", Permission: "academy.search"},
		{Method: http.MethodPost, Path: "/v1/academies", Service: "academy-service", Permission: "academy.create"},
		{Method: http.MethodGet, Path: "/v1/academies/{academyId}", Service: "academy-service", Permission: "academy.read", ResourceType: "academy", ResourceIDParam: "academyId"},
		{Method: http.MethodPut, Path: "/v1/academies/{academyId}", Service: "academy-service", Permission: "academy.update", ResourceType: "academy", ResourceIDParam: "academyId"},
		{Method: http.MethodPatch, Path: "/v1/academies/{academyId}", Service: "academy-service", Permission: "academy.update", ResourceType: "academy", ResourceIDParam: "academyId"},
		{Method: http.MethodDelete, Path: "/v1/academies/{academyId}", Service: "academy-service", Permission: "academy.delete", ResourceType: "academy", ResourceIDParam: "academyId"},
		{Method: http.MethodPost, Path: "/v1/academies/{academyId}/search/hide", Service: "academy-service", Permission: "academy.search.hide", ResourceType: "academy", ResourceIDParam: "academyId"},
		{Method: http.MethodGet, Path: "/v1/memberships", Service: "academy-service", Permission: "academy.membership.read"},
		{Method: http.MethodPost, Path: "/v1/memberships", Service: "academy-service", Permission: "academy.membership.assign"},
		{Method: http.MethodDelete, Path: "/v1/memberships/{membershipId}", Service: "academy-service", Permission: "academy.membership.remove", ResourceType: "membership", ResourceIDParam: "membershipId"},

		{Method: http.MethodGet, Path: "/v1/organisations", Service: "organisation-service", Permission: "organisation.search"},
		{Method: http.MethodPost, Path: "/v1/organisations", Service: "organisation-service", Permission: "organisation.create"},
		{Method: http.MethodGet, Path: "/v1/organisations/{organisationId}", Service: "organisation-service", Permission: "organisation.read", ResourceType: "organisation", ResourceIDParam: "organisationId"},
		{Method: http.MethodPut, Path: "/v1/organisations/{organisationId}", Service: "organisation-service", Permission: "organisation.update", ResourceType: "organisation", ResourceIDParam: "organisationId"},
		{Method: http.MethodGet, Path: "/v1/applications", Service: "organisation-service", Permission: "organisation.application.search"},
		{Method: http.MethodPost, Path: "/v1/applications", Service: "organisation-service", Permission: "organisation.application.create"},
		{Method: http.MethodGet, Path: "/v1/applications/{applicationId}/services", Service: "organisation-service", Permission: "organisation.application.read", ResourceType: "application", ResourceIDParam: "applicationId"},

		{Method: http.MethodGet, Path: "/v1/courses", Service: "course-service", Permission: "course.search"},
		{Method: http.MethodPost, Path: "/v1/courses", Service: "course-service", Permission: "course.create"},
		{Method: http.MethodGet, Path: "/v1/courses/{courseId}", Service: "course-service", Permission: "course.read", ResourceType: "course", ResourceIDParam: "courseId"},
		{Method: http.MethodPut, Path: "/v1/courses/{courseId}", Service: "course-service", Permission: "course.update", ResourceType: "course", ResourceIDParam: "courseId"},
		{Method: http.MethodGet, Path: "/v1/course-types", Service: "course-service", Permission: "course.type.read"},
		{Method: http.MethodPost, Path: "/v1/course-types", Service: "course-service", Permission: "course.type.create"},

		{Method: http.MethodGet, Path: "/v1/bookings", Service: "booking-service", Permission: "booking.read"},
		{Method: http.MethodPost, Path: "/v1/bookings", Service: "booking-service", Permission: "booking.create"},
		{Method: http.MethodGet, Path: "/v1/bookings/{bookingId}", Service: "booking-service", Permission: "booking.read", ResourceType: "booking", ResourceIDParam: "bookingId"},
		{Method: http.MethodPost, Path: "/v1/bookings/{bookingId}/cancel", Service: "booking-service", Permission: "booking.cancel", ResourceType: "booking", ResourceIDParam: "bookingId"},

		{Method: http.MethodGet, Path: "/v1/payments", Service: "payment-service", Permission: "payment.search"},
		{Method: http.MethodPost, Path: "/v1/payments", Service: "payment-service", Permission: "payment.create"},
		{Method: http.MethodGet, Path: "/v1/payments/{paymentId}", Service: "payment-service", Permission: "payment.read", ResourceType: "payment", ResourceIDParam: "paymentId"},
		{Method: http.MethodPost, Path: "/v1/checkouts", Service: "payment-service", Permission: "payment.checkout.create"},
		{Method: http.MethodPost, Path: "/v1/refunds", Service: "payment-service", Permission: "payment.refund.create"},
		{Method: http.MethodGet, Path: "/v1/payout", Service: "payment-service", Permission: "payout.request.read"},
		{Method: http.MethodPost, Path: "/v1/payout", Service: "payment-service", Permission: "payout.request.create"},
	}
}

func permissionName(code string) string {
	words := strings.Fields(strings.ReplaceAll(code, ".", " "))
	for index, word := range words {
		if word == "" {
			continue
		}
		words[index] = strings.ToUpper(word[:1]) + word[1:]
	}
	return strings.Join(words, " ")
}

func resolveRoute(method string, path string) (routeMatch, bool) {
	for _, route := range protectedRoutes() {
		if route.Method != method && !(method == http.MethodHead && route.Method == http.MethodGet) {
			continue
		}
		params, ok := matchRoutePath(route.Path, path)
		if ok {
			return routeMatch{Definition: route, Params: params}, true
		}
	}
	return routeMatch{}, false
}

func matchRoutePath(pattern string, path string) (map[string]string, bool) {
	patternParts := splitPath(pattern)
	pathParts := splitPath(path)
	if len(patternParts) != len(pathParts) {
		return nil, false
	}
	params := map[string]string{}
	for index, patternPart := range patternParts {
		pathPart := pathParts[index]
		if strings.HasPrefix(patternPart, "{") && strings.HasSuffix(patternPart, "}") {
			name := strings.TrimSuffix(strings.TrimPrefix(patternPart, "{"), "}")
			if name == "" || pathPart == "" {
				return nil, false
			}
			params[name] = pathPart
			continue
		}
		if patternPart != pathPart {
			return nil, false
		}
	}
	return params, true
}

func splitPath(path string) []string {
	path = strings.Trim(path, "/")
	if path == "" {
		return nil
	}
	return strings.Split(path, "/")
}

func proxyKeyForService(service string) string {
	switch service {
	case "user-service":
		return "user"
	case "academy-service":
		return "academy"
	case "organisation-service":
		return "organisation"
	case "course-service":
		return "course"
	case "booking-service":
		return "booking"
	case "payment-service":
		return "payment"
	default:
		return ""
	}
}
