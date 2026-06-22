DROP VIEW IF EXISTS "academy_member_profiles";

ALTER TABLE "academy_members" DROP COLUMN IF EXISTS "role";

DROP TYPE IF EXISTS "AcademyMemberRole";
