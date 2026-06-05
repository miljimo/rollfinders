# PRD: Platform Admin Activity Targets And Rewards

Version: 1.0

Feature area: Platform Admin

Status: Ready for development

---

# Schema Impact

Schema changes are required for this PRD unless an equivalent audited activity ledger already exists.

The implementation SHALL provide durable attribution for Platform Admin activity, weekly targets, Permanent activity exemption, and points. The exact table names may follow the codebase convention, but the deployed schema must support:

* Platform Admin weekly target assignment or a global default target setting.
* Permanent activity exemption for Platform Admins.
* Academy creator attribution or an immutable activity source that links Academy creation to the Platform Admin actor.
* A points/activity ledger with actor, source entity, action type, points value, timestamp, and duplicate-prevention key.
* Academy Admin activation attribution linking the activated Academy Admin to the responsible Platform Admin.

## Migration Requirements

IF this feature is implemented

WHEN the deployment is prepared

THEN the database migration scripts SHALL be included in the same release as the application code.

AND migrations SHALL run before enabling dashboard reads, warning calculations, target calculations, or point-awarding code.

---

## Scenario: Add Activity Attribution Schema

IF the current schema cannot identify the Platform Admin responsible for a qualifying action

WHEN the migration is written

THEN the migration SHALL add fields or tables that persist actor user id, source entity id, action type, points value, and created timestamp.

AND the migration SHALL add constraints or unique indexes that prevent duplicate awards for the same actor, action type, and source entity.

---

## Scenario: Backfill Existing Activity Safely

IF historical Academies, Open Mats, invitations, or claim approvals cannot be attributed confidently to a Platform Admin

WHEN the migration or backfill runs

THEN the system SHALL leave those historical records unattributed for points.

AND the system SHALL NOT guess a Platform Admin actor from ambiguous data.

AND the backfill SHALL be idempotent so it can be re-run without duplicating activity or points.

---

## Scenario: Deploy Without Double Awarding Points

IF the release introduces point calculation for existing source entities

WHEN the application starts after migration

THEN the system SHALL check the activity ledger or duplicate-prevention key before awarding points.

AND the system SHALL award each qualifying Academy, Open Mat source record, and Academy Admin activation at most once.

---

# Objective

Define how RollFinders tracks Platform Admin activity, weekly academy-growth targets, dashboard inactivity warnings, and internal contribution points.

Platform Admins are operational administrators. Their primary contribution is adding Academies to RollFinders and supporting operational moderation. The system should make their weekly contribution visible, encourage consistent activity, and allow Super Admins to review inactive Platform Admin accounts without exposing protected elevated-user information.

---

# Definitions

* Academy means a BJJ academy listed on RollFinders.
* Platform Admin means a user with role `PLATFORM_ADMIN`.
* Permanent means a Platform Admin is exempt from inactivity-disable warnings.
* Weekly target means the number of new Academies a Platform Admin is expected to add during the current weekly target period.
* Qualifying weekly output means at least one counted Academy, Open Mat, or activated Academy Admin contribution in the current weekly target period.
* Points are an internal RollFinders contribution score only. Points SHALL NOT imply cash value, payout, credit, or compensation in version 1.

---

# Activity Sources

## Scenario: Track Academy Created By Platform Admin

IF a Platform Admin creates a valid Academy

WHEN the Academy is saved successfully

THEN the system SHALL attribute the Academy to the Platform Admin who created it.

AND the system SHALL count the Academy toward that Platform Admin's weekly academy target.

AND the system SHALL award 5 internal points to that Platform Admin.

AND the system SHALL prevent duplicate points for the same Academy and Platform Admin.

---

## Scenario: Exclude Duplicate Or Rejected Academy Records

IF a Platform Admin attempts to create an Academy

WHEN the Academy is rejected by validation, rejected as a duplicate, or is not saved

THEN the system SHALL NOT count the Academy toward the weekly target.

AND the system SHALL NOT award points.

---

## Scenario: Track Open Mat Created By Platform Admin

IF a Platform Admin creates a valid Open Mat

WHEN the Open Mat source record is saved successfully

THEN the system SHALL award 1 internal point to that Platform Admin.

AND the system SHALL prevent duplicate points for the same Open Mat source record and Platform Admin.

---

## Scenario: Exclude Recurring Open Mat Generated Instances

IF a Platform Admin creates a recurring Open Mat

WHEN the system expands the Open Mat into weekly or monthly user-visible occurrences

THEN the system SHALL award points only for the single source Open Mat record.

