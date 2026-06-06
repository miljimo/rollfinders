# PRD: Platform Admin Activity Targets And Rewards

Version: 1.1

Feature area: Platform Admin

Status: Ready for development

---

# Schema Impact

Schema changes are required for this PRD unless an equivalent audited activity ledger already exists.

The implementation SHALL provide durable attribution for Platform Admin contribution, weekly targets, Permanent activity exemption, and points. The exact table names may follow the codebase convention, but the deployed schema must support a contribution event backbone before dashboard engagement nudges, points, or reward calculations are enabled.

The deployed schema SHALL support:

* Platform Admin profile or settings records for target settings, exemption state, and contribution preferences.
* Platform Admin weekly target assignment or a global default target setting.
* Permanent and temporary activity exemption records for Platform Admins.
* Academy creator attribution or an immutable activity source that links Academy creation to the Platform Admin actor.
* A single immutable activity event ledger with actor, source entity, source type, action type, points value, occurred timestamp, created timestamp, and duplicate-prevention key.
* Academy Admin activation attribution linking the activated Academy Admin to the responsible Platform Admin.
* Optional materialized weekly summary records only if the implementation chooses not to aggregate directly from the immutable activity event ledger.

The activity event ledger SHALL be the source of truth for Platform Admin contribution points, weekly contribution progress, engagement nudges, and Super Admin activity review.

The implementation SHALL keep user role/status separate from Platform Admin activity state. The system SHALL NOT overload `role`, `status`, `disabled`, or `isProtected` to represent Permanent contribution exemption.

The weekly period SHALL be calculated in UTC using an ISO week period from Monday 00:00:00 through Sunday 23:59:59 unless a later explicit configuration requirement changes the weekly boundary.

## Migration Requirements

IF this feature is implemented

WHEN the deployment is prepared

THEN the database migration scripts SHALL be included in the same release as the application code.

AND migrations SHALL run before enabling dashboard reads, engagement nudge calculations, target calculations, or point-awarding code.

AND the release SHALL gate or safely fall back any read path that depends on contribution tables until the migrations are complete.

AND the migration order SHALL add activity profiles or exemption records before code reads Permanent exemption state.

AND the migration order SHALL add the immutable activity event ledger before any code awards points or calculates weekly progress.

AND the migration order SHALL add required source attribution before any action writes activity events.

---

## Scenario: Add Activity Attribution Schema

IF the current schema cannot identify the Platform Admin responsible for a qualifying action

WHEN the migration is written

THEN the migration SHALL add fields or tables that persist actor user id, source type, source entity id, action type, points value, occurred timestamp, created timestamp, and deterministic duplicate-prevention key.

AND the migration SHALL add a unique constraint or unique index on the duplicate-prevention key.

AND duplicate-prevention keys SHALL be deterministic for the source action, such as `academy_created:{academy_id}`, `open_mat_created:{open_mat_source_id}`, or `academy_admin_activated:{academy_admin_user_id}`.

AND the activity event ledger SHALL be immutable except for operational correction workflows that are explicitly audited by a Super Admin.

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

Define how RollFinders tracks Platform Admin contribution, weekly academy-growth targets, dashboard momentum indicators, engagement nudges, and internal contribution points.

Platform Admins are operational administrators and the backbone for getting useful data into RollFinders. Their primary contribution is adding Academies, adding Open Mats, improving listing freshness, supporting operational moderation, and helping RollFinders build strong regional coverage.

The system should make Platform Admin impact visible, encourage consistent contribution, guide admins toward the highest-value next action, and allow Super Admins to review contribution momentum without exposing protected elevated-user information.

The system SHALL frame this feature as contribution visibility and operational health. It SHALL NOT frame the feature as surveillance, compliance monitoring, punishment, probation, or automatic enforcement.

---

# Definitions

