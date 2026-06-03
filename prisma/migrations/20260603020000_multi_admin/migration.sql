CREATE TYPE "AcademyMemberRole" AS ENUM ('OWNER', 'ADMIN');

CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "academy_members" (
  "id" TEXT NOT NULL,
  "academy_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "AcademyMemberRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academy_invitations" (
  "id" TEXT NOT NULL,
  "academy_id" TEXT NOT NULL,
  "invited_email" TEXT NOT NULL,
  "invited_by" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academy_members_academy_id_user_id_key" ON "academy_members"("academy_id", "user_id");
CREATE INDEX "academy_members_user_id_idx" ON "academy_members"("user_id");
CREATE UNIQUE INDEX "academy_invitations_token_key" ON "academy_invitations"("token");
CREATE INDEX "academy_invitations_academy_id_idx" ON "academy_invitations"("academy_id");
CREATE INDEX "academy_invitations_invited_email_idx" ON "academy_invitations"("invited_email");

ALTER TABLE "academy_members"
ADD CONSTRAINT "academy_members_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "academy_members"
ADD CONSTRAINT "academy_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "academy_invitations"
ADD CONSTRAINT "academy_invitations_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "academy_invitations"
ADD CONSTRAINT "academy_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
