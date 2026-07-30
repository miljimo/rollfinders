Ticket: Reorganise Next.js Application into Public and Member Route Groups

Type

Technical Refactor

Priority

Medium

Suggested Branch

refactor/organise-public-member-routes

Objective

Reorganise the existing Next.js application routes into two main route groups:

(public)
(member)

The actual pages and route folders in the repository may differ from any examples provided in this ticket.

The implementation agent must inspect the current app directory, identify all existing routes, and classify each route according to whether authentication is required.

The route groups will determine whether a route is public or requires authentication.

Permissions will determine which authenticated users can access specific pages, resources, and actions.

Access must not be determined only by role names such as:

admin

academy_admin

coach

member

user

Roles may still exist, but access decisions must use the permissions assigned to the authenticated user.

Important Next.js Requirement

Use route groups with parentheses:

(public)
(member)

Do not use:

[public]
[guest]
[member]

Square brackets represent dynamic route parameters in Next.js.

Route groups must not appear in the public URL.

For example:

app/(public)/login/page.tsx

must continue to be accessible at:

/login

It must not become:

/public/login

Scope

1. Inspect the Existing Application

Review the complete existing app directory.

Identify:

Existing page routes.

Existing layouts.

Existing loading, error, and not-found files.

Existing API routes.

Existing authentication checks.

Existing permission checks.

Existing middleware.

Existing navigation configuration.

Existing shared components.

Existing route-specific components.

Existing tests related to routing and access control.

Do not assume that the application contains only the pages shown in previous examples.

Do not create placeholder pages to match an example structure.

Every existing route must be deliberately reviewed and classified.

2. Create the Route Groups

Create the following route groups:

app/
├── (public)/
└── (member)/

Public routes

Move routes that can be accessed without authentication into:

app/(public)/

Examples may include:

Landing pages.

Public academy listings.

Public academy details.

Public course listings.

Public course details.

Maps.

Login.

Registration.

Password reset.

Email verification.

Terms and conditions.

Privacy policy.

Contact pages.

These are examples only.

The implementation must classify the actual routes found in the repository.

Member routes

Move routes that require an authenticated user into:

app/(member)/

Examples may include:

Dashboard pages.

Account pages.

Profile management.

Booking management.

Payment management.

Academy management.

Course management.

Platform administration.

User management.

These are examples only.

The implementation must classify the actual routes found in the repository.

3. Do Not Move Framework-Level Files Incorrectly

Keep framework-level files in their appropriate locations.

Examples include:

app/layout.tsx
app/globals.css
app/favicon.ico
app/error.tsx
app/not-found.tsx

Only move these files when there is a clear route-group-specific reason.

Keep API routes under:

app/api/

Do not move API routes into:

app/(public)/api/

or:

app/(member)/api/

API routes must continue to perform their own authentication and permission checks.

Keep shared components outside the route groups unless a component is genuinely specific to one route group.

A suitable structure may look like:

app/
├── (public)/
│   ├── layout.tsx
│   └── <existing-public-routes>/
├── (member)/
│   ├── layout.tsx
│   └── <existing-member-routes>/
├── api/
├── components/
├── favicon.ico
├── globals.css
└── layout.tsx

The final structure must reflect the actual application.

4. Preserve Existing URLs

Moving routes into route groups must not change their existing URLs.

For example:

Before:
app/dashboard/page.tsx

After:
app/(member)/dashboard/page.tsx

The URL must remain:

/dashboard

Do not rename route folders or change URLs as part of this ticket unless required to resolve a route conflict.

Any necessary URL change must be documented and must not be made silently.

Existing links, bookmarks, redirects, and deep links must continue to work.

5. Protect the Entire Member Route Group

Create or update:

app/(member)/layout.tsx

The member layout must verify that the current request belongs to an authenticated user.

Expected behaviour:

Authenticated user
→ Allow access to the member route.

Unauthenticated user
→ Redirect to the existing login page.

Use the application's existing authentication and session implementation.

Do not:

Add a second authentication system.

Replace the existing authentication provider.

Duplicate session validation logic unnecessarily.

Rely only on client-side authentication checks.

The authentication check should run on the server wherever supported by the existing architecture.

Where the existing authentication flow supports it, preserve the originally requested route.

Example:

Requested route:
/dashboard

Redirect:
/login?returnUrl=/dashboard

The exact query parameter name must follow the existing application convention.

6. Keep Public Routes Accessible to Authenticated Users

A public route does not necessarily mean that it is accessible only to logged-out users.

Authenticated users should generally still be able to access public pages such as:

Public academy listings.

Public course listings.

Academy details.

Course details.

Maps.

Public informational pages.

Authentication pages may behave differently.

For example, an authenticated user who visits:

/login

