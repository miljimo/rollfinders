import type Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "neutral" | "secondary" | "danger" | "subtle";
export type ButtonSize = "md" | "sm" | "icon";

type SharedButtonProps = {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type NativeButtonProps = SharedButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "disabled"> & {
    href?: never;
  };

type LinkButtonProps = SharedButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "disabled" | "href"> & {
    href: Parameters<typeof Link>[0]["href"] | string;
  };

export type ButtonProps = NativeButtonProps | LinkButtonProps;
export type ButtonLinkProps = LinkButtonProps & { className: string };
export type ButtonElementProps = NativeButtonProps & { className: string };

