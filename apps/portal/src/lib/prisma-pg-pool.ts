import { Pool, type PoolConfig } from "pg";

function normalizeConnectionStringForPg(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode === "require") {
    url.searchParams.delete("sslmode");
  }

  return {
    connectionString: url.toString(),
    ssl: sslMode === "require" ? ({ rejectUnauthorized: false } satisfies PoolConfig["ssl"]) : undefined,
  };
}

export function createPrismaPgPool(connectionString: string) {
  return new Pool(normalizeConnectionStringForPg(connectionString));
}
