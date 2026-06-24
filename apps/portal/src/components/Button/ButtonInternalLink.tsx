import Link from "next/link";
import type { ButtonLinkProps } from "./types";

export function ButtonInternalLink(props: ButtonLinkProps) {
  const { children, className, disabled, href, size, variant, ...linkProps } = props;
  void disabled;
  void size;
  void variant;

  return (
    <Link className={className} href={href as Parameters<typeof Link>[0]["href"]} {...linkProps}>
      {children}
    </Link>
  );
}
