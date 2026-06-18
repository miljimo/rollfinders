import type { Metadata } from "next";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Payment status | RollFinders",
  description: "Review the status of a RollFinders payment.",
};

type SearchParams = {
  checkout_session_id?: string;
  client_id?: string;
  payment_id?: string;
  payment_status?: string;
  resource_id?: string;
  resource_type?: string;
  result?: string;
  state?: string;
};

function statusContent(result?: string, paymentStatus?: string) {
  if (result === "cancelled" || paymentStatus === "cancelled") {
    return {
      icon: XCircle,
      title: "Payment cancelled",
      tone: "text-red-700",
      panel: "border-red-200 bg-red-50",
      message: "No payment was completed. You can return to RollFinders and try again.",
    };
  }
  if (result === "failed" || paymentStatus === "failed") {
    return {
      icon: AlertCircle,
      title: "Payment failed",
      tone: "text-red-700",
      panel: "border-red-200 bg-red-50",
      message: "The payment could not be completed. Please try again or contact support if the issue continues.",
    };
  }
  if (paymentStatus === "succeeded") {
    return {
      icon: CheckCircle2,
      title: "Payment received",
      tone: "text-teal-800",
      panel: "border-teal-200 bg-teal-50",
      message: "Your payment has been confirmed.",
    };
  }
  return {
    icon: Clock,
    title: "Payment pending",
    tone: "text-amber-800",
    panel: "border-amber-200 bg-amber-50",
    message: "Stripe returned successfully. Final confirmation may still be processing.",
  };
}

export default async function PaymentStatusPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const content = statusContent(params.result, params.payment_status);
  const Icon = content.icon;

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className={`rounded-lg border p-5 shadow-sm ${content.panel}`}>
          <Icon className={content.tone} size={32} aria-hidden />
          <h1 className="mt-4 text-3xl font-black text-stone-950">{content.title}</h1>
          <p className="mt-3 text-base leading-7 text-stone-700">{content.message}</p>
        </div>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-950">Payment details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <PaymentDetail label="Checkout session" value={params.checkout_session_id} />
            <PaymentDetail label="Payment" value={params.payment_id} />
            <PaymentDetail label="Status" value={params.payment_status} />
            <PaymentDetail label="Result" value={params.result} />
            <PaymentDetail label="Resource" value={params.resource_id} />
            <PaymentDetail label="Resource type" value={params.resource_type} />
            <PaymentDetail label="Client" value={params.client_id} />
            <PaymentDetail label="State" value={params.state} />
          </dl>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/courses" variant="primary">View Courses</Button>
          <Button href="/" variant="secondary">Back to Home</Button>
        </div>
      </section>
    </PageShell>
  );
}

function PaymentDetail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-bold text-stone-950">{label}</dt>
      <dd className="mt-1 break-all text-stone-700">{value}</dd>
    </div>
  );
}