may be redirected to an appropriate authenticated page if that is already the application's intended behaviour.

Do not block authenticated users from all routes under (public).

7. Use Permissions Instead of Hard-Coded Roles

Do not implement access checks such as:

if (user.role === "admin") {
  // allow access
}

Do not create security logic that depends only on role names.

Use the existing permission model.

Examples of permission names may include:

academy.view
academy.create
academy.update
academy.delete

course.view
course.create
course.update
course.delete

booking.view
booking.manage

payment.view
payment.refund

user.view
user.manage

platform.settings.manage

These are examples only.

Use the actual permission names already defined in the application.

If the application currently has roles but does not expose permissions consistently, create a central permission-checking abstraction that resolves the permissions assigned through those roles.

Do not redesign the complete authorisation model as part of this ticket.

8. Do Not Organise Routes by Security Role

Avoid creating top-level member folders solely based on role names.

Do not restructure the application like this:

app/(member)/
├── admin/
├── academy-admin/
├── coach/
└── user/

Instead, organise member routes by business capability or feature.

For example:

app/(member)/
├── dashboard/
├── academies/
├── courses/
├── bookings/
├── payments/
└── administration/

The exact feature folders must be based on the existing application.

A folder named admin may remain when it represents an existing platform-administration business area, but access to that folder must still be controlled by permissions rather than by checking whether the user has an admin role name.

9. Add Server-Side Permission Checks

Member authentication alone does not grant access to every member page.

Pages that require additional access must validate the appropriate permission.

Expected flow:

1. Confirm that the user is authenticated.
2. Load the user's effective permissions.
3. Check the permission required by the requested page or operation.
4. Deny access when the permission is missing.

Use the application's established unauthorised behaviour.

This may be:

A 403 Forbidden page.

notFound().

A redirect to an unauthorised page.

Another existing application convention.

Do not introduce inconsistent unauthorised behaviour without a clear reason.

Permission checks must not exist only in client components.

The server must enforce access before returning protected data or performing protected actions.

10. Apply Resource-Level Authorisation

A general permission may not be enough to access a specific resource.

For routes involving a resource identifier, validate both:

The user has the required permission.

The user has access to the requested resource.

Examples include:

/academies/:academyId/manage
/courses/:courseId/edit
/bookings/:bookingId
/payments/:paymentId
/users/:userId

For example, having:

academy.update

must not automatically allow a user to update every academy.

The application must also verify that the user is authorised for the academy identified by academyId.

A user must not gain access to another user's or another academy's resources by changing an ID in the URL.

Resource checks should use the existing ownership, membership, organisation, academy, or tenancy model.

Do not invent a new ownership model when one already exists.

11. Protect Server Actions and API Routes

Moving pages into (member) protects page access, but it does not automatically protect:

API route handlers.

Server actions.

Data mutation functions.

Background operations.

Direct service calls.

Review all API routes and server actions used by member pages.

Confirm that each protected operation performs its own:

Authentication check.

Permission check.

Resource-level access check where applicable.

Input validation.

Do not rely on the page layout as the only security boundary.

12. Update Navigation Using Permissions

Update navigation configuration where necessary.

Navigation items should be displayed according to the authenticated user's effective permissions.

Example structure:

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    permission: "dashboard.view",
  },
  {
    label: "Manage Users",
    href: "/administration/users",
    permission: "user.manage",
  },
];

Only render an item when the user has the required permission.

However, hiding a navigation item is not a security control.

The destination page, API route, server action, and resource query must still enforce authorisation.

13. Update Imports and Route References

After moving routes:

Fix broken relative imports.

Prefer existing project import aliases where available.

Update route-specific component imports.

Update layout imports.

Update navigation configuration.

Update breadcrumb configuration.

Update route metadata.

Update tests that reference old file locations.

Update route registries or route constants.

Update middleware matchers where required.

Update any code that depends on route filesystem locations.

Remove obsolete empty folders after the migration.

Do not change public URLs merely because source files have moved.

14. Handle Route Conflicts

Next.js route groups do not form part of the URL.

This means the following routes would conflict:

app/(public)/academies/page.tsx
app/(member)/academies/page.tsx

Both resolve to:

/academies

The implementation must identify and avoid duplicate URL routes across route groups.

Where both public and authenticated experiences currently use the same URL:

Keep a single page route.

Detect the authentication state inside that page or its components.

Render the appropriate actions based on permissions.

Do not create two filesystem routes resolving to the same URL.

Do not change the URL simply to avoid a conflict unless separately approved.

Implementation Rules

The implementation must follow these rules:

Inspect the current repository before moving files.

Classify actual routes rather than relying on examples.

Preserve existing URLs.

Preserve existing page behaviour.

