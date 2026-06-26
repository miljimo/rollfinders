# PRD: Standard Code File Format

## Objective

Define the standard RollFinders code file naming format for new and touched TypeScript, React, and PRD files.

The standard SHALL keep source files predictable, searchable, and aligned with exported symbols.

---

## Scenario: TypeScript And React File Names

IF a TypeScript or React source file is created or renamed

WHEN the file is not governed by a framework-mandated filename

THEN the file name SHALL use CamelCase or PascalCase.

AND React component files SHALL use PascalCase matching the primary exported component.

AND shared helper or action modules SHALL use CamelCase or PascalCase names that describe the exported behavior.

Examples:

```txt
DashboardActions.ts
EditProfileForm.tsx
TableMobileCards.tsx
UnifiedDashboardRouteContracts.test.ts
```

---

## Scenario: Framework-Mandated Exceptions

IF a framework requires a specific filename

WHEN the file is created or edited

THEN the required framework filename MAY be used.

Examples:

```txt
page.tsx
layout.tsx
route.ts
loading.tsx
error.tsx
not-found.tsx
middleware.ts
```

AND these exceptions SHALL be limited to files where the framework depends on the exact name.

---

## Scenario: PRD And Documentation File Names

IF a PRD or durable feature document is created

WHEN the document is named

THEN the filename SHALL use PascalCase.

AND PRD filenames SHOULD end with `Prd.md` unless the document is a shared component reference whose established local pattern omits that suffix.

Examples:

```txt
DashboardTopHeaderPanel.md
CodeFileFormatPrd.md
UnifiedDashboardRoutePrd.md
```

---

## Scenario: Existing Lowercase Files

IF an existing lowercase file is outside the current change

WHEN a feature is implemented

THEN the file SHALL NOT be renamed only for casing unless the rename is directly related to the change.

AND large casing-only migrations SHALL be handled as separate work to avoid noisy diffs and import churn.

---

## Acceptance Criteria

* New non-framework TypeScript and React files use CamelCase or PascalCase.
* New PRDs use PascalCase filenames.
* Next.js required filenames remain valid exceptions.
* Tests and imports are updated when files are renamed.
* Existing unrelated lowercase files are not renamed opportunistically.
