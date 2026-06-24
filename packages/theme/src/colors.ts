export const rollfindersColors = {
  primary: "#056961",
  primarySoft: "#ecfdf5",
  secondary: "#111827",
  success: "#15803d",
  warning: "#b45309",
  danger: "#b91c1c",
  background: "#f8faf7",
  surface: "#ffffff",
  surfaceSecondary: "#f5f5f4",
  textPrimary: "#1e2520",
  textSecondary: "#475569",
  textMuted: "#64748b",
  border: "#e7e5e4",
  borderFocus: "#056961",
} as const;

export type RollFindersColorToken = keyof typeof rollfindersColors;
