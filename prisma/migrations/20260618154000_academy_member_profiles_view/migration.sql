CREATE OR REPLACE VIEW "academy_member_profiles" AS
SELECT
  academy_members."id",
  academy_members."academy_id",
  academies."name" AS "academy_name",
  academy_members."user_id",
  users."email" AS "user_email",
  users."name" AS "user_name",
  users."role" AS "user_role",
  academy_members."role" AS "member_role",
  academy_members."created_at",
  academy_members."updated_at"
FROM "academy_members" academy_members
LEFT JOIN "users" users ON users."id" = academy_members."user_id"
LEFT JOIN "academies" academies ON academies."id" = academy_members."academy_id";
