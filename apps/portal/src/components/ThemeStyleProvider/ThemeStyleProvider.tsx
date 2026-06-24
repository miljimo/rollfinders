import type { CSSProperties, ReactNode } from "react";
import { createThemeCssVariables, rollfindersTheme } from "@rollfinders/theme";

import { cn } from "@/lib/utils";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export type ThemeStyleProviderProps = {
  children: ReactNode;
  className?: string;
};

const themeStyle: ThemeStyle = {
  ...createThemeCssVariables(rollfindersTheme),
  colorScheme: rollfindersTheme.colorScheme,
};

export function ThemeStyleProvider({ children, className }: ThemeStyleProviderProps) {
  return (
    <div className={cn("contents", className)} data-theme={rollfindersTheme.name} style={themeStyle}>
      {children}
    </div>
  );
}
