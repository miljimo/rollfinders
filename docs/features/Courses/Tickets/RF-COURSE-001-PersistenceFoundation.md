# Ticket: RF-COURSE-001 Persistence Foundation

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Backend / Database / Architecture

Primary agent: Human or AI backend agent

Depends on: None

Status: Ready For Review

---

# Objective

Introduce Course persistence semantics without breaking existing Open Mat data, URLs, analytics, or foreign keys.

---

# Requirement

IF the platform stores training opportunities in the existing `events` table

WHEN Course support is introduced

THEN the migration SHALL add Course Type and Course-facing fields without changing existing event IDs, foreign keys, or the physical table name.

---

# Implementation Notes

Use the additive compatibility-first strategy:

* Keep the `events` table.
* Keep existing event IDs.
* Add `CourseType`.
* Default existing rows to `OPEN_MAT`.
* Reuse `title` as the stored display name in the first pass unless a later approved migration renames it.
* Add nullable Course-facing fields only where needed.

Recommended initial data shape:

```text
courseType CourseType @default(OPEN_MAT)
instructor String?
contactEmail String?
contactPhone String?
locationName String?
addressOverride String?
```

Course Type enum:

```text
OPEN_MAT
TRAINING
SPARRING
SEMINAR
WORKSHOP
COMPETITION
PRIVATE_LESSON
```

---

# Acceptance Criteria

* Existing rows default to `OPEN_MAT`.
* Existing `/open-mats/[id]` IDs still resolve after migration.
* Existing analytics foreign keys remain valid.
* Existing Open Mat recurrence fields remain valid.
* Migration includes verification SQL or documented verification commands for:
  * total row count before/after,
  * all existing rows assigned `OPEN_MAT`,
  * no unexpected nulls in required existing Open Mat fields.
* Prisma Client generation passes.
* Typecheck passes.

---

# Out Of Scope

* Renaming `events` to `courses`.
* Changing existing event IDs.
* Removing Open Mat routes.
* Removing Open Mat analytics.
