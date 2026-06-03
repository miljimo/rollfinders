import "dotenv/config";
import { PrismaClient, Role, UserStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.DB_USER ?? "postgres";
  const password = process.env.DB_PASSWORD ?? "postgres";
  const host = process.env.DB_HOST ?? "127.0.0.1";
  const port = process.env.DB_PORT ?? "54322";
  const name = process.env.DB_NAME ?? "rollfinder";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

const adapter = new PrismaPg(new Pool({ connectionString: getDatabaseUrl() }));
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? "admin@rollfinder.com")
    .trim()
    .toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? process.env.DEFAULT_SUPER_ADMIN_PASSWORD ?? "admin";
  const name = process.env.SUPER_ADMIN_NAME ?? process.env.DEFAULT_SUPER_ADMIN_NAME ?? "RollFinder Admin";

  if (!email) {
    throw new Error("SUPER_ADMIN_EMAIL cannot be empty.");
  }

  if (!password) {
    throw new Error("SUPER_ADMIN_PASSWORD cannot be empty.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      disabled: false,
      isProtected: true,
    },
    create: {
      name,
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      disabled: false,
      isProtected: true,
    },
  });

  console.log(`Ensured protected super admin user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
