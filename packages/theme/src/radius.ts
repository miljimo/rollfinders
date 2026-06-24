export const rollfindersRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 999,
  circle: 9999,
} as const;

export type RollFindersRadiusToken = keyof typeof rollfindersRadius;
