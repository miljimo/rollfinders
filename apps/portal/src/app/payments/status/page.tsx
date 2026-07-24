import type { Metadata } from "next";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Clock, GraduationCap, Home, ReceiptText, XCircle } from "lucide-react";
import { Button } from "@/app/_components/Button";
import { PageShell } from "@/app/_components/Page";
import { markBookingPaymentReceived } from "@/lib/bookings";

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
  mobile?: string;
  metadata_mobile_checkout?: string;
  metadata_booking_id?: string;
};

function successfulPayment(result?: string, status?: string) {
  return result === "success" && ["paid", "succeeded", "completed"].includes(String(status ?? "").toLowerCase());
}

function bookingIdFromParams(params: SearchParams) {
  if (params.metadata_booking_id) return params.metadata_booking_id;
  const match = /^booking:([^:]+):/.exec(params.state ?? "");
  return match?.[1] ?? "";
}

async function markPaidBookingPaymentReceived(params: SearchParams) {
  if (!successfulPayment(params.result, params.payment_status)) return "";
  const bookingId = bookingIdFromParams(params);
  if (!bookingId || !params.payment_id) return "";

  try {
    await markBookingPaymentReceived({
      bookingId,
      idempotencyKey: `payment-status-received:${params.payment_id}:${bookingId}`,
      reason: `payment_received:${params.payment_id}`,
    });
    return "payment received";
  } catch (error) {
    console.error("Payment status page could not mark booking payment received.", { bookingId, error, paymentId: params.payment_id });
    return "failed";
  }
}

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
  if (result === "success" || ["paid", "succeeded", "completed"].includes(String(paymentStatus ?? "").toLowerCase())) {
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
  const bookingPaymentReceived = await markPaidBookingPaymentReceived(params);
  const content = statusContent(params.result, params.payment_status);
  const Icon = content.icon;
  const mobile = params.mobile === "1" || params.metadata_mobile_checkout === "1";

  if (mobile) {
    return <MobilePaymentStatus params={params} bookingPaymentReceived={bookingPaymentReceived} content={content} />;
  }

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
            <PaymentDetail label="Booking payment" value={bookingPaymentReceived} />
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

function MobilePaymentStatus({
  bookingPaymentReceived,
  content,
  params,
}: {
  bookingPaymentReceived: string;
  content: ReturnType<typeof statusContent>;
  params: SearchParams;
}) {
  const Icon = content.icon;
  const success = content.title === "Payment received";

  return (
    <main className="min-h-dvh w-screen max-w-[100vw] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#eefaf7_0,#ffffff_36%,#f7faf8_100%)] pb-8 text-slate-950">
      <header className="border-b border-stone-200 bg-white/85 px-4 py-6">
        <div className="flex min-w-0 items-center gap-3">
          <Image src="/logo.png" alt="" width={52} height={52} className="size-12 shrink-0 object-contain" priority />
          <span className="truncate text-3xl font-black tracking-normal text-slate-950">RollFinders</span>
        </div>
      </header>

      <section className="grid gap-5 px-4 py-5">
        <section className={`flex min-w-0 items-center gap-5 rounded-[1.35rem] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${success ? "border-teal-200 bg-teal-50/60" : content.panel}`}>
          <span className={`flex size-20 shrink-0 items-center justify-center rounded-full border-4 ${success ? "border-teal-700 text-teal-800" : content.tone}`}>
            <Icon size={46} strokeWidth={2.5} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="break-words text-3xl font-black leading-tight tracking-normal text-slate-950">{content.title}</h1>
            <p className="mt-2 text-lg font-medium leading-7 text-slate-600">{content.message}</p>
          </div>
        </section>

        <section className="rounded-[1.35rem] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
          <h2 className="flex items-center gap-3 text-2xl font-black tracking-normal text-slate-950">
            <ReceiptText size={27} className="text-teal-800" aria-hidden />
            Payment details
          </h2>
          <dl className="mt-5 divide-y divide-stone-200 text-base">
            <MobilePaymentDetail label="Checkout session" value={params.checkout_session_id} />
            <MobilePaymentDetail label="Payment" value={params.payment_id} />
            <MobilePaymentDetail label="Status" value={params.payment_status} pill />
            <MobilePaymentDetail label="Result" value={params.result} pill />
            <MobilePaymentDetail label="Resource" value={params.resource_id} />
            <MobilePaymentDetail label="Resource type" value={params.resource_type} />
            <MobilePaymentDetail label="Client" value={params.client_id} />
            <MobilePaymentDetail label="State" value={params.state} />
            <MobilePaymentDetail label="Booking payment" value={bookingPaymentReceived} />
          </dl>
        </section>

        <div className="grid gap-3">
          <Button href="/mobile" variant="primary" className="min-h-16 justify-center rounded-xl text-xl">
            <GraduationCap size={25} aria-hidden />
            View Courses
          </Button>
          <Button href="/mobile" variant="secondary" className="min-h-16 justify-center rounded-xl border-2 border-teal-700 bg-white text-xl text-teal-800">
            <Home size={25} aria-hidden />
            Back to Home
          </Button>
        </div>
      </section>
    </main>
  );
}

function MobilePaymentDetail({ label, pill = false, value }: { label: string; pill?: boolean; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 py-3">
      <dt className="font-black text-slate-950">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-slate-600">
        {pill ? <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">{value}</span> : <span className="break-all">{value}</span>}
      </dd>
    </div>
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
