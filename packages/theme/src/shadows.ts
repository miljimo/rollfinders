export const rollfindersShadows = {
  none: "none",
  sm: "0 1px 2px rgb(15 23 42 / 0.08)",
  md: "0 8px 24px rgb(15 23 42 / 0.10)",
  lg: "0 18px 48px rgb(15 23 42 / 0.16)",
} as const;

export type RollFindersShadowToken = keyof typeof rollfindersShadows;