* Academy means a BJJ academy listed on RollFinders.
* Platform Admin means a user with role `PLATFORM_ADMIN`.
* Contribution event means an immutable activity ledger record for a successful qualifying Platform Admin action.
* Contribution goal means a weekly target that helps Platform Admins understand expected operational contribution.
* Engagement nudge means a private dashboard notice that suggests useful next actions when contribution momentum is low.
* Momentum indicator means a dashboard state showing current weekly contribution progress.
* Permanent means a Platform Admin is exempt from low-momentum engagement nudges and low-contribution review prompts.
* Weekly target means the number of new Academies a Platform Admin is expected to add during the current weekly target period.
* Qualifying weekly contribution means at least one counted Academy, Open Mat, or activated Academy Admin contribution event in the current weekly target period.
* Points are an internal RollFinders contribution score only. Points SHALL NOT imply cash value, payout, credit, or compensation in version 1.

---

# Activity Sources

## Scenario: Track Academy Created By Platform Admin

IF a Platform Admin creates a valid Academy

WHEN the Academy is saved successfully

THEN the system SHALL create one immutable contribution event for the Platform Admin who created it.

AND the contribution event SHALL use action type `ACADEMY_CREATED`.

AND the system SHALL count the Academy toward that Platform Admin's weekly academy target.

AND the system SHALL award 5 internal points to that Platform Admin.

AND the system SHALL prevent duplicate points for the same Academy and Platform Admin.

AND the contribution event SHALL be written only after the Academy source record is saved successfully.

---

## Scenario: Exclude Duplicate Or Rejected Academy Records

IF a Platform Admin attempts to create an Academy

WHEN the Academy is rejected by validation, rejected as a duplicate, or is not saved

THEN the system SHALL NOT count the Academy toward the weekly target.

AND the system SHALL NOT award points.

---

## Scenario: Track Open Mat Created By Platform Admin

IF a Platform Admin creates a valid Open Mat

WHEN the canonical Open Mat source record is saved successfully

THEN the system SHALL create one immutable contribution event for the Platform Admin who created it.

AND the contribution event SHALL use action type `OPEN_MAT_CREATED`.

AND the system SHALL award 1 internal point to that Platform Admin.

AND the system SHALL prevent duplicate points for the same Open Mat source record and Platform Admin.

AND the contribution event SHALL be written only after the Open Mat source record is saved successfully.

---

## Scenario: Exclude Recurring Open Mat Generated Instances

IF a Platform Admin creates a recurring Open Mat

WHEN the system expands the Open Mat into weekly or monthly user-visible occurrences

THEN the system SHALL award points only for the single source Open Mat record.

AND the system SHALL NOT award points for generated recurring occurrences.

AND the system SHALL NOT create separate reward activity records for generated recurring occurrences.

AND generated recurring occurrences SHALL NOT receive their own Platform Admin contribution event.

---

## Scenario: Track Activated Academy Admin

IF a Platform Admin invites, creates, approves, or otherwise brings an Academy Admin into RollFinders through an authorized workflow

WHEN that Academy Admin logs in for the first time

AND the Academy Admin account is active and not disabled

THEN the system SHALL award 1 internal point to the responsible Platform Admin.

AND the system SHALL prevent duplicate points for the same Academy Admin activation and Platform Admin.

AND the contribution event SHALL use action type `ACADEMY_ADMIN_ACTIVATED`.

AND subsequent logins by the same Academy Admin SHALL NOT award additional points.

---

## Scenario: Exclude Unknown Attribution

IF a qualifying source record does not have explicit Platform Admin attribution

WHEN contribution events are calculated or backfilled

THEN the system SHALL NOT create a contribution event for that source record.

AND the system SHALL NOT award points for that source record.

AND the system SHALL NOT infer attribution from ambiguous timestamps, email domains, free-text audit logs, or proximity to another action.

---

# Weekly Targets

## Scenario: Use Individual Weekly Target

IF a Platform Admin has an individual weekly Academy target

WHEN the system calculates weekly target progress

