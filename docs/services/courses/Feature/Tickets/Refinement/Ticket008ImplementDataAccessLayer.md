# COURSES-SVC-008 Implement Data Access Layer

## Goal

Implement Go data access around SQL functions and procedures.

## Scope

* Database connection and context helpers.
* Typed models for course types, courses, activities, schedules, sessions, and outbox events.
* Procedure callers for writes.
* Function callers for reads.
* Row mappers.
* Error mapping from SQL/domain errors into API errors.

## Acceptance Criteria

* No handler contains direct persistence logic.
* All writes call stored procedures.
* All stable reads call SQL functions.
* Tests cover mapping, null handling, time handling, and SQL error handling.
* The data layer follows users/payments naming and package conventions where practical.