AND the system SHALL NOT award points for generated recurring occurrences.

AND the system SHALL NOT create separate reward activity records for generated recurring occurrences.

---

## Scenario: Track Activated Academy Admin

IF a Platform Admin invites, creates, approves, or otherwise brings an Academy Admin into RollFinders through an authorized workflow

WHEN that Academy Admin logs in for the first time

AND the Academy Admin account is active and not disabled

THEN the system SHALL award 1 internal point to the responsible Platform Admin.

AND the system SHALL prevent duplicate points for the same Academy Admin activation and Platform Admin.

---

# Weekly Targets

## Scenario: Use Individual Weekly Target

IF a Platform Admin has an individual weekly Academy target

WHEN the system calculates weekly target progress

THEN the system SHALL use that individual target.

---

## Scenario: Use Global Default Weekly Target

IF a Platform Admin does not have an individual weekly Academy target

WHEN the system calculates weekly target progress

THEN the system SHALL use the global default weekly Academy target.

---

## Scenario: Calculate Weekly Progress

IF a Platform Admin has created valid Academies during the current weekly target period

WHEN the dashboard loads

THEN the system SHALL show the weekly Academy target, Academies added this week, remaining Academies to target, and target completion state.

AND Open Mat points and Academy Admin activation points SHALL be shown as contribution points but SHALL NOT increase the Academy target count.

---

# Inactivity And Warning

## Scenario: Show Inactivity Warning

IF a Platform Admin has no qualifying weekly output in the current weekly target period

AND the Platform Admin is not Permanent

WHEN the Platform Admin opens their dashboard

THEN the system SHALL show a warning bar on the dashboard.

AND the warning SHALL explain that the account may be disabled after Super Admin review if no activity is recorded.

AND the warning SHALL avoid implying automatic disablement.

---

## Scenario: Hide Warning For Permanent Platform Admin

IF a Platform Admin has Permanent status

WHEN the Platform Admin has no qualifying weekly output

THEN the system SHALL NOT show the inactivity-disable warning bar.

AND the Platform Admin SHALL remain visible to Super Admins as Permanent or activity-exempt.

---

## Scenario: Manual Disable Review Only

IF a Platform Admin has no qualifying weekly output

WHEN the weekly target period ends

THEN the system SHALL NOT automatically disable the Platform Admin account.

AND the system SHALL make the inactivity state visible to Super Admins for review.

AND only a Super Admin SHALL be allowed to disable the Platform Admin account.

---

# Dashboard Requirements

## Scenario: Show Platform Admin Activity Summary

IF a Platform Admin opens the dashboard

WHEN weekly activity data is available

THEN the dashboard SHALL show:

* Weekly Academy target
* Academies added this week
* Remaining Academies to target
* Open Mats created this week
* Academy Admins activated this week
* Points earned this week
* Total points where available

---

## Scenario: Protect Peer Platform Admin Information

IF a Platform Admin views their own activity dashboard

WHEN the dashboard displays targets, warnings, or points

THEN the dashboard SHALL NOT expose another Platform Admin's email, role value, last login, academy assignment, permission controls, Super Admin information, or protected elevated-user data.

---

# Data And Audit Requirements

## Scenario: Store Activity Attribution

IF an action can produce Platform Admin points or target progress

WHEN the action succeeds

THEN the system SHALL store enough attribution to identify the responsible Platform Admin, source entity, action type, points value, and timestamp.

AND attribution SHALL support audit and duplicate prevention.

---

## Scenario: Academy Attribution Requirement

IF the current Academy data model does not record who created an Academy

WHEN this feature is implemented

THEN the implementation SHALL add Academy creator attribution or an equivalent immutable activity ledger entry.

AND weekly target and points calculations SHALL NOT rely on ambiguous audit text alone.

---

# Acceptance Criteria

* Platform Admin PRDs are grouped under the Platform Admin feature area.
* Platform Admin dashboard shows weekly target progress and contribution points.
* Non-Permanent inactive Platform Admins see an inactivity warning bar.
* Permanent Platform Admins do not see inactivity-disable warnings.
* Disabling inactive Platform Admins requires Super Admin review and action.
* Academies created by a Platform Admin count toward weekly target progress and award 5 points.
* Open Mat source records created by a Platform Admin award 1 point.
* Recurring Open Mat generated occurrences do not award additional points.
* Activated Academy Admins brought in by a Platform Admin award 1 point after first login.
* Points are internal contribution scores only in version 1.
