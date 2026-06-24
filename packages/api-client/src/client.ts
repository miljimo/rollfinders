import { createApiGatewayPath } from "./config";
import { ServiceClientError, serviceErrorMessage, type ServiceErrorBody } from "./errors";
import { serviceHeaders, type ServiceActor } from "./headers";

export type ApiClientOptions = {
  baseUrl: string;
  fetcher?: typeof fetch;
};

export type ApiRequestOptions = RequestInit & {
  actor?: ServiceActor | null;
};

export function createApiClient({ baseUrl, fetcher = fetch }: ApiClientOptions) {
  async function request<TResponse>(path: string, init: ApiRequestOptions = {}): Promise<TResponse> {
    const { actor, headers, ...requestInit } = init;
    const response = await fetcher(createApiGatewayPath(baseUrl, path), {
      ...requestInit,
      cache: requestInit.cache ?? "no-store",
      headers: serviceHeaders(actor, headers),
    });

    if (response.status === 204) return {} as TResponse;

    const body = (await response.json().catch(() => ({}))) as ServiceErrorBody | TResponse;
    if (!response.ok) {
      const error = (body as ServiceErrorBody).error;
      throw new ServiceClientError(serviceErrorMessage(body as ServiceErrorBody, response.status), response.status, error?.code);
    }

    return body as TResponse;
  }

  return { request };
}
