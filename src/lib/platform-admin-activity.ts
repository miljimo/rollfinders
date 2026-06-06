import {
  PlatformAdminActivityAction,
  PlatformAdminActivitySource,
  PlatformAdminExemptionType,
  Role,
  UserStatus,
  type PlatformAdminActivityEvent,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const defaultWeeklyAcademyTarget = 3;
const defaultWeeklyTargetUserId = null;

type DbClient = Prisma.TransactionClient | typeof prisma;

export type UtcIsoWeek = {
  year: number;
  week: number;
  startsAt: Date;
  endsAt: Date;
};

export type RecordPlatformAdminActivityEventInput = {
  actorUserId: string;
  action: PlatformAdminActivityAction;
  sourceEntityId: string;
  sourceType?: PlatformAdminActivitySource;
  occurredAt?: Date;
  points?: number;
  dedupeKey?: string;
};

export type PlatformAdminActivitySummary = {
  weekStart: Date;
  weekEnd: Date;
  weeklyAcademyTarget: number;
  academiesCreated: number;
  openMatsCreated: number;
  academyAdminsActivated: number;
  pointsEarnedThisWeek: number;
  totalPoints: number;
  remainingAcademiesToTarget: number;
  targetComplete: boolean;
  qualifyingContributionCount: number;
  activityExempt: boolean;
  showLowMomentumNudge: boolean;
  suggestedNextAction: string | null;
};

export function getUtcIsoWeek(input: Date = new Date()): UtcIsoWeek {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = date.getUTCDay() || 7;
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - day);

  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstThursdayDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstThursdayDay);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));

  const startsAt = new Date(date);
  startsAt.setUTCDate(date.getUTCDate() - day + 1);
  startsAt.setUTCHours(0, 0, 0, 0);

  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(startsAt.getUTCDate() + 7);

  return { year, week, startsAt, endsAt };
}

export function defaultActivitySourceType(action: PlatformAdminActivityAction): PlatformAdminActivitySource {
  if (action === PlatformAdminActivityAction.ACADEMY_CREATED) return PlatformAdminActivitySource.ACADEMY;
  if (action === PlatformAdminActivityAction.OPEN_MAT_CREATED) return PlatformAdminActivitySource.OPEN_MAT;
  return PlatformAdminActivitySource.ACADEMY_ADMIN;
}

export function defaultActivityPoints(action: PlatformAdminActivityAction) {
  return action === PlatformAdminActivityAction.ACADEMY_CREATED ? 5 : 1;
}

