UPDATE "users" app_users
SET "academy_id" = (
      SELECT academy_members."academy_id"
      FROM "academy_members" academy_members
      WHERE academy_members."user_id" = app_users."id"
      ORDER BY academy_members."created_at" ASC
      LIMIT 1
    ),
    "updated_at" = now()
WHERE app_users."academy_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "academy_members" academy_members
    WHERE academy_members."user_id" = app_users."id"
  );
