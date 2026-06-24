export class ServiceClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ServiceClientError";
  }
}

export type ServiceErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export function serviceErrorMessage(body: ServiceErrorBody | Record<string, unknown>, status: number) {
  const error = (body as ServiceErrorBody).error;
  if (typeof error?.message === "string") return error.message;
  const message = (body as ServiceErrorBody).message;
  if (typeof message === "string") return message;
  return `Service request failed with status ${status}.`;
}
