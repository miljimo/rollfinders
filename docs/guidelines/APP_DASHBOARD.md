# App Dashboard Service Integration

## Purpose

This PRD defines how new services must integrate into the existing RollFinders App Dashboard.

The App Dashboard already exists.

The objective is to ensure every new service is integrated consistently without modifying or duplicating the existing dashboard implementation.

---

# Goal

Every service that supports a user interface must be accessible from the existing App Dashboard.

Examples include:

* Wallet Service
* Payment Service
* Booking Service
* Academy Service
* Analytics Service

Only users with the appropriate permissions should see the service.
Super Admin must have this privillages
---

# Existing Dashboard

The App Dashboard is an existing feature.

The AI agent MUST NOT:

* Create a new dashboard.
* Replace the existing dashboard.
* Create a second dashboard layout.
* Introduce a different dashboard design.

Instead, extend the existing implementation.

---

# Required Analysis

Before making any changes, the AI agent MUST inspect the existing frontend implementation.

The agent must identify:

* Dashboard page
* Dashboard layout
* Service card component
* Navigation components
* Sidebar integration
* Route registration
* Permission handling
* Existing UI component library
* Existing page wrapper
* Existing loading states
* Existing empty states

The implementation must follow these existing patterns.

---

# Integration Rules

Every new service must:

* Add a new  Service Card to the Dashboard.
* Integrated the service to the UI service Dashboard
* Reuse the existing layout.
* Reuse existing page wrappers.
* Reuse existing routing patterns.
* Reuse existing permission checks.

No duplicate UI components should be created.

---

# Service Visibility

A service is visible only when:

* User is authenticated.
* User has permission.
* Service is enabled.
* User role is allowed.

Users must never see services they cannot access.

---

# Route Integration

The AI agent must register routes using the existing routing conventions.

Do not introduce a new routing architecture.

---

# UI Consistency

Every service page must follow the same visual structure.

Reuse:

* Page layout
* Header
* Breadcrumbs
* Buttons
* Cards
* Tables
* Search
* Pagination
* Forms
* Dialogs
* Notifications
* Loading indicators

The user should not be able to distinguish between existing pages and newly added pages.

---

# Sidebar Integration

If the existing dashboard uses a sidebar or menu, new services must be added using the same registration mechanism.

Do not hardcode additional navigation.

---

# Component Reuse

The AI agent must search the existing codebase for reusable components before creating new ones.

Priority:

1. Existing shared components
2. Existing feature components
3. Existing hooks
4. Existing utilities

Only create new components when no reusable implementation exists.

---

# Permissions

Dashboard visibility and route access must use the existing permission framework.

Do not introduce a new authorization mechanism.

Backend authorization remains the source of truth.

---

# Acceptance Criteria

The implementation is complete when:

* The existing dashboard remains unchanged.
* New services appear using the existing UI pattern.
* Existing navigation is reused.
* Existing layouts are reused.
* Existing permissions are reused.
* No duplicate dashboard components exist.
* No existing functionality is broken.

---

# AI Agent Requirements

Before implementation, the AI agent MUST:

1. Analyse the current App Dashboard architecture.
2. Identify reusable UI components.
3. Identify the service registration mechanism.
4. Follow the existing coding style.
5. Integrate the new service into the current dashboard.
6. Avoid introducing duplicate layouts, routes, or components.
7. Ensure the new service is visually and architecturally consistent with the existing application.

If the existing implementation differs from this PRD, the AI agent must adapt to the existing architecture rather than replacing it.