Use route groups only for public versus authenticated organisation.

Use permissions for access within the authenticated area.

Enforce authentication and permissions on the server.

Apply resource-level authorisation where required.

Keep API routes outside the route groups.

Avoid unrelated redesigns or architecture changes.

Do not create placeholder pages.

Do not remove working features.

Do not rename existing permissions without a separate requirement.

Do not hard-code new role-based access rules.

Do not leave duplicate routes resolving to the same URL.

Out of Scope

The following work is outside the scope of this ticket:

Redesigning page user interfaces.

Renaming existing public URLs.

Replacing the authentication provider.

Rebuilding the role and permission database model.

Introducing a new identity provider.

Redesigning navigation.

Creating new business features.

Creating new public or member pages.

Changing the application branding.

Rewriting unrelated components.

Refactoring unrelated API services.

Changing existing business rules.

Migrating to a different Next.js router.

Changing the database schema unless strictly required to preserve existing permission behaviour.

Any unrelated issue discovered during implementation should be documented separately rather than included in this refactor.

Acceptance Criteria

app/(public) exists.

app/(member) exists.

All existing page routes have been reviewed and classified.

Routes that do not require authentication are placed in (public) where appropriate.

Routes that require authentication are placed in (member) where appropriate.

API routes remain under app/api.

Shared framework files remain in valid Next.js locations.

Existing public URLs remain unchanged.

There are no duplicate routes resolving to the same URL.

All routes under (member) require authentication.

Unauthenticated users are redirected through the existing login flow.

The original requested route is preserved where supported by the existing authentication implementation.

Authenticated users can still access public routes.

Access to restricted member pages is determined by permissions.

New hard-coded role checks have not been introduced.

Existing role checks affected by this refactor are replaced with permission checks where appropriate.

Restricted pages enforce permissions on the server.

Resource-specific pages validate access to the requested resource.

Changing a resource ID in the URL does not bypass authorisation.

API routes used by protected pages enforce authentication and permissions independently.

Server actions used by protected pages enforce authentication and permissions independently.

Navigation items are filtered using permissions where applicable.

Navigation visibility is not used as the only security control.

Broken imports caused by moving files are fixed.

Middleware and route matchers are updated where required.

Obsolete empty route folders are removed.

Existing functionality continues to work.

Existing tests pass.

New or updated tests cover the route-group and permission behaviour.

The application builds successfully.

TypeScript checks pass.

Linting passes.

Required Test Scenarios

Public Route Access

Given an unauthenticated user
When the user opens a public route
Then the route is accessible.

Given an authenticated user
When the user opens a public route
Then the route is accessible.

Member Route Authentication

Given an unauthenticated user
When the user opens a member route
Then the user is redirected to the existing login flow.

Given an authenticated user
When the user opens a member route that requires no additional permission
Then the route is accessible.

Permission-Restricted Route

Given an authenticated user without the required permission
When the user opens a restricted member route
Then access is denied using the application's standard unauthorised behaviour.

Given an authenticated user with the required permission
When the user opens a restricted member route
Then the route is accessible.

Resource-Level Access

Given an authenticated user with a general management permission
But the user does not have access to the requested resource
When the user changes the resource ID in the URL
Then access is denied.

Given an authenticated user with the required permission
And the user has access to the requested resource
When the user opens the resource route
Then the route is accessible.

API and Server-Action Access

Given an unauthenticated user
When the user directly calls a protected API route or server action
Then the operation is rejected.

Given an authenticated user without the required permission
When the user directly calls a protected API route or server action
Then the operation is rejected.

URL Preservation

Given an existing route before the refactor
When the route file is moved into a route group
Then its public URL remains unchanged.

Route Conflict Validation

Given the completed route structure
When the Next.js route tree is built
Then no routes in different route groups resolve to the same URL.

Implementation Deliverables

The implementation agent must provide:

The completed route-group reorganisation.

Updated authentication protection for the member route group.

Updated permission checks for affected restricted pages.

Updated resource-level checks where affected by the refactor.

Updated navigation permission filtering where required.

Updated API and server-action protection where gaps are found in affected features.

Updated tests.

A short implementation summary containing:

Routes moved into (public).

Routes moved into (member).

Routes intentionally left outside both groups.

Permission checks added or updated.

Any route conflicts discovered.

Any routes whose classification was unclear.

Any follow-up work that should be handled in separate tickets.

Definition of Done

This ticket is complete when the existing Next.js routes have been inspected and deliberately organised into public and authenticated route groups, without changing existing URLs or page behaviour.

All member routes must require authentication.

Access to restricted pages, operations, and resources must be enforced using the application's permission model rather than hard-coded role names.

The application must build successfully, pass TypeScript and lint checks, and pass all relevant automated tests.