import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CourseType, type Prisma } from "@prisma/client";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { TableRow } from "@/components/Table";
import { listAcademiesForActorFromAcademyService, listAcademyMembershipsForUserFromAcademyService } from "@/lib/academyService";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { selectableCourseTypeOptions } from "@/lib/course-types";
import { coursePriceLabel, courseTypeLabel, recurrenceLabel } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Course Management",
  description: "Create and manage academy courses.",
};

type SearchParams = { q?: string; courseType?: string; status?: string };

function selectedCourseType(value?: string) {
  return value && Object.values(CourseType).includes(value as CourseType) ? value as CourseType : undefined;
}

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) {
    return <PageShell><section className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-black text-stone-950">Courses</h1><Button href="/login" variant="neutral" className="mt-4">Log in</Button></section></PageShell>;
  }
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const courseType = selectedCourseType(params.courseType);
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const platformAdmin = isPlatformAdminRole(user.role);
  const availableAcademies = await listAcademiesForActorFromAcademyService(user);
  const academyMemberships = platformAdmin ? [] : await listAcademyMembershipsForUserFromAcademyService(user.id);
  const academyIds = academyMemberships.map((membership) => membership.academyId);
  const academyIdsMatchingSearch = q
    ? availableAcademies.filter((academy) => academy.name.toLowerCase().includes(q.toLowerCase())).map((academy) => academy.id)
    : [];
  const academyNameById = new Map(availableAcademies.map((academy) => [academy.id, academy.name]));
  const accessWhere: Prisma.EventWhereInput = !platformAdmin
    ? { OR: [...(academyIds.length ? [{ academyId: { in: academyIds } }] : []), { createdById: user.id }, ...(isAcademyAdminRole(user.role) && user.academyId ? [{ academyId: user.academyId }] : [])] }
    : {};
  const where: Prisma.EventWhereInput = {
    ...accessWhere,
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, ...(academyIdsMatchingSearch.length ? [{ academyId: { in: academyIdsMatchingSearch } }] : [])] } : {}),
    ...(courseType ? { courseType } : {}),
    ...(status === "active" ? { active: true } : {}),
    ...(status === "inactive" ? { active: false } : {}),
  };
  const courses = await prisma.event.findMany({ where, orderBy: [{ eventDate: "asc" }, { startTime: "asc" }], take: 100 });

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Course Management</p>
            <h1 className="mt-2 text-3xl font-black text-stone-950">Courses</h1>
            <p className="mt-2 text-stone-700">Create and manage open mats, training, seminars, workshops, and other academy opportunities.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/admin/open-mats" variant="secondary">Open Mats</Button>
            <Button href="/admin/courses/new" variant="primary">New Course</Button>
          </div>
        </div>
        <form action="/admin/courses" className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Search
            <input name="q" defaultValue={q} className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Course Type
            <select name="courseType" defaultValue={courseType ?? ""} className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="">All</option>
              {selectableCourseTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Status
            <select name="status" defaultValue={status} className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="sm:col-span-3 flex gap-2"><Button type="submit" variant="primary" size="sm">Apply</Button><Button href="/admin/courses" variant="secondary" size="sm">Reset</Button></div>
        </form>
        <div className="mt-6 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs font-bold uppercase tracking-wide text-stone-600"><tr><th className="px-4 py-3">Course</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Academy</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-stone-200">
              {courses.map((course) => {
                const courseHref = `/admin/courses/${course.id}`;

                return (
                <TableRow key={course.id} href={courseHref}>
                  <LinkedTableCell href={courseHref} className="font-bold text-stone-950">{course.title}</LinkedTableCell>
                  <LinkedTableCell href={courseHref}>{courseTypeLabel(course.courseType)}</LinkedTableCell>
                  <LinkedTableCell href={courseHref}>{academyNameById.get(course.academyId) ?? "Unknown academy"}</LinkedTableCell>
                  <LinkedTableCell href={courseHref}>{formatDate(course.eventDate)} · {course.startTime}-{course.endTime}<br /><span className="text-xs text-stone-500">{recurrenceLabel(course)}</span></LinkedTableCell>
                  <LinkedTableCell href={courseHref}>{course.active ? "Active" : "Inactive"}</LinkedTableCell>
                  <LinkedTableCell href={courseHref}>{coursePriceLabel(course)}</LinkedTableCell>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button href={`/admin/courses/new?cloneFrom=${course.id}`} size="sm" variant="secondary">Clone</Button>
                    </div>
                  </td>
                </TableRow>
                );
              })}
              {courses.length === 0 ? <tr><td className="px-4 py-6 text-stone-600" colSpan={7}>No courses match those filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}

function LinkedTableCell({ children, className }: { children: ReactNode; className?: string; href?: string }) {
  return (
    <td className={className}>
      <div className="px-4 py-3">{children}</div>
    </td>
  );
}
