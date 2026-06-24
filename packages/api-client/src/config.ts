export type ApiGatewayConfig = {
  baseUrl: string;
};

export function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function createApiGatewayPath(baseUrl: string, path: string) {
  const cleanBaseUrl = normalizeBaseUrl(baseUrl);
  return `${cleanBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
