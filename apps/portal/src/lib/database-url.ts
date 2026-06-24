import { getEnvVariable } from "./environments";


export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(getEnvVariable("DB_USER", "postgres"));
  const password = encodeURIComponent(getEnvVariable("DB_PASSWORD","postgres"));
  const host = getEnvVariable("DB_HOST","127.0.0.1");
  const port = getEnvVariable("DB_PORT", "54322");
  const name = getEnvVariable("DB_NAME", "rollfinder");
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
