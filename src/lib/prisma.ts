import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "./database-url";
import { createPrismaPgPool } from "./prisma-pg-pool";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const connectionString = getDatabaseUrl();
const adapter = new PrismaPg(createPrismaPgPool(connectionString));

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
