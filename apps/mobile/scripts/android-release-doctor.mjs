import {
  checkCommand,
  defaultTrack,
  packageName,
  requireGooglePlayEnv,
  requireReleaseSigningEnv,
} from "./android-release-utils.mjs";

const checks = [
  ["node", checkCommand("node", ["--version"])],
  ["npm", checkCommand("npm", ["--version"])],
  ["java", checkCommand("java", ["-version"])],
];

if (process.env.ANDROID_HOME) {
  console.log(`ok ANDROID_HOME: ${process.env.ANDROID_HOME}`);
} else {
  checks.push(["ANDROID_HOME", false]);
}

for (const [name, ok] of checks) {
  console.log(`${ok ? "ok" : "missing"} ${name}`);
}

const signingMissing = requireReleaseSigningEnv();
const playMissing = requireGooglePlayEnv();

if (signingMissing.length) {
  console.log(`missing release signing env: ${signingMissing.join(", ")}`);
}

if (playMissing.length) {
  console.log(`missing Google Play env: ${playMissing.join(", ")}`);
}

console.log(`Google Play package: ${packageName}`);
console.log(`Google Play track: ${defaultTrack}`);

if (checks.some(([, ok]) => !ok) || signingMissing.length || playMissing.length) {
  process.exitCode = 1;
}