THEN the system SHALL use that individual target.

AND the target SHALL be stored separately from the user's role and status.

---

## Scenario: Use Global Default Weekly Target

IF a Platform Admin does not have an individual weekly Academy target

WHEN the system calculates weekly target progress

THEN the system SHALL use the global default weekly Academy target.

---

## Scenario: Calculate Weekly Progress

IF a Platform Admin has contribution events during the current weekly target period

WHEN the dashboard loads

THEN the system SHALL show the weekly Academy target, Academies added this week, remaining Academies to target, and target completion state.

AND Academy target progress SHALL count `ACADEMY_CREATED` contribution events only.

AND Open Mat points and Academy Admin activation points SHALL be shown as contribution points but SHALL NOT increase the Academy target count.

AND total points SHALL be calculated from the activity event ledger.

AND version 1 SHOULD aggregate weekly progress on demand from the immutable activity event ledger unless performance requires a materialized weekly summary table.

---

## Scenario: Calculate Team And Regional Impact

IF Platform Admin contribution data is available

WHEN a Super Admin opens platform activity reporting

THEN the system SHOULD show team-level operational health indicators where available.

AND team-level indicators SHOULD include academy coverage growth, Open Mat listing freshness, verified update volume, priority-region coverage progress, duplicate or rejected submission rate, and time from new lead or claim to admin review.

AND team-level reporting SHALL NOT expose protected elevated-user information to Platform Admins.

---

# Momentum Indicators And Engagement Nudges

## Scenario: Show Low Momentum Engagement Nudge

IF a Platform Admin has no qualifying weekly contribution in the current weekly target period

AND the Platform Admin is not Permanent

AND the Platform Admin is not otherwise activity-exempt

AND the Platform Admin has completed at least one full weekly period since assignment to the Platform Admin role

WHEN the Platform Admin opens their dashboard

THEN the system SHALL show a private engagement nudge on the dashboard.

AND the nudge SHALL frame the state as contribution momentum or suggested next action.

AND the nudge SHALL explain that accounts with no recorded contribution may be reviewed manually by a Super Admin.

AND the nudge SHALL avoid implying automatic disablement.

AND the nudge SHALL NOT use punitive language such as failure, penalty, compliance, probation, surveillance, low-performing, or enforcement.

AND the nudge SHOULD suggest one or more useful next actions, such as adding an Academy, adding an Open Mat, verifying a listing, resolving a duplicate, or reviewing a claim.

---

## Scenario: Hide Engagement Nudge For Permanent Platform Admin

IF a Platform Admin has Permanent status

WHEN the Platform Admin has no qualifying weekly contribution

THEN the system SHALL NOT show the low-momentum engagement nudge.

AND the Platform Admin SHALL remain visible to Super Admins as Permanent or activity-exempt.

---

## Scenario: Manual Disable Review Only

IF a Platform Admin has no qualifying weekly contribution

WHEN the weekly target period ends

THEN the system SHALL NOT automatically disable the Platform Admin account.

AND the system SHALL make the low-contribution state visible to Super Admins for review.

AND only a Super Admin SHALL be allowed to disable the Platform Admin account.

AND the Super Admin review surface SHALL distinguish active target participants, temporarily exempt Platform Admins, permanently exempt Platform Admins, and low-contribution Platform Admins under review.

---

# Dashboard Requirements

## Scenario: Show Platform Admin Activity Summary

IF a Platform Admin opens the dashboard

WHEN weekly activity data is available

THEN the dashboard SHALL show:

* Weekly Academy contribution goal
* Academies added this week
* Remaining Academies to target
* Open Mats created this week
* Academy Admins activated this week
* Points earned this week
* Total points where available
* Suggested next action where available

AND the dashboard SHOULD use contribution, impact, momentum, and operational health language.

AND the dashboard SHALL NOT use surveillance, punishment, compliance, probation, or automatic-enforcement language.

---

