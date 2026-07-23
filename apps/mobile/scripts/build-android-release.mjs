import { copyFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  androidRoot,
  ensureOutputRoot,
  mobileRoot,
  outputRoot,
  packageName,
  parseReleaseArgs,
  requireReleaseSigningEnv,
  requireVersionArgs,
  run,
} from "./android-release-utils.mjs";

const args = parseReleaseArgs();
const { versionCode, versionName } = requireVersionArgs(args);
const signingMissing = requireReleaseSigningEnv();

if (signingMissing.length) {
  throw new Error(`Missing release signing env: ${signingMissing.join(", ")}`);
}

run("npm", ["run", "sync", "--", "android"], { cwd: mobileRoot });
run("./gradlew", [`-PversionCodeOverride=${versionCode}`, `-PversionNameOverride=${versionName}`, "bundleRelease"], { cwd: androidRoot });

ensureOutputRoot();

const source = resolve(androidRoot, "app/build/outputs/bundle/release/app-release.aab");
const artifact = resolve(outputRoot, `rollfinders-${versionName}-${versionCode}.aab`);
const metadata = resolve(outputRoot, `rollfinders-${versionName}-${versionCode}.json`);

copyFileSync(source, artifact);
writeFileSync(
  metadata,
  `${JSON.stringify({ artifact, packageName, versionCode, versionName }, null, 2)}\n`,
);

console.log(`release bundle: ${artifact}`);
console.log(`release metadata: ${metadata}`);
