export type ServiceActor = {
  id: string;
  role?: string | null;
  email?: string | null;
  academyId?: string | null;
};

export function serviceHeaders(actor?: ServiceActor | null, headers?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(actor?.id ? { "X-Actor-User-ID": actor.id, "X-Actor": JSON.stringify(actor) } : {}),
    ...headers,
  };
}
