"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/Button";
import type { ButtonSize, ButtonVariant } from "@/components/Button";

export type CopyButtonProps = {
  className?: string;
  copiedLabel?: string;
  label: string;
  size?: ButtonSize;
  value: string;
  variant?: ButtonVariant;
};

export function CopyButton({
  className,
  copiedLabel = "Copied",
  label,
  size = "icon",
  value,
  variant = "secondary",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      aria-label={copied ? copiedLabel : label}
      onClick={copyValue}
    >
      {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
    </Button>
  );
}
