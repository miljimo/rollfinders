import type { PlatformAdminActivitySummary } from "@/lib/platform-admin-activity";

export function PlatformAdminActivitySummaryPanel({ embedded = false, summary }: { embedded?: boolean; summary: PlatformAdminActivitySummary }) {
  const goal = Math.max(summary.weeklyAcademyTarget, 0);
  const progress = goal > 0 ? Math.min(100, Math.round((summary.academiesCreated / goal) * 100)) : 100;
  const remainingLabel = summary.remainingAcademiesToTarget === 0 ? "Target reached" : `${summary.remainingAcademiesToTarget.toLocaleString()} remaining`;

  return (
    <section className={embedded ? "" : "mt-7 rounded-lg border border-teal-100 bg-white p-5 shadow-sm"} aria-labelledby="platform-admin-activity-title">
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-teal-800">Your contribution momentum</p>
              <h2 id="platform-admin-activity-title" className="mt-1 text-2xl font-black text-slate-950">Weekly activity summary</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Current-week progress for your Platform Admin contribution events.</p>
            </div>
            <div className="rounded-md bg-teal-50 px-4 py-3 text-right">
              <p className="text-xs font-black uppercase text-teal-800">Academy goal</p>
              <p className="mt-1 text-2xl font-black text-teal-950">{summary.academiesCreated.toLocaleString()} / {goal.toLocaleString()}</p>
              <p className="text-sm font-bold text-teal-800">{remainingLabel}</p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100" aria-label={`${progress}% of weekly Academy contribution goal`}>
            <div className="h-full rounded-full bg-teal-700" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActivityMetric label="Academies added" value={summary.academiesCreated} />
            <ActivityMetric label="Open Mats created" value={summary.openMatsCreated} />
            <ActivityMetric label="Academy Admins activated" value={summary.academyAdminsActivated} />
            <ActivityMetric label="Points this week" value={summary.pointsEarnedThisWeek} />
          </div>
        </div>

        <aside className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-black text-slate-950">Suggested next action</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{summary.suggestedNextAction ?? "Review priority Academy coverage or add a useful Open Mat update."}</p>
          <div className="mt-4 border-t border-stone-200 pt-4">
            <p className="text-xs font-black uppercase text-slate-500">Total points</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{summary.totalPoints.toLocaleString()}</p>
          </div>
          {summary.showLowMomentumNudge ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-black text-amber-950">Contribution momentum needs attention</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">No current-week contribution is recorded yet. Add an Academy, create an Open Mat, or review a claim to build momentum. Accounts with no recorded contribution may be reviewed manually by a Super Admin.</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function ActivityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-100 bg-stone-50 p-4">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}
