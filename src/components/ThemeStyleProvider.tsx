import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export type ThemeStyleProviderProps = {
  children: ReactNode;
  className?: string;
};

const themeStyle: ThemeStyle = {
  "--background": "#f8faf7",
  "--foreground": "#1e2520",
  "--accent": "#056961",
  "--accent-soft": "#ecfdf5",
  "--surface": "#ffffff",
  "--surface-muted": "#f5f5f4",
  "--border": "#e7e5e4",
  colorScheme: "light",
};

export function ThemeStyleProvider({ children, className }: ThemeStyleProviderProps) {
  return (
    <div className={cn("contents", className)} data-theme="rollfinder" style={themeStyle}>
      {children}
    </div>
  );
}
