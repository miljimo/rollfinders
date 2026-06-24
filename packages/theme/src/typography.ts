export const rollfindersTypography = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: "900" },
  heading: { fontSize: 32, lineHeight: 40, fontWeight: "900" },
  title: { fontSize: 22, lineHeight: 30, fontWeight: "800" },
  subtitle: { fontSize: 16, lineHeight: 24, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
  button: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
} as const;

export type RollFindersTypographyToken = keyof typeof rollfindersTypography;
