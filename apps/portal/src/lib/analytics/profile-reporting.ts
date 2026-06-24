import { analyticsFetch } from "./service";

export async function getAcademyProfileViewCount(academyId: string) {
  try {
    const response = await analyticsFetch(`/v1/reports/academy-profile-views?academyId=${encodeURIComponent(academyId)}`);
    if (!response.ok) return 0;
    const body = (await response.json()) as { profileViewCount?: number };
    return Number(body.profileViewCount ?? 0);
  } catch (error) {
    console.error("[analytics] academy profile view count failed", error);
    return 0;
  }
}
