# Ticket: RF-COURSE-006 Admin Course Management

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Full Stack / Admin Product

Primary agent: Human or AI full-stack agent

Depends on: RF-COURSE-003, RF-COURSE-005

Status: Ready For Review

---

# Objective

Allow admins to create and manage Courses across all supported Course Types.

---

# Requirement

IF an Academy Admin manages training opportunities

WHEN they use the new Course admin surface

THEN they SHALL only create and manage Courses for their assigned academy.

---

# Acceptance Criteria

* New `/admin/courses` route or dashboard Course panel lists all Course Types.
* Create/edit supports:
  * Course Name,
  * Course Type,
  * Description,
  * Date,
  * Start Time,
  * End Time or Duration,
  * Location or academy-location fallback,
  * Price,
  * Price Audience,
  * Capacity,
  * Active state,
  * Recurrence.
* Optional fields are supported when approved:
  * Instructor,
  * Contact Email,
  * Contact Phone.
* Academy Admins cannot assign another academy.
* Platform Admin and Super Admin behavior follows existing permissions.
* Duplicate detection is scoped by academy, display name/title, date/occurrence, start time, and Course Type.
* Admin list shows Course display name, Course Type, date/recurrence, status, and location.
* Historical Courses remain accessible where Open Mat history is currently retained.

---

# Out Of Scope

* Public `/courses` discovery.
* Course booking or payments.
