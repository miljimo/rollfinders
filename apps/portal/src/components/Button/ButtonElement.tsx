import type { ButtonElementProps } from "./types";

export function ButtonElement(props: ButtonElementProps) {
  const { children, className, type = "button", variant, size, ...buttonProps } = props;
  void variant;
  void size;

  return (
    <button className={className} type={type} {...buttonProps}>
      {children}
    </button>
  );
}
