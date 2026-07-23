import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Building2, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { AcademyVerificationStatus } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { SuperAdminPlatformAcademiesPanel } from "../../dashboard/SuperAdminPlatformAcademiesPanel";
import type { StatsPanelItem } from "@/app/_components/StatsPanel";

const stats: StatsPanelItem[] = [
  {
    icon: <Building2 size={34} aria-hidden />,
    iconTone: "teal",
    id: "total",
    indicator: { label: "new this month", value: 1 },
    label: "Platform Admin-Created Academies",
    value: 2,
  },
  {
    icon: <ShieldCheck size={34} aria-hidden />,
    iconTone: "teal",
    id: "verified",
    label: "Verified",
    value: 1,
  },
  {
    icon: <CalendarDays size={34} aria-hidden />,
    iconTone: "orange",
    id: "pending",
    label: "Pending Verification",
    value: 1,
  },
  {
    icon: <Users size={34} aria-hidden />,
    iconTone: "violet",
    id: "creators",
    label: "Contributing Platform Admins",
    value: 1,
  },
];

describe("SuperAdminPlatformAcademiesPanel", () => {
  it("renders Platform Admin-created academy stats, rows, creator details, and review actions", () => {
    const markup = renderToStaticMarkup(
      <SuperAdminPlatformAcademiesPanel
        academies={[
          {
            borough: "Camden",
            city: "London",
            createdAt: new Date("2026-06-01T12:00:00.000Z"),
            createdById: "usr_platform_admin",
            id: "academy-1",
            name: "Northside Grappling",
            postcode: "NW1 1AA",
            slug: "northside-grappling",
            verificationStatus: AcademyVerificationStatus.PENDING,
          },
        ]}
        currentPage={1}
        params={{}}
        search=""
        stats={stats}
        totalItems={1}
      />,
    );

    assert.match(markup, /Academies Created By Platform Admins/);
    assert.match(markup, /Platform Admin-Created Academies/);
    assert.match(markup, /Northside Grappling/);
    assert.match(markup, /Camden, NW1 1AA/);
    assert.match(markup, /usr_platform_admin/);
    assert.match(markup, /name="platformAcademiesSearch"/);
    assert.match(markup, /Search academy, location, postcode, or Platform Admin/);
    assert.match(markup, /href="\/admin\/academies\/academy-1"/);
    assert.match(markup, /Page 1 of 1/);
  });

  it("renders an empty review surface without pagination when no Platform Admin academies exist", () => {
    const markup = renderToStaticMarkup(
      <SuperAdminPlatformAcademiesPanel academies={[]} currentPage={1} params={{}} search="" stats={stats} totalItems={0} />,
    );

    assert.match(markup, /No academies have been created by Platform Admins yet/);
    assert.doesNotMatch(markup, /Table pagination/);
  });

  it("preserves and resets the scoped Platform Admin academy search", () => {
    const markup = renderToStaticMarkup(
      <SuperAdminPlatformAcademiesPanel academies={[]} currentPage={1} params={{ platformAcademiesSearch: "camden" }} search="camden" stats={stats} totalItems={0} />,
    );

    assert.match(markup, /value="camden"/);
    assert.match(markup, /Reset/);
    assert.match(markup, /href="\/dashboard\/academy-review"/);
  });
});
