# Ticket: RF-COURSE-006 Admin Course Management

Source PRD: [`CourseCreationAndManagementPrd.md`](../Products/Reviewing/CourseCreationAndManagementPrd.md)

Type: Full Stack / Admin Product

Primary agent: Human or AI full-stack agent

Depends on: RF-COURSE-003, RF-COURSE-005

Status: Ready For Review

---

# Objective

Allow admins to create and manage Courses across all supported Course Types using one shared New Course form.

Open Mat remains the default Course Type because Open Mat is the first-class RollFinders discovery experience.

---

# Requirement

IF an Academy Admin manages training opportunities

WHEN they use the new Course admin surface

THEN they SHALL only create and manage Courses for their assigned academy.

IF an authorized admin clicks the current `New Open Mat` action

WHEN the dashboard Open Mats/Sessions panel renders

THEN the action SHALL be labelled `New Course`.

IF the admin clicks `New Course`

WHEN the create dialog opens

THEN the New Course Form SHALL be shown with Course Type defaulted to `OPEN_MAT`.

IF the admin changes Course Type

WHEN the form is submitted

THEN the created Course SHALL use the selected Course Type, such as Open Mat, Class, Course, Seminar, Workshop, or Private Lesson.

IF the admin wants to describe Sparring

THEN the admin SHALL add Activity Type `SPARRING` in the Course activity plan instead of selecting Sparring as a Course Type.

---

# Acceptance Criteria

* New `/admin/courses` route or dashboard Course panel lists all Course Types.
* Dashboard create action is labelled `New Course`, not `New Open Mat`.
* Clicking `New Course` opens a dialog-based New Course Form.
* The New Course Form reuses the existing Open Mat form structure and behavior.
* Course Type defaults to `OPEN_MAT`.
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
  * Instructors,
  * Contact Email,
  * Contact Phone.
* Instructor input supports multiple repeatable instructor rows in the form.
* Each instructor row selects an existing system User rather than accepting arbitrary instructor text.
* Instructor choices are scoped to the selected academy where possible.
* Course Type selection can show/hide Course-specific optional fields without duplicating the form.
* Submitting `OPEN_MAT` preserves existing Open Mat creation behavior.
* Submitting another supported Course Type creates that selected Course Type instead of coercing it back to `OPEN_MAT`.
* Academy Admins cannot assign another academy.
* Platform Admin and Super Admin behavior follows existing permissions.
* Duplicate detection is scoped by academy, display name/title, date/occurrence, start time, and Course Type.
* Admin list shows Course display name, Course Type, date/recurrence, status, and location.
* Historical Courses remain accessible where Open Mat history is currently retained.

---

# Out Of Scope

* Public `/courses` discovery.
* Course booking or payments.
