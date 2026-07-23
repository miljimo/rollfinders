import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const mobileRoot = resolve(scriptDir, "..");
export const repoRoot = resolve(mobileRoot, "../..");
export const androidRoot = resolve(mobileRoot, "android");
export const outputRoot = resolve(repoRoot, "bin/android");
export const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || "oepe.rollfinders";
export const defaultTrack = process.env.GOOGLE_PLAY_TRACK || "internal";

export function parseReleaseArgs(argv = process.argv.slice(2)) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    args[key] = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) index += 1;
  }

  return args;
}

export function requireVersionArgs(args) {
  const versionCode = Number(args.versionCode);
  const versionName = args.versionName;

  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    throw new Error("Missing or invalid --versionCode. Use a positive integer.");
  }

  if (!versionName || !/^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$/.test(versionName)) {
    throw new Error("Missing or invalid --versionName. Use a semantic version such as 1.0.0.");
  }

  return { versionCode, versionName };
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
}

export function checkCommand(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return result.status === 0;
}

export function requiredEnv(names) {
  return names.filter((name) => !process.env[name]);
}

export function requireReleaseSigningEnv() {
  const missing = requiredEnv(["ANDROID_KEYSTORE_PATH", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]);

  if (process.env.ANDROID_KEYSTORE_PATH && !existsSync(process.env.ANDROID_KEYSTORE_PATH)) {
    missing.push("ANDROID_KEYSTORE_PATH file");
  }

  return missing;
}

export function requireGooglePlayEnv() {
  const missing = requiredEnv(["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"]);

  if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON && !existsSync(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)) {
    missing.push("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON file");
  }

  return missing;
}

export function ensureOutputRoot() {
  mkdirSync(outputRoot, { recursive: true });
}
