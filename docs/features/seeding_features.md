# Feature.md

# Feature: CSV-Based Data Seeding Framework

## Feature ID

RF-008

## Priority

High

## Type

Platform Foundation

---

# Objective

Implement a generic CSV-based database seeding framework.

All platform seed data must be loaded from CSV files rather than being hardcoded inside application code.

This allows:

* Easy data maintenance
* Easy bulk imports
* AI-generated datasets
* Non-developer data updates
* Simplified onboarding of new academies and open mats

---

# Business Requirement

The platform must support loading initial data entirely from CSV files.

Examples:

* Academies
* Open Mats
* Boroughs
* Gi Types
* Users
* Platform Configuration

The seeding framework must automatically map CSV columns to database fields.

---

# Design Principles

The system must:

* Be data-driven
* Be idempotent
* Support updates
* Support new fields
* Minimize code changes

The goal is:

> Adding a new database field should only require updating the CSV file and mapping configuration.

---

# Seed Directory Structure

```text
seed/
│
├── academies.csv
├── open_mats.csv
├── boroughs.csv
├── users.csv
├── gi_types.csv
│
└── config/
    ├── academy.mapping.json
    ├── openmat.mapping.json
    └── user.mapping.json
```

---

# Seed Execution

Command:

```bash
npm run seed
```

or

```bash
npm run db:seed
```

Execution Order:

```text
1. Boroughs
2. Gi Types
3. Users
4. Academies
5. Open Mats
```

---

# CSV Requirements

CSV files must include headers.

Example:

## academies.csv

```csv
name,address,postcode,borough,latitude,longitude,website,drop_in_cost
Roger Gracie Academy,1 London Road,SE1,Southwark,51.501,-0.100,www.example.com,20
```

---

## open_mats.csv

```csv
academy_name,title,start_time,end_time,gi_type,drop_in_cost
Roger Gracie Academy,Saturday Open Mat,2026-01-01 10:00,2026-01-01 12:00,GI,10
```

---

## users.csv

```csv
email,role,status,is_protected
admin@rollfinder.local,SUPER_ADMIN,ACTIVE,true
```

---

# Generic Mapping Framework

The seed framework must use configurable mappings.

Example:

## academy.mapping.json

```json
{
  "name": "name",
  "address": "address",
  "postcode": "postcode",
  "latitude": "latitude",
  "longitude": "longitude"
}
```

This prevents hardcoded column names inside the seed engine.

---

# Import Behaviour

For every row:

```text
If record exists:
    Update

If record does not exist:
    Create
```

This allows repeatable seed execution.

---

# Idempotency Requirement

The seed process must be safe to execute multiple times.

Example:

```bash
npm run seed
npm run seed
npm run seed
```

Result:

```text
No duplicate records created.
```

---

# Super Admin Seeding

The seed framework must create:

```text
admin@rollfinder.local
```

Role:

```text
SUPER_ADMIN
```

Status:

```text
ACTIVE
```

Protected:

```text
TRUE
```

If the user already exists:

```text
Update role
Update status
Update protection flag
```

---

# Future Field Support

The framework must support schema evolution.

Example:

Database field added:

```text
competition_focused
```

Required changes:

### Update CSV

```csv
competition_focused
true
```

### Update Mapping

```json
{
  "competition_focused": "competition_focused"
}
```

No seed code changes required.

---

# Validation

Before importing:

Validate:

* Required columns exist
* Data types are valid
* Foreign key references exist

Examples:

```text
Academy Exists

Valid Gi Type

Valid Borough
```

---

# Error Handling

Invalid rows must:

* Be logged
* Be skipped
* Not stop the entire import

Generate:

```text
seed-errors.csv
```

Example:

```text
Row 25
Invalid Postcode
```

---

# AI Agent Implementation Requirements

Implementation should:

* Use a generic CSV parser.
* Support dynamic column mapping.
* Support create-or-update operations.
* Support future entities without major code changes.
* Avoid hardcoded seed logic.

Recommended Design:

```text
Seed Engine
    │
    ├── CSV Loader
    ├── Mapping Loader
    ├── Validator
    ├── Upsert Service
    └── Error Reporter
```

---

# Acceptance Criteria

Feature is complete when:

* Academies can be loaded from CSV
* Open Mats can be loaded from CSV
* Users can be loaded from CSV
* Super Admin can be seeded from CSV
* Re-running seed does not create duplicates
* New fields can be added without changing seed engine code
* Invalid rows are reported
* Import results are logged

Feature Status:

MVP APPROVED
PLATFORM FOUNDATION FEATURE
