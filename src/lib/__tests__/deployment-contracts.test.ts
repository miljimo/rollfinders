import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("deployment safety contracts", () => {
  it("runs users service SQL before Prisma can remove legacy public user password hashes", () => {
    const migrate = readSource("scripts/cicd/migrate.sh");
    const command = /sh scripts\/cicd\/run-service-sql-migrations\.sh && npx prisma migrate deploy && sh scripts\/cicd\/run-service-sql-migrations\.sh/;

    assert.match(migrate, command);
  });

  it("blocks environment deploys when app, users, or payments images are missing", () => {
    const deployEnvironment = readSource("scripts/cicd/deploy-environment.sh");

    assert.match(deployEnvironment, /image\.env is missing IMAGE_URI/);
    assert.match(deployEnvironment, /USER_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /PAYMENT_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /build-go-services\.sh/);
  });

  it("promotes app, users, and payments images together", () => {
    const promotion = readSource("scripts/cicd/promotion.sh");

    assert.match(promotion, /"user_service_image_uri":\s*os\.environ\["USER_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"payment_service_image_uri":\s*os\.environ\["PAYMENT_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /echo "USER_SERVICE_IMAGE_URI=\$\{user_service_image\}"/);
    assert.match(promotion, /echo "PAYMENT_SERVICE_IMAGE_URI=\$\{payment_service_image\}"/);
  });

  it("runs migrations before rolling the ECS service to the new task definition", () => {
    const deployEnvironment = readSource("scripts/cicd/deploy-environment.sh");

    assert.ok(
      deployEnvironment.indexOf('"${SCRIPT_DIR}/migrate.sh"') < deployEnvironment.indexOf('"${SCRIPT_DIR}/deploy.sh"'),
      "deployment must migrate before updating the ECS service",
    );
  });

  it("backfills legacy public user password hashes into service credentials before marking the users schema migrated", () => {
    const coreSchema = readSource("services/users/migrations/001_core_schema.sql");
    const credentialBackfill = readSource("services/users/migrations/backfills/001_rollfinders_public_user_credentials.sql");

    assert.ok(
      coreSchema.indexOf("\\ir backfills/001_rollfinders_public_user_credentials.sql") <
        coreSchema.indexOf("\\ir backfills/002_rollfinders_public_academy_memberships.sql"),
      "credential backfill must run before academy membership backfill",
    );
    assert.match(credentialBackfill, /information_schema\.columns[\s\S]*column_name = 'password_hash'/);
    assert.match(credentialBackfill, /INSERT INTO users\.credentials/);
    assert.match(credentialBackfill, /INSERT INTO users\.credential_secrets/);
    assert.match(credentialBackfill, /pu\.password_hash/);
    assert.match(credentialBackfill, /001_rollfinders_public_user_credentials/);
  });

  it("lets one-shot migration tasks finish even before service schemas are ready", () => {
    const terraform = readSource("terraform/main.tf");

    assert.match(terraform, /name\s+=\s+"users"[\s\S]*?essential\s+=\s+false/);
    assert.match(terraform, /name\s+=\s+"payments"[\s\S]*?essential\s+=\s+false/);
  });

  it("stores application runtime configuration in SSM parameters instead of one Secrets Manager JSON blob", () => {
    const appSecretsModule = readSource("terraform/modules/app_secrets/main.tf");
    const appSecretsOutputs = readSource("terraform/modules/app_secrets/outputs.tf");
    const terraform = readSource("terraform/main.tf");

    assert.match(appSecretsModule, /resource\s+"aws_ssm_parameter"\s+"app"/);
    assert.match(appSecretsModule, /for_each\s+=\s+nonsensitive\(toset\(keys\(var\.secret_values\)\)\)/);
    assert.match(appSecretsModule, /type\s+=\s+contains\(var\.secure_value_keys,\s*each\.value\)\s*\?\s*"SecureString"\s*:\s*"String"/);
    assert.doesNotMatch(appSecretsModule, /aws_secretsmanager_secret|aws_secretsmanager_secret_version/);
    assert.match(appSecretsOutputs, /output\s+"arn_by_key"/);
    assert.match(terraform, /execution_role_secret_arns\s+=\s+\[\]/);
    assert.match(terraform, /execution_role_parameter_arns\s+=\s+concat\(/);
    assert.match(terraform, /valueFrom\s+=\s+module\.app_secrets\.arn_by_key\["DATABASE_URL"\]/);
    assert.doesNotMatch(terraform, /module\.app_secrets\.arn\}:/);
  });

  it("keeps DATABASE_URL compatible with psql and Go libpq clients", () => {
    const terraform = readSource("terraform/main.tf");

    assert.doesNotMatch(terraform, /uselibpqcompat/);
    assert.match(terraform, /DATABASE_URL\s*=\s*"postgresql:\/\/\$\{var\.db_username\}:\$\{random_password\.db\.result\}@\$\{module\.database\.address\}:5432\/\$\{var\.db_name\}\?sslmode=require"/);
  });

  it("resolves service user emails through credentials in public Prisma migrations", () => {
    const migration = readSource("prisma/migrations/20260618113000_restore_seed_academy_admin_membership/migration.sql");

    assert.match(migration, /JOIN "users"\."credentials" service_credential/);
    assert.match(migration, /service_credential\."credential_identifier"/);
    assert.doesNotMatch(migration, /service_user\."email"/);
  });

  it("allows dev deployments without a certificate output", () => {
    const deploy = readSource("scripts/cicd/deploy.sh");

    assert.match(deploy, /terraform output -raw certificate_arn 2>\/dev\/null \|\| true/);
  });

  it("configures Prisma pg pools for RDS sslmode=require", () => {
    const prisma = readSource("src/lib/prisma.ts");
    const seed = readSource("prisma/seed.ts");
    const superAdmin = readSource("prisma/ensure-super-admin.ts");
    const pool = readSource("src/lib/prisma-pg-pool.ts");
    const dockerfile = readSource("Dockerfile");

    for (const source of [prisma, seed, superAdmin]) {
      assert.match(source, /createPrismaPgPool\(connectionString\)/);
    }
    assert.match(pool, /url\.searchParams\.delete\("sslmode"\)/);
    assert.match(pool, /sslMode === "require" \? \(\{ rejectUnauthorized: false \}/);
    assert.match(dockerfile, /COPY --chown=nextjs:nodejs src\/lib\/prisma-pg-pool\.ts \.\/src\/lib\/prisma-pg-pool\.ts/);
  });
});
