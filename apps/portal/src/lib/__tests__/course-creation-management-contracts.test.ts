import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function readSource(path: string) {
  const absolutePath = resolve(root, path);
  assert.equal(existsSync(absolutePath), true, `Expected ${path} to exist`);
  return readFileSync(absolutePath, "utf8");
}

function readOptionalSource(path: string) {
  const absolutePath = resolve(root, path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

function matchAny(source: string, patterns: RegExp[], message: string) {
  assert.equal(patterns.some((pattern) => pattern.test(source)), true, message);
}

function routeSource(...paths: string[]) {
  return paths.map((path) => readOptionalSource(path)).join("\n");
}

describe("CourseCreationAndManagement rollout contracts", () => {
  it("keeps RollFinders course data sourced from the courses service schema", () => {
    const schemaSource = readSource("prisma/schema.prisma");
    const compatibilitySource = readSource("apps/backend_api/migrations/courses/rollfinders/001_publicCourseCompatibilityViews.sql");
    const courseActionsSource = readSource("apps/portal/src/app/admin/courses/actions.ts");

    assert.match(schemaSource, /enum\s+CourseType\s*\{[\s\S]*OPEN_MAT[\s\S]*TRAINING[\s\S]*SPARRING[\s\S]*SEMINAR[\s\S]*WORKSHOP[\s\S]*COMPETITION[\s\S]*PRIVATE_LESSON[\s\S]*\}/);
    assert.match(schemaSource, /model\s+Event\s+\{[\s\S]*courseType\s+CourseType\s+@default\(OPEN_MAT\)[\s\S]*\}/);

    for (const field of ["instructor", "contactEmail", "contactPhone", "locationName", "addressOverride"]) {
      assert.match(schemaSource, new RegExp(`\\b${field}\\s+String\\?`));
    }

    assert.match(schemaSource, /@@map\("events"\)|model\s+Event\s+\{/);
    assert.doesNotMatch(schemaSource, /model\s+Course\s+\{/);
    assert.match(compatibilitySource, /DROP TABLE public\.events CASCADE/);
    assert.match(compatibilitySource, /DROP TABLE public\.course_activities CASCADE/);
    assert.match(compatibilitySource, /CREATE OR REPLACE VIEW public\.events AS[\s\S]*FROM courses\.courses/);
    assert.match(compatibilitySource, /CREATE OR REPLACE VIEW public\.course_activities AS[\s\S]*FROM courses\.course_activities/);
    assert.match(compatibilitySource, /INSTEAD OF INSERT ON public\.events/);
    assert.match(compatibilitySource, /CALL courses\."courseUpsert"/);
    assert.doesNotMatch(courseActionsSource, /syncRollfindersCourseToCourseService|deleteRollfindersCourseFromCourseService/);
  });

  it("validates Course submissions without weakening Open Mat validation", (t) => {
    const validatorsSource = readSource("apps/portal/src/lib/validators.ts");
    if (!/CourseType/.test(validatorsSource)) {
      t.skip("Course validators have not appeared yet.");
      return;
    }

    matchAny(validatorsSource, [/CourseType/, /courseTypeValues/, /z\.enum\(\s*CourseType\s*\)/], "validators must use the supported CourseType values");
    matchAny(validatorsSource, [/courseSchema/, /courseFormSchema/, /courseType:[\s\S]*z\.enum\(\s*(?:CourseType|courseTypeValues)\s*\)/], "Course routes need an explicit Course validator");
    assert.match(validatorsSource, /courseType:\s*z\.enum\(\s*(?:CourseType|courseTypeValues)\s*/);
    assert.match(validatorsSource, /title:\s*z\.string\(\)\.min\(/);

    for (const field of ["instructor", "contactEmail", "contactPhone", "locationName", "addressOverride"]) {
      assert.match(validatorsSource, new RegExp(`\\b${field}:`));
    }

    assert.match(validatorsSource, /eventSchema[\s\S]*courseType:[\s\S]*(?:default\(\s*CourseType\.OPEN_MAT\s*\)|default\(\s*["']OPEN_MAT["']\s*\))/);
    assert.match(validatorsSource, /allowedDescriptionUriSchemes[\s\S]*http[\s\S]*https[\s\S]*mailto[\s\S]*tel/);
    assert.match(validatorsSource, /End time must be after start time/);
    assert.match(validatorsSource, /recurrenceInterval[\s\S]*Monthly recurrence interval must be 24 months or fewer/);
  });

  it("keeps Open Mat discovery and detail routes filtered to OPEN_MAT", (t) => {
    const dataSource = readSource("apps/portal/src/lib/data.ts");
    const openMatsPageSource = readSource("apps/portal/src/app/open-mats/page.tsx");
    const openMatDetailSource = readSource("apps/portal/src/app/open-mats/[id]/page.tsx");
    if (!/courseType/.test(dataSource + openMatsPageSource + openMatDetailSource)) {
      t.skip("Course-aware Open Mat filtering has not appeared yet.");
      return;
    }

    assert.match(dataSource, /getOpenMatRadar[\s\S]*getCourseDiscovery/);
    assert.match(dataSource, /courseType:\s*filters\.courseType\s*\?\?\s*(?:CourseType\.)?OPEN_MAT/);
    matchAny(dataSource, [
      /getOpenMatOccurrence[\s\S]*courseType:\s*(?:CourseType\.)?OPEN_MAT/,
      /getOpenMatOccurrence[\s\S]*event\.courseType\s*!==\s*(?:CourseType\.)?OPEN_MAT[\s\S]*return\s+null/,
      /getOpenMatOccurrence[\s\S]*event\?\.courseType\s*===\s*(?:CourseType\.)?OPEN_MAT/,
    ], "Open Mat detail lookup must exclude non-OPEN_MAT Courses");
    assert.match(dataSource, /getCourseOccurrence/);
    assert.match(openMatsPageSource, /getOpenMatRadar/);
    assert.match(openMatsPageSource, /courseType/);
    assert.match(openMatsPageSource, /const\s+pageSize\s*=\s*9/);
    assert.match(openMatsPageSource, /open_mat_search_submitted/);
    assert.match(openMatDetailSource, /open_mat_viewed/);
    assert.doesNotMatch(openMatsPageSource, /getCourses|getCourseRadar|course_search_submitted/);
  });

  it("keeps admin Open Mat routes OPEN_MAT-only and creates legacy rows as OPEN_MAT", (t) => {
    const adminListSource = readSource("apps/portal/src/app/admin/open-mats/page.tsx");
    const adminActionsSource = readSource("apps/portal/src/app/admin/open-mats/actions.ts");
    const adminEditSource = readSource("apps/portal/src/app/admin/open-mats/[id]/page.tsx");
    if (!/courseType/.test(adminListSource + adminActionsSource + adminEditSource)) {
      t.skip("Course-aware admin Open Mat routes have not appeared yet.");
      return;
    }

    for (const source of [adminListSource, adminActionsSource]) {
      assert.match(source, /courseType:\s*(?:CourseType\.)?OPEN_MAT/);
    }
    matchAny(adminEditSource, [
      /courseType:\s*(?:CourseType\.)?OPEN_MAT/,
      /event\.courseType\s*!==\s*(?:CourseType\.)?OPEN_MAT[\s\S]*notFound\(\)/,
      /event\.courseType\s*!==\s*(?:CourseType\.)?OPEN_MAT[\s\S]*redirect\(/,
    ], "Open Mat admin edit route must exclude non-OPEN_MAT Courses");

    assert.match(adminActionsSource, /create[\s\S]*courseType:\s*(?:CourseType\.)?OPEN_MAT/);
    assert.match(adminActionsSource, /open_mat_created/);
    matchAny(adminEditSource, [/redirect\(\s*["']\/admin\/open-mats["']\s*\)/, /notFound\(\)/], "non-OPEN_MAT admin edit access must be rejected or redirected");
  });

  it("adds public Course discovery and detail routes for non-OPEN_MAT Courses", (t) => {
    const coursesPageSource = routeSource("apps/portal/src/app/courses/page.tsx", "apps/portal/src/app/courses/CoursesPage.tsx");
    const courseDetailSource = routeSource("apps/portal/src/app/courses/[id]/page.tsx", "apps/portal/src/app/courses/[id]/CourseDetailPage.tsx");
    const dataSource = readSource("apps/portal/src/lib/data.ts");
    if (!coursesPageSource.trim() && !courseDetailSource.trim()) {
      t.skip("Public Course routes have not appeared yet.");
      return;
    }

    assert.notEqual(coursesPageSource.trim(), "", "Expected a public /courses route implementation");
    assert.notEqual(courseDetailSource.trim(), "", "Expected a public /courses/[id] route implementation");

    matchAny(dataSource, [/getCourseRadar/, /searchCourses/, /getCourses/], "public Course discovery should use a Course data helper");
    assert.match(dataSource, /publicCourseDiscoveryWhere[\s\S]*(?:TRAINING|SEMINAR|WORKSHOP|SPARRING|COMPETITION|PRIVATE_LESSON)/);
    assert.match(readSource("apps/portal/src/lib/courses.ts"), /listRollfindersCoursesFromCourseService[\s\S]*expandEventOccurrences/);
    assert.match(coursesPageSource, /course_search_submitted/);
    assert.match(courseDetailSource, /course_viewed/);
    assert.match(courseDetailSource, /\/open-mats\/\$\{[^}]+\.id\}|redirect\([^)]*\/open-mats\//);
  });

  it("renders academy upcoming Courses with mixed Course Type links", (t) => {
    const academyProfileSource = readSource("apps/portal/src/app/academies/[slug]/page.tsx");
    if (!/courseType|Upcoming Courses/.test(academyProfileSource)) {
      t.skip("Course-aware academy profile implementation has not appeared yet.");
      return;
    }

    assert.match(academyProfileSource, /Upcoming Courses/);
    assert.doesNotMatch(academyProfileSource, /Upcoming Open Mats/);
    assert.match(academyProfileSource, /courseType/);
    assert.match(academyProfileSource, /upcomingCoursesPageSize\s*=\s*6/);
    assert.match(academyProfileSource, /pagedCourses\.map/);
    assert.match(academyProfileSource, /coursesPage/);
    assert.match(academyProfileSource, /UpcomingCoursesPagination/);
    assert.match(academyProfileSource, /\/open-mats\/\$\{[^}]+\.id\}/);
    assert.match(academyProfileSource, /\/courses\/\$\{[^}]+\.id\}/);
  });

  it("allows Course analytics alongside legacy Open Mat analytics", (t) => {
    const eventsSource = readSource("apps/portal/src/lib/analytics/events.ts");
    const domainSource = readSource("apps/portal/src/lib/analytics/domain.ts");
    const aggregationSource = readSource("apps/portal/src/lib/analytics/aggregation.ts");
    if (!/course_/.test(eventsSource + domainSource + aggregationSource)) {
      t.skip("Course analytics implementation has not appeared yet.");
      return;
    }

    for (const eventName of ["course_created", "course_viewed", "course_search_submitted", "recurring_course_created"]) {
      assert.match(eventsSource, new RegExp(`["']${eventName}["']`));
      assert.match(aggregationSource, new RegExp(eventName));
    }

    for (const eventName of ["open_mat_created", "open_mat_viewed", "open_mat_search_submitted"]) {
      assert.match(eventsSource, new RegExp(`["']${eventName}["']`));
      assert.match(aggregationSource, new RegExp(eventName));
    }

    matchAny(domainSource, [/courseId/, /openMatId/], "analytics metadata must keep an ID field for Course/Open Mat supply");
    assert.match(domainSource, /courseType/);
    assert.doesNotMatch(domainSource, /contactEmail|contactPhone|instructor/i);
  });
});
