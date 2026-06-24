import { createApiGatewayPath, normalizeBaseUrl } from "@rollfinders/api-client";

import { getEnvVariable } from "./environments";

export function apiGatewayUrl() {
  return normalizeBaseUrl(getEnvVariable("API_PUBLIC_BASE_URL", "http://localhost:3007"));
}

export function apiGatewayPath(path: string) {
  return createApiGatewayPath(apiGatewayUrl(), path);
}
