import type { ReactNode } from "react";
import { ButtonDisabledLink } from "./ButtonDisabledLink";
import { ButtonElement } from "./ButtonElement";
import { ButtonExternalLink } from "./ButtonExternalLink";
import { ButtonInternalLink } from "./ButtonInternalLink";
import { buttonClassName } from "./buttonStyles";
import type { ButtonProps } from "./types";

function hasAccessibleIconLabel(children: ReactNode, ariaLabel?: string) {
  if (ariaLabel) return true;
  if (typeof children === "string" && children.trim()) return true;
  if (typeof children === "number") return true;
  return false;
}

function isExternalHref(href: unknown) {
  if (typeof href !== "string") return false;
  return /^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href);
}

export function Button(props: ButtonProps) {
  const { className, disabled = false, size = "md", variant = "neutral" } = props;
  const computedClassName = buttonClassName({ className, disabled, size, variant });

  if (size === "icon" && !hasAccessibleIconLabel(props.children, props["aria-label"])) {
    throw new Error("Icon buttons must include an aria-label or readable text.");
  }

  if ("href" in props && props.href !== undefined) {
    if (disabled) {
      return <ButtonDisabledLink {...props} className={computedClassName} disabled />;
    }

    if (isExternalHref(props.href) || props.target) {
      return <ButtonExternalLink {...props} className={computedClassName} />;
    }

    return <ButtonInternalLink {...props} className={computedClassName} />;
  }

  return <ButtonElement {...props} className={computedClassName} disabled={disabled} />;
}

export type { ButtonProps, ButtonSize, ButtonVariant } from "./types";
