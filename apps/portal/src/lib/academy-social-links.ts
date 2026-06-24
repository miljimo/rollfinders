import type { AcademySocialPlatform } from "@prisma/client";

export type AcademySocialLinkInput = {
  platform: AcademySocialPlatform;
  url: string;
};

export const academySocialPlatforms = ["FACEBOOK", "INSTAGRAM", "X", "YOUTUBE", "TIKTOK", "LINKEDIN", "WEBSITE", "OTHER"] as const satisfies readonly AcademySocialPlatform[];

export const academySocialPlatformLabels: Record<AcademySocialPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  X: "X",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  WEBSITE: "Website",
  OTHER: "Other",
};

export const academySocialPlatformOptions = Object.entries(academySocialPlatformLabels).map(([value, label]) => ({
  value: value as AcademySocialPlatform,
  label,
}));

const platformSet = new Set<string>(academySocialPlatforms);
const legacyPlatformFields: Partial<Record<AcademySocialPlatform, "facebookUrl" | "instagramUrl" | "xUrl">> = {
  FACEBOOK: "facebookUrl",
  INSTAGRAM: "instagramUrl",
  X: "xUrl",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAcademySocialPlatform(value: unknown): value is AcademySocialPlatform {
  return typeof value === "string" && platformSet.has(value as AcademySocialPlatform);
}

export function isSafeSocialUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSocialUrl(value: string) {
  return value.trim();
}

export function parseAcademySocialLinksJson(value: unknown): { links: AcademySocialLinkInput[]; error?: string } {
  if (value === undefined || value === null || value === "") return { links: [] };
  if (typeof value !== "string") return { links: [], error: "Social links must be submitted as JSON." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { links: [], error: "Social links could not be read." };
  }

  if (!Array.isArray(parsed)) return { links: [], error: "Social links must be a list." };

  const links: AcademySocialLinkInput[] = [];
  const seen = new Set<AcademySocialPlatform>();

  for (const item of parsed) {
    if (!isRecord(item)) return { links: [], error: "Each social link needs a platform and URL." };
    const platform = item.platform;
    const url = typeof item.url === "string" ? normalizeSocialUrl(item.url) : "";
    if (!isAcademySocialPlatform(platform)) return { links: [], error: "Choose a supported social platform." };
    if (!url) continue;
    if (!isSafeSocialUrl(url)) return { links: [], error: "Social links must be valid http or https URLs." };
    if (seen.has(platform)) continue;
    seen.add(platform);
    links.push({ platform, url });
  }

  return { links };
}

export function legacySocialUrlsFromLinks(links: AcademySocialLinkInput[]) {
  const values = {
    facebookUrl: "",
    instagramUrl: "",
    xUrl: "",
  };

  for (const link of links) {
    const field = legacyPlatformFields[link.platform];
    if (field) values[field] = link.url;
  }

  return values;
}

export function socialLinksFromLegacy(values: { facebookUrl?: string | null; instagramUrl?: string | null; xUrl?: string | null }) {
  const links: AcademySocialLinkInput[] = [];
  if (values.facebookUrl) links.push({ platform: "FACEBOOK", url: values.facebookUrl });
  if (values.instagramUrl) links.push({ platform: "INSTAGRAM", url: values.instagramUrl });
  if (values.xUrl) links.push({ platform: "X", url: values.xUrl });
  return links;
}