export function platformAdminActivityDedupeKey(action: PlatformAdminActivityAction, sourceEntityId: string) {
  if (action === PlatformAdminActivityAction.ACADEMY_CREATED) return `academy_created:${sourceEntityId}`;
  if (action === PlatformAdminActivityAction.OPEN_MAT_CREATED) return `open_mat_created:${sourceEntityId}`;
  return `academy_admin_activated:${sourceEntityId}`;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function ensurePlatformAdminProfile(userId: string, db: DbClient = prisma) {
  return db.platformAdminProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function setDefaultWeeklyAcademyTarget(target: number, db: DbClient = prisma) {
  const existing = await db.platformAdminWeeklyTarget.findFirst({ where: { userId: defaultWeeklyTargetUserId } });
  if (existing) {
    return db.platformAdminWeeklyTarget.update({ where: { id: existing.id }, data: { targetCount: target } });
  }
  return db.platformAdminWeeklyTarget.create({ data: { userId: defaultWeeklyTargetUserId, targetCount: target } });
}

export async function setPlatformAdminWeeklyAcademyTarget(userId: string, target: number, db: DbClient = prisma) {
  return db.platformAdminWeeklyTarget.upsert({
    where: { userId },
    update: { targetCount: target },
    create: { userId, targetCount: target },
  });
}

export async function createPlatformAdminActivityExemption(
  input: {
    userId: string;
    type: PlatformAdminExemptionType;
    reason?: string | null;
    startsAt?: Date;
    endsAt?: Date | null;
    createdById?: string | null;
  },
  db: DbClient = prisma,
) {
  return db.platformAdminActivityExemption.create({
    data: {
      userId: input.userId,
      type: input.type,
      reason: input.reason ?? null,
      startsAt: input.startsAt ?? new Date(),
      endsAt: input.type === PlatformAdminExemptionType.PERMANENT ? null : input.endsAt ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

export async function getPlatformAdminActivityExemptionState(userId: string, at: Date = new Date(), db: DbClient = prisma) {
  const [permanent, active] = await Promise.all([
    db.platformAdminActivityExemption.findFirst({
      where: { userId, type: PlatformAdminExemptionType.PERMANENT, startsAt: { lte: at } },
      select: { id: true },
    }),
    db.platformAdminActivityExemption.findFirst({
      where: {
        userId,
        startsAt: { lte: at },
        OR: [{ endsAt: null }, { endsAt: { gt: at } }],
      },
      select: { id: true },
    }),
  ]);

  return { permanentExemption: Boolean(permanent), activeExemption: Boolean(active) };
}

export async function recordPlatformAdminActivityEvent(
  input: RecordPlatformAdminActivityEventInput,
  db: DbClient = prisma,
): Promise<PlatformAdminActivityEvent | null> {
  const actor = await db.user.findUnique({
    where: { id: input.actorUserId },
    select: { role: true, status: true, disabled: true },
  });
  if (!actor || actor.role !== Role.PLATFORM_ADMIN || actor.status !== UserStatus.ACTIVE || actor.disabled) return null;

  await ensurePlatformAdminProfile(input.actorUserId, db);

  const sourceType = input.sourceType ?? defaultActivitySourceType(input.action);
  const points = input.points ?? defaultActivityPoints(input.action);
  const dedupeKey = input.dedupeKey ?? platformAdminActivityDedupeKey(input.action, input.sourceEntityId);

  try {
    return await db.platformAdminActivityEvent.create({
      data: {
        actorUserId: input.actorUserId,
        actionType: input.action,
        sourceType,
        sourceId: input.sourceEntityId,
        points,
        occurredAt: input.occurredAt ?? new Date(),
        dedupeKey,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const existing = await db.platformAdminActivityEvent.findUnique({ where: { dedupeKey } });
    if (!existing) throw error;
    return existing;
  }
}

export function recordAcademyCreatedActivity(actorUserId: string, academyId: string) {
  return recordPlatformAdminActivityEvent({
    actorUserId,
    action: PlatformAdminActivityAction.ACADEMY_CREATED,
    sourceType: PlatformAdminActivitySource.ACADEMY,
    sourceEntityId: academyId,
    points: 5,
  });
}

export function recordOpenMatCreatedActivity(actorUserId: string, openMatId: string) {
  return recordPlatformAdminActivityEvent({
    actorUserId,
    action: PlatformAdminActivityAction.OPEN_MAT_CREATED,
    sourceType: PlatformAdminActivitySource.OPEN_MAT,
    sourceEntityId: openMatId,
    points: 1,
  });
}

export function recordAcademyAdminActivatedActivity(actorUserId: string, academyAdminUserId: string) {
  return recordPlatformAdminActivityEvent({
    actorUserId,
    action: PlatformAdminActivityAction.ACADEMY_ADMIN_ACTIVATED,
    sourceType: PlatformAdminActivitySource.ACADEMY_ADMIN,
    sourceEntityId: academyAdminUserId,
    points: 1,
  });
}

function firstFullWeekStart(assignedAt: Date) {
  const week = getUtcIsoWeek(assignedAt);
  const nextWeekStart = new Date(week.startsAt);
  nextWeekStart.setUTCDate(week.startsAt.getUTCDate() + 7);
  return nextWeekStart;
}

function suggestedNextAction(remainingAcademiesToTarget: number, openMatsCreated: number, academyAdminsActivated: number) {
  if (remainingAcademiesToTarget > 0) {
    return `Add ${remainingAcademiesToTarget === 1 ? "1 academy" : `${remainingAcademiesToTarget} academies`} to complete this week's contribution goal.`;
  }
  if (openMatsCreated === 0) return "Create an Open Mat for a recently added Academy.";
  if (academyAdminsActivated === 0) return "Review Academy Admin activation opportunities.";
  return "Review claims, add open mats, or verify listing freshness to keep platform data moving.";
}

export async function getPlatformAdminActivitySummary(
  actorUserId: string,
  at: Date = new Date(),
  db: DbClient = prisma,
): Promise<PlatformAdminActivitySummary | null> {
  const user = await db.user.findUnique({
    where: { id: actorUserId },
    select: {
      role: true,
      status: true,
      disabled: true,
      createdAt: true,
      platformAdminProfile: { select: { createdAt: true } },
    },
  });
  if (!user || user.role !== Role.PLATFORM_ADMIN || user.status !== UserStatus.ACTIVE || user.disabled) return null;

  const week = getUtcIsoWeek(at);
  const [target, defaultTarget, weeklyEvents, weeklyPoints, totalPoints, exemptions] = await Promise.all([
    db.platformAdminWeeklyTarget.findUnique({ where: { userId: actorUserId } }),
    db.platformAdminWeeklyTarget.findFirst({ where: { userId: defaultWeeklyTargetUserId } }),
    db.platformAdminActivityEvent.groupBy({
      by: ["actionType"],
      where: { actorUserId, occurredAt: { gte: week.startsAt, lt: week.endsAt } },
      _count: { _all: true },
    }),
    db.platformAdminActivityEvent.aggregate({
      where: { actorUserId, occurredAt: { gte: week.startsAt, lt: week.endsAt } },
      _sum: { points: true },
    }),
    db.platformAdminActivityEvent.aggregate({ where: { actorUserId }, _sum: { points: true } }),
    getPlatformAdminActivityExemptionState(actorUserId, at, db),
  ]);

  const actionCounts = new Map(weeklyEvents.map((event) => [event.actionType, event._count._all]));
  const academiesCreated = actionCounts.get(PlatformAdminActivityAction.ACADEMY_CREATED) ?? 0;
  const openMatsCreated = actionCounts.get(PlatformAdminActivityAction.OPEN_MAT_CREATED) ?? 0;
  const academyAdminsActivated = actionCounts.get(PlatformAdminActivityAction.ACADEMY_ADMIN_ACTIVATED) ?? 0;
  const weeklyAcademyTarget = target?.targetCount ?? defaultTarget?.targetCount ?? defaultWeeklyAcademyTarget;
  const remainingAcademiesToTarget = Math.max(weeklyAcademyTarget - academiesCreated, 0);
  const qualifyingContributionCount = academiesCreated + openMatsCreated + academyAdminsActivated;
  const activityExempt = exemptions.permanentExemption || exemptions.activeExemption;
  const assignedAt = user.platformAdminProfile?.createdAt ?? user.createdAt;
  const hasCompletedFirstFullWeek = week.startsAt >= firstFullWeekStart(assignedAt);

  return {
    weekStart: week.startsAt,
    weekEnd: week.endsAt,
    weeklyAcademyTarget,
    academiesCreated,
    openMatsCreated,
    academyAdminsActivated,
    pointsEarnedThisWeek: weeklyPoints._sum.points ?? 0,
    totalPoints: totalPoints._sum.points ?? 0,
    remainingAcademiesToTarget,
    targetComplete: academiesCreated >= weeklyAcademyTarget,
    qualifyingContributionCount,
    activityExempt,
    showLowMomentumNudge: qualifyingContributionCount === 0 && !activityExempt && hasCompletedFirstFullWeek,
    suggestedNextAction: suggestedNextAction(remainingAcademiesToTarget, openMatsCreated, academyAdminsActivated),
  };
}
