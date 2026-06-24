import { rollfindersColors } from "./colors";
import { rollfindersIcons } from "./icons";
import { rollfindersRadius } from "./radius";
import { rollfindersShadows } from "./shadows";
import { rollfindersSpacing } from "./spacing";
import { rollfindersTypography } from "./typography";

export const rollfindersTheme = {
  name: "rollfinders",
  colorScheme: "light",
  colors: rollfindersColors,
  typography: rollfindersTypography,
  spacing: rollfindersSpacing,
  radius: rollfindersRadius,
  shadows: rollfindersShadows,
  icons: rollfindersIcons,
} as const;

export type RollFindersTheme = typeof rollfindersTheme;

export function createThemeCssVariables(theme: RollFindersTheme = rollfindersTheme) {
  return {
    "--background": theme.colors.background,
    "--foreground": theme.colors.textPrimary,
    "--accent": theme.colors.primary,
    "--accent-soft": theme.colors.primarySoft,
    "--surface": theme.colors.surface,
    "--surface-muted": theme.colors.surfaceSecondary,
    "--border": theme.colors.border,
    "--border-focus": theme.colors.borderFocus,
  } as const;
}
