package server

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

func TestRoutePermissionCatalogIsDerivedFromOrchestratorRoutes(t *testing.T) {
	catalog := routePermissionCatalog()
	if len(catalog) == 0 {
		t.Fatal("expected route permission catalog")
	}
	for _, definition := range catalog {
		if definition.Code == "academy.search.hide" {
			if definition.Name == "" || definition.Description == "" {
				t.Fatalf("expected generated name and description: %#v", definition)
			}
			return
		}
	}
	t.Fatal("expected academy.search.hide in orchestrator permission catalog")
}

func TestEveryProtectedRouteHasPermissionMetadata(t *testing.T) {
	if gaps := routeAuthMetadataGaps(); len(gaps) != 0 {
		t.Fatalf("protected routes missing auth metadata: %#v", gaps)
	}
	seen := map[string]bool{}
	for _, route := range gatewayRoutes() {
		key := route.Method + " " + string(route.Path)
		if seen[key] {
			t.Fatalf("duplicate gateway route metadata for %s", key)
		}
		seen[key] = true
	}
	for _, route := range protectedRoutes() {
		if route.Method == "" || route.Path == "" || route.Service == "" {
			t.Fatalf("route must declare method, path, and service: %#v", route)
		}
		if route.Permission == "" {
			t.Fatalf("protected route must declare permission: %#v", route)
		}
	}
}

func TestServiceDefinitionsGroupRoutesByService(t *testing.T) {
	seen := map[GatewayService]bool{}
	for _, service := range serviceDefinitions() {
		if service.Name == "" {
			t.Fatalf("service definition must declare service name: %#v", service)
		}
		if len(service.Routes) == 0 {
			t.Fatalf("service definition must declare routes: %#v", service)
		}
		if seen[service.Name] {
			t.Fatalf("duplicate service definition for %s", service.Name)
		}
		seen[service.Name] = true
	}
}

func TestApiDocsIncludeEveryGatewayRoute(t *testing.T) {
	docs := apiRouteDocs()
	seen := map[string]apiRouteDoc{}
	for _, doc := range docs {
		seen[doc.Method+" "+doc.Path] = doc
	}

	for _, route := range gatewayRoutes() {
		doc, ok := seen[route.Method+" "+string(route.Path)]
		if !ok {
			t.Fatalf("API docs missing gateway route %s %s", route.Method, route.Path)
		}
		if doc.Permission != string(route.Permission) || doc.Service != string(route.Service) {
			t.Fatalf("API docs route metadata drift for %s %s: got %#v want permission=%q service=%q", route.Method, route.Path, doc, route.Permission, route.Service)
		}
		if route.Public && doc.Authentication != "public" {
			t.Fatalf("API docs route should be public for %s %s: got %#v", route.Method, route.Path, doc)
		}
	}
}

func TestOpenAPIDocumentIncludesEveryGatewayRoute(t *testing.T) {
	doc := openAPIDocument()
	paths, ok := doc["paths"].(map[string]any)
	if !ok {
		t.Fatal("OpenAPI document must include paths")
	}

	for _, route := range gatewayRoutes() {
		pathItem, ok := paths[string(route.Path)].(map[string]any)
		if !ok {
			t.Fatalf("OpenAPI document missing path %s", route.Path)
		}
		if _, ok := pathItem[strings.ToLower(route.Method)]; !ok {
			t.Fatalf("OpenAPI document missing operation %s %s", route.Method, route.Path)
		}
	}
}

func TestGatewayRouteRegistryUsesTypedConstants(t *testing.T) {
	source, err := os.ReadFile("routes.go")
	if err != nil {
		t.Fatalf("read routes.go: %v", err)
	}
	routeRegistry := string(source)
	start := strings.Index(routeRegistry, "func serviceDefinitions() []ServiceDefinition")
	end := strings.Index(routeRegistry[start:], "\nfunc permissionName")
	if start < 0 || end < 0 {
		t.Fatal("expected to locate gateway route registry")
	}
	routeRegistry = routeRegistry[start : start+end]

	for _, pattern := range []*regexp.Regexp{
		regexp.MustCompile(`Path:\s*"[^"]+"`),
		regexp.MustCompile(`Service:\s*"[^"]+"`),
		regexp.MustCompile(`Permission:\s*"[^"]+"`),
		regexp.MustCompile(`ResourceType:\s*"[^"]+"`),
		regexp.MustCompile(`ResourceIDParam:\s*"[^"]+"`),
	} {
		if match := pattern.FindString(routeRegistry); match != "" {
			t.Fatalf("gateway route registry must use typed constants, found raw literal %s", match)
		}
	}
}
