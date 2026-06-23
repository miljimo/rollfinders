import { getEnvVariable } from "./environments";

export function apiGatewayUrl() {
  return getEnvVariable("API_PUBLIC_BASE_URL", "http://localhost:3007").replace(/\/+$/, "");
}

export function apiGatewayPath(path: string) {
  return `${apiGatewayUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
