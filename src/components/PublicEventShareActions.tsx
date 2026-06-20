"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/Button";

type ShareMetadata = Record<string, string | number | boolean | null | undefined>;

function trackShareAction(actionType: string, metadata?: ShareMetadata) {
  const body = JSON.stringify({
    eventName: "event_shared",
    metadata: { ...metadata, actionType },
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/analytics/events", {
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => undefined);
}

export function PublicEventShareActions({
  eventTitle,
  shareUrl,
  metadata,
}: {
  eventTitle: string;
  shareUrl: string;
  metadata?: ShareMetadata;
}) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = useMemo(() => encodeURIComponent(shareUrl), [shareUrl]);
  const encodedText = useMemo(() => encodeURIComponent(eventTitle), [eventTitle]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      trackShareAction("copy_link", metadata);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="secondary" onClick={copyLink} className="w-full">
        {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {copied ? "Copied" : "Copy Link"}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          size="sm"
          variant="subtle"
          onClick={() => trackShareAction("whatsapp", metadata)}
        >
          WhatsApp
          <ExternalLink size={14} aria-hidden />
        </Button>
        <Button
          href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          size="sm"
          variant="subtle"
          onClick={() => trackShareAction("x", metadata)}
        >
          X
          <ExternalLink size={14} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
