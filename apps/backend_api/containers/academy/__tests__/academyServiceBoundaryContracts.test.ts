import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const serviceRoot = path.resolve("services/academy");

const implementationDirectories = [
  "api",
  "cmd",
  "internal",
  "migrations",
  "openapi",
  "tests",
].map((directory) => path.join(serviceRoot, directory));

const ignoredPaths = new Set([
  path.join(serviceRoot, "__tests__", "academyServiceBoundaryContracts.test.ts"),
]);

const forbiddenMembershipRolePatterns = [
  /\bacademy_members\b[\s\S]{0,600}\brole\b/i,
  /\bacademy_members\b[\s\S]{0,600}\bmember_role\b/i,
  /\bacademy_members\b[\s\S]{0,600}\bowner\b/i,
  /\bacademy_members\b[\s\S]{0,600}\badmin\b/i,
  /\bacademy_members\b[\s\S]{0,600}\bcoach\b/i,
  /\bmember_role\b/i,
  /\bAcademyMemberRole\b/,
];

const forbiddenOwnershipPatterns = [
  /\bstripe[_-]?connect\b/i,
  /\bprovider_account_id\b/i,
  /\bpayment_intent\b/i,
  /\bcheckout_session\b/i,
  /\bpassword_hash\b/i,
  /\bpassword_reset\b/i,
  /\brole_assignment\b/i,
  /\buser_roles\b/i,
];

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = readdirSync(directory);
  return entries.flatMap((entry) => {
    const absolutePath = path.join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return listFiles(absolutePath);
    }

    if (ignoredPaths.has(absolutePath)) {
      return [];
    }

    return [absolutePath];
  });
}

function implementationFiles(): string[] {
  return implementationDirectories.flatMap(listFiles);
}

test("academy service implementation does not model roles on academy membership", () => {
  const offenders = implementationFiles().flatMap((filePath) => {
    const content = readFileSync(filePath, "utf8");
    return forbiddenMembershipRolePatterns
      .filter((pattern) => pattern.test(content))
      .map((pattern) => `${path.relative(serviceRoot, filePath)} matched ${pattern}`);
  });

  assert.deepEqual(offenders, []);
});

test("academy service implementation does not own users, authorisation, payments, or Stripe state", () => {
  const offenders = implementationFiles().flatMap((filePath) => {
    const content = readFileSync(filePath, "utf8");
    return forbiddenOwnershipPatterns
      .filter((pattern) => pattern.test(content))
      .map((pattern) => `${path.relative(serviceRoot, filePath)} matched ${pattern}`);
  });

  assert.deepEqual(offenders, []);
});

test("academy endpoint handlers live under internal/endpoints when implementation exists", () => {
  const internalDirectory = path.join(serviceRoot, "internal");

  if (!existsSync(internalDirectory)) {
    return;
  }

  const endpointLikeFiles = listFiles(internalDirectory).filter((filePath) => {
    const fileName = path.basename(filePath);
    const content = readFileSync(filePath, "utf8");
    return fileName.endsWith(".go") && /\bhttp\.HandlerFunc\b|\bServeHTTP\b|\bHandleFunc\b/.test(content);
  });

  const misplaced = endpointLikeFiles
    .filter((filePath) => !filePath.includes(`${path.sep}internal${path.sep}endpoints${path.sep}`))
    .map((filePath) => path.relative(serviceRoot, filePath));

  assert.deepEqual(misplaced, []);
});

