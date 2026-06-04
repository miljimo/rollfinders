# PRD: Admin Dashboard Restructure & Academy Management Enhancement

## Feature Name

Admin Dashboard Restructure and Academy Management Module

---

# Overview

The current Admin Panel displays academies in a long scrolling list, making it difficult to navigate, manage, and edit academy records as the platform grows.

This feature introduces a dedicated Academy Management area within the Admin Dashboard, providing:

* Structured dashboard navigation
* Dedicated academy management pages
* Server-side pagination
* Academy search functionality
* Filtering capabilities
* Improved editing workflows
* Dashboard metrics for academy administration

The goal is to ensure administrators can efficiently manage thousands of academies without performance or usability issues.

---

# Business Goals

1. Improve administrator productivity.
2. Support platform growth to tens of thousands of academies.
3. Reduce time required to locate and edit academy records.
4. Improve dashboard organization and maintainability.
5. Establish Academy Management as a first-class administrative module.

---

# Current Problems

## Problem 1: Infinite Scrolling List

Administrators must scroll through a large list of academies to locate records.

### Impact

* Poor user experience.
* Slow navigation.
* Difficult record management.

---

## Problem 2: No Search Capability

Administrators cannot quickly locate an academy by name.

### Impact

* Increased operational effort.
* Slower support and maintenance workflows.

---

## Problem 3: Academy Features Are Not Grouped

Academy-related functionality is mixed into the general admin area.

### Impact

* Difficult navigation.
* Poor separation of concerns.
* Reduced maintainability.

---

# Proposed Solution

Create a dedicated Academy Management section within the Admin Dashboard.

---

# Navigation Structure

## Current Structure

```text
Dashboard
├── Users
├── Academies
└── Settings
```

## New Structure

```text
Dashboard
├── Overview
├── Users
├── Academy Management
│   ├── Academies
│   ├── Verification Queue
│   ├── Featured Academies
│   └── Categories
├── Reports
└── Settings
```

---

# Academy Management

## Route

```text
/admin/academies
```

---

# Academy Listing Page

The Academy Listing page shall display academies in a paginated data table.

The filter form above the table must stay contained within its parent card at supported desktop and mobile widths. Inputs and selects must shrink within their grid cells instead of overflowing horizontally.

## Table Columns

| Column              | Description                 |
| ------------------- | --------------------------- |
| Name                | Academy name                |
| Location            | City and postcode           |
| Verification Status | Verified, Pending, Rejected |
| Featured Status     | Featured, Not Featured      |
| Created Date        | Creation timestamp          |
| Last Updated        | Last modification timestamp |
| Actions             | View, Edit, Delete          |

---

# Pagination Requirements

Pagination must be implemented server-side.

## Default Page Size

```text
20 records per page
```

## Supported Page Sizes

```text
20
50
100
```

## Pagination Controls

```text
Previous
1 2 3 4 5
Next
```

---

# Search Requirements

A search bar shall be displayed above the academy table.

## Placeholder

```text
Search academy by name...
```

## Search Behaviour

The search engine must support:

* Partial matches
* Full matches
* Case-insensitive matching

### Example

Search:

```text
camden
```

Results:

```text
Camden Grappling Academy
Camden BJJ Club
Camden MMA Centre
```

---

# Filtering Requirements

## Verification Filter

Options:

```text
All
Verified
Pending
Rejected
```

---

## Featured Filter

Options:

```text
All
Featured
Not Featured
```

---

## Location Filter

Support filtering by city and postcode.

---

# Academy Editing

## Route

```text
/admin/academies/{academyId}
```

---

## Editable Fields

Administrators must be able to edit:

* Academy Name
* Description
* Website
* Email Address
* Phone Number
* Address
* City
* Postcode
* Verification Status
* Featured Status
* Categories
* Logo
* Cover Image
* Social Media Links

---

# Academy Detail Page

The academy detail page shall include:

## Summary

* Academy information
* Verification status
* Featured status

## Statistics

* Total profile views
* Total enquiries
* Total reviews
* Average rating

## Administrative Actions

* Verify academy
* Reject academy
* Feature academy
* Unfeature academy
* Delete academy

---

# Dashboard Overview Enhancements

The main Admin Dashboard shall display academy-related metrics.

## Dashboard Cards

### Total Academies

Displays total academy count.

---

### Verified Academies

Displays verified academy count.

---

### Pending Verification

Displays academies awaiting review.

---

### Featured Academies

Displays currently featured academies.

---

# Backend Requirements

## Academy Listing Endpoint

```http
GET /api/admin/academies
```

### Query Parameters

```text
page
pageSize
search
verificationStatus
featured
city
postcode
```

### Example

```http
GET /api/admin/academies?page=1&pageSize=20&search=camden
```

### Response

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 4312,
  "totalPages": 216
}
```

---

## Academy Detail Endpoint

```http
GET /api/admin/academies/{id}
```

---

## Update Academy Endpoint

```http
PUT /api/admin/academies/{id}
```

---

## Delete Academy Endpoint

```http
DELETE /api/admin/academies/{id}
```

---

# Database Requirements

The academy listing query must:

* Use indexed searches.
* Support pagination efficiently.
* Avoid loading all records into memory.
* Support sorting.

Recommended indexes:

```sql
academy_name
verification_status
featured_status
city
postcode
created_at
updated_at
```

---

# Non-Functional Requirements

## Performance

### Listing

Response time:

```text
< 500ms
```

### Search

Response time:

```text
< 300ms
```

---

## Scalability

The system must support:

```text
100,000+ academy records
```

without degradation of the admin experience.

---

# Security Requirements

Only users with administrative permissions may:

* View academies
* Edit academies
* Delete academies
* Verify academies
* Manage featured academies

All academy management actions must be audit logged.

---

# Acceptance Criteria

* Academy functionality is moved into a dedicated Academy Management section.
* Academy listing uses server-side pagination.
* Administrators can navigate between pages of academy results.
* Administrators can search academies by name.
* Administrators can filter academies by verification status.
* Administrators can filter academies by featured status.
* Academy filters do not overlap or overflow the filter panel.
* Administrators can edit academy records directly from the listing page.
* Dashboard overview displays academy management metrics.
* API endpoints support pagination, filtering, and search.
* System remains responsive with 100,000+ academy records.
* All academy management actions are secured and audit logged.
