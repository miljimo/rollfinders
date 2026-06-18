import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

const connectionString = getDatabaseUrl();
const adapter = new PrismaPg(
  new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  }),
);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? "admin@rollfinder.com")
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error("SUPER_ADMIN_EMAIL cannot be empty.");
  }

  console.log(`Super admin identity is managed by the users service: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
