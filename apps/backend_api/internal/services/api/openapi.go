package api

import (
	"net/http"
	"strings"

	"rollfinders/internal/services/api/domain"
)

func (s *server) openAPI(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, openAPIDocument())
}

func openAPIDocument() map[string]any {
	paths := map[string]any{
		"/": map[string]any{
			"get": openAPIOperation(apiRouteDoc{
				Method:         http.MethodGet,
				Path:           "/",
				Service:        "api",
				Authentication: "public",
				Notes:          "Generated API overview.",
			}),
		},
		"/openapi.json": map[string]any{
			"get": openAPIOperation(apiRouteDoc{
				Method:         http.MethodGet,
				Path:           "/openapi.json",
				Service:        "api",
				Authentication: "public",
				Notes:          "OpenAPI document for Postman and API clients.",
			}),
		},
		"/healthz": map[string]any{
			"get": openAPIOperation(apiRouteDoc{
				Method:         http.MethodGet,
				Path:           "/healthz",
				Service:        "api",
				Authentication: "public",
				Notes:          "Gateway liveness and dependency health check.",
			}),
		},
		"/readyz": map[string]any{
			"get": openAPIOperation(apiRouteDoc{
				Method:         http.MethodGet,
				Path:           "/readyz",
				Service:        "api",
				Authentication: "public",
				Notes:          "Gateway readiness and dependency readiness check.",
			}),
		},
	}

	for _, route := range gatewayRoutes() {
		auth := "required"
		if route.Public {
			auth = "public"
		}
		doc := apiRouteDoc{
			Method:          route.Method,
			Path:            string(route.Path),
			Service:         string(route.Service),
			Authentication:  auth,
			Permission:      string(route.Permission),
			ResourceIDParam: string(route.ResourceIDParam),
		}
		path := string(route.Path)
		pathItem, ok := paths[path].(map[string]any)
		if !ok {
			pathItem = map[string]any{}
			paths[path] = pathItem
		}
		pathItem[strings.ToLower(route.Method)] = openAPIOperation(doc)
	}

	return map[string]any{
		"openapi": "3.1.0",
		"info": map[string]any{
			"title":       "RollFinders API Gateway",
			"version":     "v1",
			"description": "Generated from the api_agw route registry. Import this document into Postman to manually test gateway routes.",
		},
		"servers": []map[string]string{
			{"url": "http://localhost:8080", "description": "Local api_agw"},
		},
		"paths": paths,
		"components": map[string]any{
			"securitySchemes": map[string]any{
				"ActorUserID": map[string]string{
					"type": "apiKey",
					"in":   "header",
					"name": actorUserIDHeader,
				},
				"OrganisationID": map[string]string{
					"type": "apiKey",
					"in":   "header",
					"name": domain.OrganisationIDHeader,
				},
			},
			"schemas": map[string]any{
				"GenericRequest": map[string]any{
					"type":                 "object",
					"additionalProperties": true,
				},
				"GenericResponse": map[string]any{
					"type":                 "object",
					"additionalProperties": true,
				},
				"ErrorResponse": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"error": map[string]string{"type": "string"},
						"code":  map[string]string{"type": "string"},
					},
				},
			},
		},
	}
}

func openAPIOperation(doc apiRouteDoc) map[string]any {
	operation := map[string]any{
		"operationId": openAPIOperationID(doc.Method, doc.Path),
		"summary":     openAPISummary(doc),
		"tags":        []string{doc.Service},
		"responses": map[string]any{
			"200": map[string]any{
				"description": "Successful response from " + doc.Service + ".",
				"content": map[string]any{
					domain.ContentTypeJSON: map[string]any{
						"schema": map[string]string{"$ref": "#/components/schemas/GenericResponse"},
					},
				},
			},
			"401": map[string]any{
				"description": "Missing or invalid actor identity.",
				"content": map[string]any{
					domain.ContentTypeJSON: map[string]any{
						"schema": map[string]string{"$ref": "#/components/schemas/ErrorResponse"},
					},
				},
			},
			"403": map[string]any{
				"description": "Authorisation denied or route permission mapping missing.",
				"content": map[string]any{
					domain.ContentTypeJSON: map[string]any{
						"schema": map[string]string{"$ref": "#/components/schemas/ErrorResponse"},
					},
				},
			},
			"503": map[string]any{
				"description": "Gateway dependency or authorisation service unavailable.",
				"content": map[string]any{
					domain.ContentTypeJSON: map[string]any{
						"schema": map[string]string{"$ref": "#/components/schemas/ErrorResponse"},
					},
				},
			},
		},
	}
	if doc.Notes != "" {
		operation["description"] = doc.Notes
	}
	if doc.Permission != "" {
		operation["description"] = strings.TrimSpace(strings.TrimSpace(doc.Notes) + " Required permission: `" + doc.Permission + "`.")
	}
	if doc.Authentication != "public" {
		operation["security"] = []map[string][]string{{"ActorUserID": {}, "OrganisationID": {}}}
	}
	params := openAPIPathParameters(doc.Path)
	if len(params) > 0 {
		operation["parameters"] = params
	}
	if doc.Method == http.MethodPost || doc.Method == http.MethodPut || doc.Method == http.MethodPatch {
		operation["requestBody"] = map[string]any{
			"required": false,
			"content": map[string]any{
				domain.ContentTypeJSON: map[string]any{
					"schema": map[string]string{"$ref": "#/components/schemas/GenericRequest"},
				},
			},
		}
	}
	return operation
}

func openAPIPathParameters(path string) []map[string]any {
	parts := splitPath(path)
	params := make([]map[string]any, 0)
	for _, part := range parts {
		if !strings.HasPrefix(part, "{") || !strings.HasSuffix(part, "}") {
			continue
		}
		name := strings.TrimSuffix(strings.TrimPrefix(part, "{"), "}")
		params = append(params, map[string]any{
			"name":        name,
			"in":          "path",
			"required":    true,
			"description": "Route parameter `" + name + "`.",
			"schema":      map[string]string{"type": "string"},
		})
	}
	return params
}

func openAPISummary(doc apiRouteDoc) string {
	if doc.Permission == "" {
		return doc.Method + " " + doc.Path
	}
	return doc.Method + " " + doc.Path + " (" + doc.Permission + ")"
}

func openAPIOperationID(method string, path string) string {
	parts := append([]string{strings.ToLower(method)}, splitPath(path)...)
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.Trim(part, "{}")
		part = strings.ReplaceAll(part, "-", "_")
		if part != "" {
			out = append(out, part)
		}
	}
	return strings.Join(out, "_")
}
