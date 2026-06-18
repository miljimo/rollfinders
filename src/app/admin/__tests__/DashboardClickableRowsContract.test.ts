import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

function readSource(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("dashboard clickable row contracts", () => {
  it("keeps academy rows clickable to profiles while action controls stay separate", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(source, /const academyHref = adminAcademiesHref\(params, \{ dialog: "view-academy", academyId: academy\.id \}\);/);
    assert.match(source, /<TableRow key=\{academy\.id\} href=\{academyHref\}>/);
    assert.match(source, /<LinkedTableCell href=\{academyHref\} className="font-bold text-slate-950">\{academy\.name\}<\/LinkedTableCell>/);
    assert.match(source, /<ActionMenu label=\{`Open actions for \$\{academy\.name\}`\}>/);
    assert.match(source, /href=\{`\/academies\/\$\{academy\.slug\}`\}/);
    assert.match(source, /href=\{academyHref\}/);
    assert.match(source, /aria-label=\{`Select \$\{academy\.name\} for claim reminder`\}/);
  });

  it("keeps dashboard open mat and course rows and view actions in the dashboard detail dialog while edit actions stay separate", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(source, /const detailHref = `\/dashboard\?panel=open-mats&dialog=view-event&eventId=\$\{event\.id\}`;/);
    assert.match(source, /<TableRow key=\{event\.id\} href=\{detailHref\}>/);
    assert.match(source, /<LinkedTableCell href=\{detailHref\} className="font-bold text-slate-950">\{event\.title\}<\/LinkedTableCell>/);
    assert.match(source, /<ActionMenu label=\{`Open actions for \$\{event\.title\}`\}>/);
    assert.match(source, /href=\{detailHref\}/);
    assert.doesNotMatch(source, /href=\{publicHref\}/);
    assert.match(source, /href=\{adminHref\}/);
    assert.match(source, /const cloneHref = `\/dashboard\?panel=open-mats&dialog=create-course&cloneFrom=\$\{event\.id\}`;/);
    assert.match(source, /href=\{cloneHref\}/);
    assert.match(source, /View Course/);
    assert.match(source, /Edit Course/);
    assert.match(source, /Clone Course/);
    assert.doesNotMatch(source, /View \{itemLabel\}|Edit \{itemLabel\}|Clone \{itemLabel\}/);
  });

  it("routes standard dashboard course rows to the matching public detail page", () => {
    const source = readSource("src/app/dashboard/page.tsx");

    assert.match(source, /import \{ courseHref, coursePriceLabel \} from "@\/lib\/courses";/);
    assert.match(source, /function dashboardCourseHref\(course: RollRow, returnTo: string\)/);
    assert.match(source, /const href = courseHref\(course\);/);
    assert.match(source, /params\.set\("returnTo", returnTo\);/);
    assert.match(source, /courseType: true,/);
    assert.match(source, /courseType: roll\.courseType,/);
    assert.match(source, /getRowHref=\{\(row\) => dashboardCourseHref\(row, returnTo\)\}/);
    assert.doesNotMatch(source, /getRowHref=\{\(row\) => `\/open-mats\/\$\{row\.id\}`\}/);
  });

  it("opens dashboard user rows in the user detail dialog", () => {
    const source = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(source, /const userHref = `\/dashboard\?panel=users&dialog=view-user&userId=\$\{user\.id\}`;/);
    assert.match(source, /<TableRow key=\{user\.id\} href=\{userHref\}>/);
    assert.match(source, /href=\{`\/dashboard\?panel=users&dialog=edit-user&userId=\$\{user\.id\}`\}/);
  });

  it("keeps the course management table row destination and controls separate", () => {
    const source = readSource("src/app/admin/courses/page.tsx");

    assert.match(source, /const courseHref = `\/admin\/courses\/\$\{course\.id\}`;/);
    assert.match(source, /<TableRow key=\{course\.id\} href=\{courseHref\}>/);
    assert.match(source, /<LinkedTableCell href=\{courseHref\} className="font-bold text-stone-950">\{course\.title\}<\/LinkedTableCell>/);
    assert.match(source, /href="\/admin\/courses\/new"/);
    assert.match(source, /href=\{`\/admin\/courses\/new\?cloneFrom=\$\{course\.id\}`\}/);
    assert.match(source, /type="submit"/);
  });
});
