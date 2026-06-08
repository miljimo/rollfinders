# Ticket: Academy Profile Analytics UI

Status: Done

## Branch

```text
feature/academy-profile-analytics-ui
```

## Source Review

Current code reviewed:

* `src/app/admin/academies/[id]/page.tsx`
* `src/app/dashboard/AdminDashboardWorkspace.tsx`
* `src/lib/academy-access.ts`
* `src/lib/admin.ts`
* `prisma/schema.prisma`

## Objective

Display academy information and academy statistics on the academy profile page.

Existing functionality MUST NOT break.

The profile summary page SHALL be visible from the authenticated dashboard for:

* Academy Admins, scoped to their own academy only.
* Platform Admins, for every academy they can manage.
* Super Admins, for every academy.

The statistics card SHALL only be visible to:

* Platform Admins.
* Super Admins.

Academy Admins SHALL be able to view the academy summary, public profile link, and permitted academy actions, but SHALL NOT see the academy statistics card.

Standard Users SHALL NOT see this admin analytics/profile summary entry point.

---

# Layout

Desktop:

```text
+----------------------+------------------+
| Summary              | Statistics       | Platform Admin / Super Admin only
+----------------------+------------------+
```

Academy Admin desktop:

```text
+-----------------------------------------+
| Summary                                 |
+-----------------------------------------+
```

Mobile:

```text
Summary
Statistics                               Platform Admin / Super Admin only
```

Statistics card SHALL remain visible above the fold on desktop for roles permitted to view it.

---

# Summary Card

Title:

```text
Summary
```

Fields:

| Field       | Source              |
| ----------- | ------------------- |
| Description | academy.description |
| Website     | academy.website     |
| Phone       | academy.phone       |
| Email       | academy.email       |
| Categories  | academy.categories  |

Rules:

* Website clickable
* Phone clickable (`tel:`)
* Email clickable (`mailto:`)
* Categories comma separated

Fallbacks:

```text
Not listed
Not categorised
```

---

# Statistics Card

Title:

```text
Statistics
```

Fields:

| Field          | Source                  |
| -------------- | ----------------------- |
| Profile Views  | analytics_events count where `eventName = academy_profile_viewed` and `academyId = academy.id` |
| Enquiries      | academy.enquiries_count |
| Reviews        | academy.review_count    |
| Average Rating | academy.average_rating  |
| Open Mats      | academy.open_mat_count  |
| Admins         | academy.admin_count     |

Fallback:

```text
0
Not rated
```

---

# Analytics

Track page load:

```text
academy_profile_viewed
```

Track website click:

```text
commercial_intent_clicked
metadata.actionType = website
```

Track phone click:

```text
commercial_intent_clicked
metadata.actionType = phone
```

Track email click:

```text
commercial_intent_clicked
metadata.actionType = email
```

Analytics failures MUST NOT affect page behaviour.

---

# Permissions

ACADEMY_ADMIN:

```text
Own academy only
Summary visible
Statistics hidden
```

PLATFORM_ADMIN:

```text
All academies
Summary visible
Statistics visible
```

SUPER_ADMIN:

```text
All academies
Summary visible
Statistics visible
```

Existing permission logic MUST remain unchanged.

Implementation note:

The current permission boundary is `requireAcademyEditor(id)` in `src/app/admin/academies/[id]/page.tsx`, backed by `getAcademyAccess`.

The dashboard entry point SHALL use this existing boundary instead of creating a new role check.

---

# Dashboard Visibility

IF an Academy Admin logs in

WHEN `/dashboard` renders

THEN the Quick Actions panel SHALL include an `Academy Profile Summary` action that links to that admin's assigned academy profile summary.

IF a Platform Admin or Super Admin logs in

WHEN `/dashboard?panel=academies` renders

THEN each academy row action menu SHALL include a `Profile Summary` action.

IF a Standard User logs in

WHEN `/dashboard` renders

THEN the user SHALL NOT see the admin academy profile summary action.

---

# Component Structure

```text
components/
└── AcademyProfileSummary/
    ├── index.tsx
    ├── SummaryCard.tsx
    ├── StatisticsCard.tsx
    ├── AcademyContactInfo.tsx
    └── AcademyStatistics.tsx
```

---

# Acceptance Criteria

IF academy profile loads

THEN summary card displays academy information.

AND statistics card displays academy statistics.

AND missing values display fallback values.

AND analytics events are recorded.

AND existing academy profile functionality remains unchanged.

AND responsive layout works on mobile and desktop.

AND Academy Admins can reach their own academy summary from dashboard login.

AND Platform Admins and Super Admins can reach academy summaries from the academy table action menu.

AND Standard Users cannot see the admin profile summary entry point.
