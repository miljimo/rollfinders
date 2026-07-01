import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PlatformAdminActivitySummaryPanel } from "@/components/PlatformAdminActivitySummaryPanel";
import type { PlatformAdminActivitySummary } from "@/lib/platform-admin-activity";

function summary(overrides: Partial<PlatformAdminActivitySummary> = {}): PlatformAdminActivitySummary {
  return {
    weekStart: new Date("2026-06-01T00:00:00.000Z"),
    weekEnd: new Date("2026-06-08T00:00:00.000Z"),
    weeklyAcademyTarget: 5,
    academiesCreated: 2,
    remainingAcademiesToTarget: 3,
    openMatsCreated: 4,
    academyAdminsActivated: 1,
    pointsEarnedThisWeek: 15,
    totalPoints: 80,
    targetComplete: false,
    qualifyingContributionCount: 7,
    activityExempt: false,
    suggestedNextAction: "Add an Academy in a priority borough.",
    showLowMomentumNudge: false,
    ...overrides,
  };
}

describe("PlatformAdminActivitySummaryPanel", () => {
  it("renders current-user weekly contribution progress, points, and suggested next action", () => {
    const markup = renderToStaticMarkup(<PlatformAdminActivitySummaryPanel summary={summary()} />);

    assert.match(markup, /Weekly activity summary/);
    assert.match(markup, /2 \/ 5/);
    assert.match(markup, /3 remaining/);
    assert.match(markup, /Academies added/);
    assert.match(markup, /Open Mats created/);
    assert.match(markup, /Academy Admins activated/);
    assert.match(markup, /Points this week/);
    assert.match(markup, /15/);
    assert.match(markup, /80/);
    assert.match(markup, /Add an Academy in a priority borough/);
    assert.doesNotMatch(markup, /peer platform admin/i);
    assert.doesNotMatch(markup, /@/);
  });

  it("shows the private low-momentum nudge only when requested by the summary", () => {
    const visibleMarkup = renderToStaticMarkup(
      <PlatformAdminActivitySummaryPanel
        summary={summary({
          academiesCreated: 0,
          openMatsCreated: 0,
          academyAdminsActivated: 0,
          pointsEarnedThisWeek: 0,
          remainingAcademiesToTarget: 5,
          qualifyingContributionCount: 0,
          showLowMomentumNudge: true,
        })}
      />,
    );
    const hiddenMarkup = renderToStaticMarkup(<PlatformAdminActivitySummaryPanel summary={summary({ showLowMomentumNudge: false })} />);

    assert.match(visibleMarkup, /Contribution momentum needs attention/);
    assert.match(visibleMarkup, /reviewed manually by a Super Admin/);
    assert.doesNotMatch(visibleMarkup, /automatic/i);
    assert.doesNotMatch(visibleMarkup, /probation/i);
    assert.doesNotMatch(hiddenMarkup, /Contribution momentum needs attention/);
  });
});
