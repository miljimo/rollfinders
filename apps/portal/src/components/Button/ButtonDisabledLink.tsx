import type { ButtonLinkProps } from "./types";

export function ButtonDisabledLink(props: ButtonLinkProps) {
  const { children, className, disabled, href, size, variant, ...spanProps } = props;
  void disabled;
  void href;
  void size;
  void variant;

  return (
    <span aria-disabled="true" className={className} role="link" {...spanProps}>
      {children}
    </span>
  );
}
