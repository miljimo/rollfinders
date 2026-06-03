WITH duplicate_academies AS (
  SELECT
    "id",
    first_value("id") OVER duplicate_group AS keep_id,
    row_number() OVER duplicate_group AS row_number
  FROM "academies"
  WINDOW duplicate_group AS (
    PARTITION BY lower(trim("name")), lower(trim("address")), lower(trim("postcode"))
    ORDER BY "created_at", "id"
  )
)
UPDATE "events"
SET "academy_id" = duplicate_academies.keep_id
FROM duplicate_academies
WHERE "events"."academy_id" = duplicate_academies."id"
  AND duplicate_academies.row_number > 1;

WITH duplicate_academies AS (
  SELECT
    "id",
    first_value("id") OVER duplicate_group AS keep_id,
    row_number() OVER duplicate_group AS row_number
  FROM "academies"
  WINDOW duplicate_group AS (
    PARTITION BY lower(trim("name")), lower(trim("address")), lower(trim("postcode"))
    ORDER BY "created_at", "id"
  )
)
UPDATE "claim_requests"
SET "academy_id" = duplicate_academies.keep_id
FROM duplicate_academies
WHERE "claim_requests"."academy_id" = duplicate_academies."id"
  AND duplicate_academies.row_number > 1;

WITH duplicate_academies AS (
  SELECT
    "id",
    first_value("id") OVER duplicate_group AS keep_id,
    row_number() OVER duplicate_group AS row_number
  FROM "academies"
  WINDOW duplicate_group AS (
    PARTITION BY lower(trim("name")), lower(trim("address")), lower(trim("postcode"))
    ORDER BY "created_at", "id"
  )
)
UPDATE "academy_invitations"
SET "academy_id" = duplicate_academies.keep_id
FROM duplicate_academies
WHERE "academy_invitations"."academy_id" = duplicate_academies."id"
  AND duplicate_academies.row_number > 1;

WITH duplicate_academies AS (
  SELECT
    "id",
    first_value("id") OVER duplicate_group AS keep_id,
    row_number() OVER duplicate_group AS row_number
  FROM "academies"
  WINDOW duplicate_group AS (
    PARTITION BY lower(trim("name")), lower(trim("address")), lower(trim("postcode"))
    ORDER BY "created_at", "id"
  )
),
conflicting_members AS (
  SELECT member."id"
  FROM "academy_members" member
  JOIN duplicate_academies ON member."academy_id" = duplicate_academies."id"
  WHERE duplicate_academies.row_number > 1
    AND EXISTS (
      SELECT 1
      FROM "academy_members" kept_member
      WHERE kept_member."academy_id" = duplicate_academies.keep_id
        AND kept_member."user_id" = member."user_id"
    )
)
DELETE FROM "academy_members"
WHERE "id" IN (SELECT "id" FROM conflicting_members);

WITH duplicate_academies AS (
  SELECT
    "id",
    first_value("id") OVER duplicate_group AS keep_id,
    row_number() OVER duplicate_group AS row_number
  FROM "academies"
  WINDOW duplicate_group AS (
    PARTITION BY lower(trim("name")), lower(trim("address")), lower(trim("postcode"))
    ORDER BY "created_at", "id"
  )
)
UPDATE "academy_members"
SET "academy_id" = duplicate_academies.keep_id
FROM duplicate_academies
WHERE "academy_members"."academy_id" = duplicate_academies."id"
  AND duplicate_academies.row_number > 1;

WITH duplicate_academies AS (
  SELECT
    "id",
    row_number() OVER duplicate_group AS row_number
  FROM "academies"
  WINDOW duplicate_group AS (
    PARTITION BY lower(trim("name")), lower(trim("address")), lower(trim("postcode"))
    ORDER BY "created_at", "id"
  )
)
DELETE FROM "academies"
WHERE "id" IN (
  SELECT "id"
  FROM duplicate_academies
  WHERE row_number > 1
);

WITH duplicate_events AS (
  SELECT
    "id",
    row_number() OVER duplicate_group AS row_number
  FROM "events"
  WINDOW duplicate_group AS (
    PARTITION BY "academy_id", lower(trim("title")), "event_date", "start_time"
    ORDER BY "created_at", "id"
  )
)
DELETE FROM "events"
WHERE "id" IN (
  SELECT "id"
  FROM duplicate_events
  WHERE row_number > 1
);

CREATE UNIQUE INDEX "academies_duplicate_guard_idx"
ON "academies" (lower(trim("name")), lower(trim("address")), lower(trim("postcode")));

CREATE UNIQUE INDEX "events_duplicate_guard_idx"
ON "events" ("academy_id", lower(trim("title")), "event_date", "start_time");
