type AdminSearchParams = Record<string, string | string[] | undefined>;

export function UserResult({ params }: { params: AdminSearchParams }) {
  const result = firstParam(params.userResult);
  if (!result) return null;
  const email = firstParam(params.email);
  const success = result === "password_reset_sent" || result === "email_verified";
  const message = result === "duplicate_email" ? `A user with ${email ?? "that email address"} already exists.` : result === "email_verified" ? `User email verified${email ? ` for ${email}` : ""}.` : result === "password_reset_sent" ? `Password reset email sent${email ? ` to ${email}` : ""}.` : result === "password_reset_failed" ? `Password reset email could not be sent${email ? ` to ${email}` : ""}.` : result === "not_authorised" ? "You do not have permission to manage that user." : null;
  if (!message) return null;
  return <div className={`mt-4 rounded-md border px-4 py-3 text-sm font-semibold ${success ? "border-teal-100 bg-teal-50 text-teal-900" : "border-red-100 bg-red-50 text-red-800"}`}>{message}</div>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

