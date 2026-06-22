"use client";

import { useFormStatus } from "react-dom";

export function BookingActionSubmitButton({
  children,
  className,
  pendingLabel,
}: {
  children: React.ReactNode;
  className: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
      disabled={pending}
      role="menuitem"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
