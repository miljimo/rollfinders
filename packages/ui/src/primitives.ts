export const buttonVariants = ["primary", "secondary", "outline", "danger", "ghost"] as const;
export type ButtonVariant = (typeof buttonVariants)[number];

export const cardVariants = ["default", "profile", "academy", "course", "booking", "analytics"] as const;
export type CardVariant = (typeof cardVariants)[number];

export const textVariants = ["display", "heading", "title", "subtitle", "body", "caption", "button"] as const;
export type TextVariant = (typeof textVariants)[number];

export const badgeVariants = ["default", "success", "warning", "danger", "muted"] as const;
export type BadgeVariant = (typeof badgeVariants)[number];

export const beltRanks = ["white", "blue", "purple", "brown", "black"] as const;
export type BeltRank = (typeof beltRanks)[number];

export function beltLabel(rank?: BeltRank | null) {
  if (!rank) return "White Belt";
  return `${rank.charAt(0).toUpperCase()}${rank.slice(1)} Belt`;
}
