import { clsx } from "clsx";
import type { ReactNode } from "react";

export type PanelContextProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  pin?: ReactNode;
};

export function PanelContext({ children, className, contentClassName, pin }: PanelContextProps) {
  return (
    <div className={clsx("relative rounded-lg border border-stone-200 bg-white", className)}>
      {pin ? <div className="absolute right-2 top-2">{pin}</div> : null}
      <div className={clsx("p-3", pin && "pr-9", contentClassName)}>{children}</div>
    </div>
  );
}
