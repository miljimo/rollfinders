INSERT INTO "academy_members" ("id", "academy_id", "user_id", "role", "created_at", "updated_at")
SELECT
  'seed_academy_admin_brixton',
  academy."id",
  service_user."id",
  'ADMIN'::"AcademyMemberRole",
  now(),
  now()
FROM "academies" academy
JOIN "users"."users" service_user
  ON true
JOIN "users"."credentials" service_credential
  ON service_credential."user_id" = service_user."id"
 AND service_credential."credential_type" = 'EMAIL_PASSWORD'
 AND lower(service_credential."credential_identifier") = 'academy@rollfinder.com'
WHERE academy."slug" = 'brixton-jiu-jitsu'
ON CONFLICT ("academy_id", "user_id") DO UPDATE
SET
  "role" = EXCLUDED."role",
  "updated_at" = now();
