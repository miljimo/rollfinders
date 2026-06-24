export const rollfindersIcons = {
  academy: "building-2",
  booking: "clipboard-check",
  course: "calendar-days",
  dashboard: "house",
  map: "map",
  payment: "credit-card",
  profile: "user",
  search: "search",
  settings: "settings",
  users: "users",
} as const;

export type RollFindersIconToken = keyof typeof rollfindersIcons;
