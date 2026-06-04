# PRD: Standard User Permissions - IF / WHEN / THEN Acceptance Criteria

## Feature Branch

`feature/standard_user_dashboard_roles`



## User Login and Profile Visibility (USER DASHBOARD UI requirements)

### Scenario: Standard User Login

IF a valid Standard User account exists

WHEN the user enters a valid username and password and submits the login form

THEN the system SHALL authenticate the user and redirect them to the Standard User Dashboard.

AND the dashboard SHALL display:

* User full name
* User profile avatar (if available)
* Registration date
* Academy name
* User role

AND the dashboard SHALL display a list of rolls belonging only to the user's academy.

AND the rolls SHALL be ordered by most recent creation date first.

---

## Academy Data Isolation

### Scenario: Academy Visibility Restriction

IF a user has the role "Standard User"

WHEN the dashboard loads

THEN the system SHALL only return academy data associated with the user's academy.

AND the system SHALL NOT return academy records belonging to any other academy

AND academy management pages SHALL NOT be visible in the navigation menu.

AND academy administration actions SHALL NOT be available.

---

## Member Directory Access

### Scenario: View Academy Members

IF a user has the role "Standard User"

WHEN the user opens the Members page

THEN the system SHALL display only members belonging to the same academy as the authenticated user.

AND members from other academies SHALL NOT be visible.

---

## Member Search

### Scenario: Search Academy Members

IF a user has the role "Standard User"

WHEN the user searches for another member

THEN the system SHALL automatically apply the authenticated user's academy filter.

AND search results SHALL only contain members from the same academy.

AND members belonging to other academies SHALL NEVER be returned regardless of search term.

---

## API Security Enforcement

### Scenario: Direct API Access Attempt

IF a Standard User attempts to access academy records belonging to another academy through a direct API request

WHEN the request is received

THEN the backend SHALL reject the request.

AND the API SHALL return HTTP 403 Forbidden.

AND no data belonging to another academy SHALL be returned.

---

## Navigation Restrictions

### Scenario: Restricted Menu Access

IF a user has the role "Standard User"

WHEN navigation menus are rendered

THEN the following menu items SHALL NOT be displayed:

* Academy Management
* User Administration
* Platform Administration
* Role Management
* Academy Creation
* Academy Deletion

AND only features explicitly granted to Standard Users SHALL be displayed.

---

## Permission Escalation Prevention

### Scenario: Attempt To Access Admin Pages

IF a Standard User manually enters the URL of an admin page

WHEN the request is processed

THEN access SHALL be denied.

AND the user SHALL be return to the website home page as a guest user.

AND the backend SHALL enforce the same restriction regardless of frontend behavior.

---

## Roll Visibility

### Scenario: View Rolls

IF a user has the role "Standard User"

WHEN rolls are displayed

THEN only rolls belonging to the user's academy SHALL be returned.

AND rolls from other academies SHALL NOT be visible.

AND results SHALL be sorted by newest first.


Acceptable Criteria
 
 Only make changes that has directly effects on this requirements.
 Maintaining backward compatibility with existing functionality.
