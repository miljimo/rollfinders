import type { AccountDeletionRequest } from "@/lib/users-service";
import { accountDeletionDueLabel } from "@/lib/account-deletion";
import { cancelOwnAccountDeletion, requestOwnAccountDeletion } from "./AccountDeletionActions";

export function AccountDeletionPanel({
  request,
  surface,
  notice,
}: {
  request: AccountDeletionRequest | null;
  surface?: string;
  notice?: string;
}) {
  const dueLabel = request ? accountDeletionDueLabel(request) : null;

  return (
    <section className="mt-7 rounded-lg border border-red-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Account deletion</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Request deletion of your RollFinders account and associated personal data. Leaving an academy is a separate action.
      </p>
      {notice === "requested" ? <Notice text="Your deletion request has been recorded." /> : null}
      {notice === "cancelled" ? <Notice text="Your deletion request has been cancelled." /> : null}
      {notice === "confirmation-required" ? <Notice error text="Confirm that you understand before submitting." /> : null}
      {request ? (
        <div className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">Pending processing</p>
          <p className="mt-1 leading-6">Submitted {new Date(request.requestedAt).toLocaleDateString("en-GB")}{dueLabel ? `. Expected completion by ${dueLabel}.` : "."}</p>
          <form action={cancelOwnAccountDeletion} className="mt-4">
            {surface === "mobile" ? <input type="hidden" name="surface" value="mobile" /> : null}
            <button type="submit" className="min-h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-bold text-red-800">
              Cancel deletion request
            </button>
          </form>
        </div>
      ) : (
        <form action={requestOwnAccountDeletion} className="mt-4 grid gap-4">
          {surface === "mobile" ? <input type="hidden" name="surface" value="mobile" /> : null}
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input type="checkbox" name="confirm" value="yes" required className="mt-1 size-5 shrink-0" />
            I understand this requests full account deletion, not only removal from my academy.
          </label>
          <button type="submit" className="min-h-11 w-fit rounded-md bg-red-700 px-4 text-sm font-bold text-white">
            Request account deletion
          </button>
        </form>
      )}
    </section>
  );
}

function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <p role="status" className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${error ? "bg-red-50 text-red-800" : "bg-teal-50 text-teal-800"}`}>{text}</p>;
}