## Scenario: Show Contribution Quality Signals

IF quality or rejection data is available

WHEN the dashboard displays Platform Admin contribution progress

THEN the dashboard SHOULD show quality signals that discourage low-value volume.

AND quality signals MAY include verified listing rate, rejected duplicate rate, corrected stale listing count, priority-region coverage improvements, and claim review timeliness.

---

## Scenario: Protect Peer Platform Admin Information

IF a Platform Admin views their own activity dashboard

WHEN the dashboard displays targets, engagement nudges, or points

THEN the dashboard SHALL NOT expose another Platform Admin's email, role value, last login, academy assignment, permission controls, Super Admin information, or protected elevated-user data.

---

# Data And Audit Requirements

## Scenario: Store Activity Attribution

IF an action can produce Platform Admin points or target progress

WHEN the action succeeds

THEN the system SHALL store enough attribution to identify the responsible Platform Admin, source type, source entity, action type, points value, occurred timestamp, created timestamp, and duplicate-prevention key.

AND attribution SHALL support audit and duplicate prevention.

AND activity events SHALL be created only after the source action succeeds.

AND failed validation, failed duplicate checks, failed saves, and rolled-back transactions SHALL NOT create contribution events.

---

## Scenario: Academy Attribution Requirement

IF the current Academy data model does not record who created an Academy

WHEN this feature is implemented

THEN the implementation SHALL add Academy creator attribution or an equivalent immutable activity ledger entry.

AND weekly target and points calculations SHALL NOT rely on ambiguous audit text alone.

---

## Scenario: Platform Engineer Ownership

IF this feature is scheduled for implementation

WHEN the technical work is planned

THEN the platform engineer SHOULD own the activity event schema, attribution boundaries, duplicate-prevention keys, and weekly rollup calculation.

AND product or operations stakeholders SHOULD own target values, points values, engagement copy, and recognition strategy.

AND the first implementation milestone SHALL prioritize event tracking and weekly rollups before dashboard polish, rewards, or Super Admin review automation.

---

# Acceptance Criteria

* Platform Admin PRDs are grouped under the Platform Admin feature area.
* Given a Platform Admin creates one valid Academy, one `ACADEMY_CREATED` contribution event is created with 5 points and the Academy count for the current week increases by 1.
* Re-running the same Academy event creation does not create a duplicate contribution event or duplicate points.
* Given a Platform Admin creates one valid Open Mat source record, one `OPEN_MAT_CREATED` contribution event is created with 1 point.
* Given a recurring Open Mat is created, exactly one `OPEN_MAT_CREATED` contribution event is created for the source record and zero contribution events are created for generated occurrences.
* Given an attributed Academy Admin logs in for the first time while active, one `ACADEMY_ADMIN_ACTIVATED` contribution event is created with 1 point.
* Subsequent logins by the same Academy Admin do not award additional points.
* Weekly target progress counts Academies only; Open Mats and Academy Admin activations affect points and qualifying weekly contribution but do not increase Academy target count.
* Platform Admin dashboard shows weekly contribution goal progress, contribution points, and suggested next action where available.
* Non-Permanent, non-exempt Platform Admins with zero qualifying contribution events in the current full weekly period see a private low-momentum engagement nudge.
* New Platform Admins do not see a low-momentum engagement nudge until after their first full weekly period in the role.
* Permanent or activity-exempt Platform Admins do not see low-momentum engagement nudges.
* Disabling low-contribution Platform Admins requires Super Admin review and action.
* No code path automatically disables a Platform Admin for low contribution.
* Backfill creates contribution events only for source records with explicit Platform Admin attribution and can run twice without changing totals the second time.
* Dashboard queries for a Platform Admin cannot return another Platform Admin's email, role controls, academy assignment, Super Admin data, or protected elevated-user data.
* Engagement copy uses contribution, impact, momentum, and operational health language rather than punitive or surveillance language.
* Points are internal contribution scores only in version 1.
