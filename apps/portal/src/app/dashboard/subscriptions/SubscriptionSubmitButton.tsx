"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/Button";

export function SubscriptionSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" className="min-h-11 justify-center" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
      {pending ? pendingLabel : label}
    </Button>
  );
}
