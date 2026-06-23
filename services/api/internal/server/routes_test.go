package server

import "testing"

func TestRoutePermissionCatalogIsDerivedFromOrchestratorRoutes(t *testing.T) {
	catalog := routePermissionCatalog()
	if len(catalog) == 0 {
		t.Fatal("expected route permission catalog")
	}
	for _, definition := range catalog {
		if definition.Code == "academy.search.hide" {
			if definition.ResourceType != "academy" {
				t.Fatalf("resource type=%q, want academy", definition.ResourceType)
			}
			if definition.Name == "" || definition.Description == "" {
				t.Fatalf("expected generated name and description: %#v", definition)
			}
			return
		}
	}
	t.Fatal("expected academy.search.hide in orchestrator permission catalog")
}
