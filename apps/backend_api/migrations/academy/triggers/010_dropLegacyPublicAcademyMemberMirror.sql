DROP TRIGGER IF EXISTS rollfinders_mirror_academy_member ON academy.academy_members;
DROP TRIGGER IF EXISTS rollfinders_remove_mirrored_academy_member ON academy.academy_members;
DROP FUNCTION IF EXISTS academy."rollfindersMirrorAcademyMember"();
DROP FUNCTION IF EXISTS academy."rollfindersRemoveMirroredAcademyMember"();
