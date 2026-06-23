import "server-only";

import { apiGatewayUrl } from "./apiGateway";
import { getEnvVariable } from "./environments";

export type OrganisationRecord = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  created_at: string;
  updated_at: string;
};

export type OrganisationApplicationRecord = {
  id: string;
  organisation_id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  created_at: string;
  updated_at: string;
};

export type ApplicationServiceRecord = {
  application_id: string;
  service_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export class OrganisationServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OrganisationServiceError";
  }
}

const organisationServiceUrl = apiGatewayUrl;

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : `Organisation service request failed with status ${response.status}.`;
    throw new OrganisationServiceError(message, response.status);
  }
  return body;
}

export async function getOrganisation(organisationId: string) {
  const response = await fetch(`${organisationServiceUrl()}/v1/organisations/${encodeURIComponent(organisationId)}`, {
    method: "GET",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const result = await parseResponse(response) as { organisation?: OrganisationRecord };
  return result.organisation ?? null;
}

export async function listOrganisations() {
  const response = await fetch(`${organisationServiceUrl()}/v1/organisations`, {
    method: "GET",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const result = await parseResponse(response) as { organisations?: OrganisationRecord[] };
  return result.organisations ?? [];
}

export async function getOrganisationApplication(applicationId = getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders")) {
  const response = await fetch(`${organisationServiceUrl()}/v1/applications/${encodeURIComponent(applicationId)}`, {
    method: "GET",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const result = await parseResponse(response) as { application?: OrganisationApplicationRecord };
  return result.application ?? null;
}

export async function listOrganisationApplications() {
  const response = await fetch(`${organisationServiceUrl()}/v1/applications`, {
    method: "GET",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const result = await parseResponse(response) as { applications?: OrganisationApplicationRecord[] };
  return result.applications ?? [];
}

export async function listApplicationServices(applicationId = getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders")) {
  const response = await fetch(`${organisationServiceUrl()}/v1/applications/${encodeURIComponent(applicationId)}/services`, {
    method: "GET",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const result = await parseResponse(response) as { services?: ApplicationServiceRecord[] };
  return result.services ?? [];
}

export async function isApplicationServiceEnabled(serviceKey: string, applicationId = getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders")) {
  const services = await listApplicationServices(applicationId);
  return services.some((service) => service.service_key === serviceKey && service.enabled);
}
