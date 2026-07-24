import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSign } from "node:crypto";

import {
  defaultTrack,
  mobileRoot,
  outputRoot,
  packageName,
  parseReleaseArgs,
  requireGooglePlayEnv,
  requireVersionArgs,
  run,
} from "./android-release-utils.mjs";

const args = parseReleaseArgs();
const { versionCode, versionName } = requireVersionArgs(args);
const track = args.track || defaultTrack;
const releaseStatus = args.status || process.env.GOOGLE_PLAY_RELEASE_STATUS || "completed";
const artifact = resolve(outputRoot, `rollfinders-${versionName}-${versionCode}.aab`);

if (!["completed", "draft", "halted", "inProgress"].includes(releaseStatus)) {
  throw new Error("Invalid release status. Use completed, draft, halted, or inProgress.");
}

if (process.env.GOOGLE_PLAY_UPLOAD_APPROVED !== "true") {
  throw new Error("Set GOOGLE_PLAY_UPLOAD_APPROVED=true before uploading to Google Play.");
}

if (track !== "internal" && process.env.GOOGLE_PLAY_NON_INTERNAL_APPROVED !== "true") {
  throw new Error("Only the internal testing track is enabled by default. Set GOOGLE_PLAY_NON_INTERNAL_APPROVED=true to override.");
}

const playMissing = requireGooglePlayEnv();
if (playMissing.length) {
  throw new Error(`Missing Google Play env: ${playMissing.join(", ")}`);
}

run("node", ["scripts/build-android-release.mjs", "--versionCode", String(versionCode), "--versionName", versionName], {
  cwd: mobileRoot,
});

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken() {
  const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(serviceAccount.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const body = new URLSearchParams({
    assertion,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token request failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()).access_token;
}

async function googlePlay(path, options = {}) {
  const token = await accessToken();
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Google Play request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

const edit = await googlePlay("/edits", { method: "POST" });
const editId = edit.id;
const token = await accessToken();
const uploadResponse = await fetch(
  `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/bundles?uploadType=media`,
  {
    body: createReadStream(artifact),
    duplex: "half",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/octet-stream",
    },
    method: "POST",
  },
);

if (!uploadResponse.ok) {
  throw new Error(`Google Play bundle upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
}

const bundle = await uploadResponse.json();
await googlePlay(`/edits/${editId}/tracks/${track}`, {
  body: JSON.stringify({
    releases: [
      {
        name: versionName,
        status: releaseStatus,
        versionCodes: [String(bundle.versionCode ?? versionCode)],
      },
    ],
    track,
  }),
  headers: { "content-type": "application/json" },
  method: "PUT",
});

const commit = await googlePlay(`/edits/${editId}:commit`, { method: "POST" });
const resultPath = resolve(outputRoot, `rollfinders-${versionName}-${versionCode}-play-upload.json`);
writeFileSync(resultPath, `${JSON.stringify({ bundle, commit, packageName, releaseStatus, track, versionCode, versionName }, null, 2)}\n`);
console.log(`Google Play upload result: ${resultPath}`);
