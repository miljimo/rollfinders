## API Gateway Documents

Postman can import the generated OpenAPI document directly:

```text
docs/services/api/openapi.json
```

When `api_agw` is running, Postman can also import the live document URL:

```text
http://localhost:8080/openapi.json
```

The OpenAPI document is generated from the API gateway route registry in:

```text
apps/backend_api/internal/services/api/server/routes.go
```

Protected operations include the `X-Actor-User-ID` API key header security scheme. Public operations are marked without security.
