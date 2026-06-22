import { getEnvVariable } from "./environments";

export type AuthorisationActor = {
  id: string;
  role?: string;
  academyId?: string | null;
  privileges?: string[];
};

export type AuthorisationScope = {
  organisationId?: string | null;
  applicationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
};

type AuthoriseResponse = {
  authorized: boolean;
  decision: "allow" | "deny";
  reason?: string;
};

export class AuthorisationServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthorisationServiceError";
  }
}

const authorisationServiceUrl = () => getEnvVariable("AUTHORISATION_PUBLIC_BASE_URL", "http://localhost:8085").replace(/\/+$/, "");
const compatibilityFallbackEnabled = () => getEnvVariable("AUTHORISATION_COMPATIBILITY_FALLBACK", "false").toLowerCase() === "true";

function headers() {
  return {
    "Content-Type": "application/json",
  };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : `Authorisation service request failed with status ${response.status}.`;
    throw new AuthorisationServiceError(message, response.status);
  }
  return body;
}

export async function authorize(
  actor: AuthorisationActor | null | undefined,
  permission: string,
  scope: AuthorisationScope = {},
) {
  if (!actor?.id) return false;

  try {
    const response = await fetch(`${authorisationServiceUrl()}/v1/authorize`, {
      method: "POST",
      cache: "no-store",
      headers: headers(),
      body: JSON.stringify({
        subjectId: actor.id,
        permission,
        organisationId: scope.organisationId ?? actor.academyId ?? undefined,
        applicationId: scope.applicationId ?? getEnvVariable("ROLLFINDERS_APPLICATION_ID", "app_rollfinders"),
        resourceType: scope.resourceType ?? undefined,
        resourceId: scope.resourceId ?? undefined,
      }),
    });
    const result = (await parseResponse(response)) as AuthoriseResponse;
    return result.authorized === true && result.decision === "allow";
  } catch (error) {
    if (!compatibilityFallbackEnabled()) {
      if (error instanceof AuthorisationServiceError) return false;
      throw error;
    }
    return legacyPermissionFallback(actor, permission);
  }
}

export async function requirePermission(
  actor: AuthorisationActor | null | undefined,
  permission: string,
  scope: AuthorisationScope = {},
) {
  return authorize(actor, permission, scope);
}

function legacyPermissionFallback(actor: AuthorisationActor, permission: string) {
  if (Array.isArray(actor.privileges) && actor.privileges.includes(permission)) return true;

  const role = actor.role;
  if (!role) return false;
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;

  if (permission === "users.admin.access") {
    return role === "PLATFORM_ADMIN" || role === "ACADEMY_ADMIN" || role === "ACADEMY_OWNER";
  }

  if (permission.startsWith("academy.") || permission.startsWith("course.") || permission.startsWith("booking.")) {
    return role === "PLATFORM_ADMIN" || role === "ACADEMY_ADMIN" || role === "ACADEMY_OWNER";
  }

  if (permission.startsWith("payment.") || permission.startsWith("payout.") || permission.startsWith("organisation.")) {
    return role === "PLATFORM_ADMIN";
  }

  return false;
}
