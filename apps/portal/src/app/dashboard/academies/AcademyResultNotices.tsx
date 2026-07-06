type AdminSearchParams = Record<string, string | string[] | undefined>;

export function ClaimReminderResult({ params }: { params: AdminSearchParams }) {
  const result = firstParam(params.claimReminderResult);
  if (!result) return null;
  const reason = firstParam(params.claimReminderReason);
  const queued = firstParam(params.queued) ?? "0";
  const skipped = firstParam(params.skipped) ?? "0";
  const failed = firstParam(params.failed) ?? "0";
  const message = result === "queued" ? "Claim reminder queued." : result === "skipped" ? `Claim reminder skipped${reason ? `: ${claimReminderReasonLabel(reason)}.` : "."}` : result === "failed" ? `Claim reminder failed${reason ? `: ${reason}.` : "."}` : result === "bulk" ? `${queued} queued. ${skipped} skipped. ${failed} failed.` : result === "none_selected" ? "Select at least one academy before sending claim reminders." : result === "batch_too_large" ? "Too many academies selected for one reminder batch." : result === "unauthorized" ? "You do not have permission to send claim reminders." : null;
  return message ? <SuccessNotice message={message} /> : null;
}

export function ClaimInvitationResult({ params }: { params: AdminSearchParams }) {
  const result = firstParam(params.claimInvitationResult);
  if (!result) return null;
  const reason = firstParam(params.claimInvitationReason);
  const message = result === "queued" ? "Academy saved and claim invitation queued." : result === "skipped" ? `Academy saved. Claim invitation skipped${reason ? `: ${claimReminderReasonLabel(reason)}.` : "."}` : result === "failed" ? `Academy saved. Claim invitation was not queued${reason ? `: ${reason}.` : "."}` : result === "not_sent" ? "Academy saved. Claim invitation not sent." : result === "unauthorized" ? "Academy saved. You do not have permission to send claim invitations." : null;
  return message ? <SuccessNotice message={message} /> : null;
}

function SuccessNotice({ message }: { message: string }) {
  return <div className="mt-4 rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">{message}</div>;
}

function claimReminderReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    invalid_email: "Invalid email",
    managed: "Already claimed",
    missing_email: "No email",
    not_found: "Academy not found",
    pending_claim: "Pending claim",
    recently_sent: "Recently sent",
  };
  return labels[reason] ?? reason.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

