import type { ButtonLinkProps } from "./types";

export function ButtonExternalLink(props: ButtonLinkProps) {
  const { children, className, disabled, href, rel, size, target, variant, ...anchorProps } = props;
  void disabled;
  void size;
  void variant;

  const safeRel = target === "_blank" ? rel ?? "noreferrer" : rel;

  return (
    <a className={className} href={String(href)} rel={safeRel} target={target} {...anchorProps}>
      {children}
    </a>
  );
}
