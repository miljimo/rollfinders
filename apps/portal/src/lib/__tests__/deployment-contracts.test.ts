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

  it("blocks environment deploys when required app and service images are missing", () => {
    const deployEnvironment = readSource("scripts/cicd/deploy-environment.sh");

    assert.match(deployEnvironment, /image\.env is missing IMAGE_URI/);
    assert.match(deployEnvironment, /API_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /USER_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /AUTHORISATION_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /ACADEMY_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /ORGANISATION_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /COURSE_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /BOOKING_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /PAYMENT_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /SUBSCRIPTION_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /ACCESS_KEY_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /NOTIFICATION_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /ANALYTICS_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /WALLET_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /TRANSFER_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /PRICING_SERVICE_IMAGE_URI/);
    assert.match(deployEnvironment, /build-go-services\.sh/);
  });

  it("promotes app and service images together", () => {
    const promotion = readSource("scripts/cicd/promotion.sh");

    assert.match(promotion, /"api_service_image_uri":\s*os\.environ\["API_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"user_service_image_uri":\s*os\.environ\["USER_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"authorisation_service_image_uri":\s*os\.environ\["AUTHORISATION_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"academy_service_image_uri":\s*os\.environ\["ACADEMY_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"organisation_service_image_uri":\s*os\.environ\["ORGANISATION_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"course_service_image_uri":\s*os\.environ\["COURSE_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"booking_service_image_uri":\s*os\.environ\["BOOKING_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"payment_service_image_uri":\s*os\.environ\["PAYMENT_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"subscription_service_image_uri":\s*os\.environ\["SUBSCRIPTION_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"access_key_service_image_uri":\s*os\.environ\["ACCESS_KEY_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"notification_service_image_uri":\s*os\.environ\["NOTIFICATION_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"analytics_service_image_uri":\s*os\.environ\["ANALYTICS_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"wallet_service_image_uri":\s*os\.environ\["WALLET_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"transfer_service_image_uri":\s*os\.environ\["TRANSFER_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /"pricing_service_image_uri":\s*os\.environ\["PRICING_SERVICE_IMAGE_FOR_PROMOTION"\]/);
    assert.match(promotion, /echo "API_SERVICE_IMAGE_URI=\$\{api_service_image\}"/);
    assert.match(promotion, /echo "USER_SERVICE_IMAGE_URI=\$\{user_service_image\}"/);
    assert.match(promotion, /echo "AUTHORISATION_SERVICE_IMAGE_URI=\$\{authorisation_service_image\}"/);
    assert.match(promotion, /echo "ACADEMY_SERVICE_IMAGE_URI=\$\{academy_service_image\}"/);
    assert.match(promotion, /echo "ORGANISATION_SERVICE_IMAGE_URI=\$\{organisation_service_image\}"/);
    assert.match(promotion, /echo "COURSE_SERVICE_IMAGE_URI=\$\{course_service_image\}"/);
    assert.match(promotion, /echo "BOOKING_SERVICE_IMAGE_URI=\$\{booking_service_image\}"/);
    assert.match(promotion, /echo "PAYMENT_SERVICE_IMAGE_URI=\$\{payment_service_image\}"/);
    assert.match(promotion, /echo "SUBSCRIPTION_SERVICE_IMAGE_URI=\$\{subscription_service_image\}"/);
    assert.match(promotion, /echo "ACCESS_KEY_SERVICE_IMAGE_URI=\$\{access_key_service_image\}"/);
    assert.match(promotion, /echo "NOTIFICATION_SERVICE_IMAGE_URI=\$\{notification_service_image\}"/);
    assert.match(promotion, /echo "ANALYTICS_SERVICE_IMAGE_URI=\$\{analytics_service_image\}"/);
    assert.match(promotion, /echo "WALLET_SERVICE_IMAGE_URI=\$\{wallet_service_image\}"/);
    assert.match(promotion, /echo "TRANSFER_SERVICE_IMAGE_URI=\$\{transfer_service_image\}"/);
    assert.match(promotion, /echo "PRICING_SERVICE_IMAGE_URI=\$\{pricing_service_image\}"/);
  });

  it("deploys every implemented long-running backend API service in the ECS task", () => {
    const terraform = readSource("infrastructure/terraform/main.tf");
    const variables = readSource("infrastructure/terraform/variables.tf");
    const build = readSource("scripts/cicd/build-go-services.sh");
    const smoke = readSource("scripts/cicd/smoke.sh");

    const taskServices = [
      "api",
      "users",
      "authorisation",
      "academy",
      "organisation",
      "courses",
      "booking",
      "payments",
      "subscriptions",
      "access-keys",
      "analytics",
      "notification",
      "wallet",
      "transfer",
      "pricing",
    ];

    for (const service of taskServices) {
      assert.match(terraform, new RegExp(`name\\s+=\\s+"${service}"`));
    }

    for (const variable of [
      "access_key_service_image_uri",
      "wallet_service_image_uri",
      "transfer_service_image_uri",
      "pricing_service_image_uri",
    ]) {
      assert.match(variables, new RegExp(`variable\\s+"${variable}"`));
      assert.match(terraform, new RegExp(`var\\.${variable}`));
    }

    assert.match(build, /ACCESS_KEY_SERVICE_IMAGE_URI/);
    assert.match(build, /WALLET_SERVICE_IMAGE_URI/);
    assert.match(build, /TRANSFER_SERVICE_IMAGE_URI/);
    assert.match(build, /PRICING_SERVICE_IMAGE_URI/);
    assert.match(smoke, /8091 8092 8093 8094 8095 8096/);
  });

  it("runs migrations before rolling the ECS service to the new task definition", () => {
    const deployEnvironment = readSource("scripts/cicd/deploy-environment.sh");

    assert.ok(
      deployEnvironment.indexOf('"${SCRIPT_DIR}/migrate.sh"') < deployEnvironment.indexOf('"${SCRIPT_DIR}/deploy.sh"'),
      "deployment must migrate before updating the ECS service",
    );
  });

  it("does not backfill from public users in the Users service core schema", () => {
    const coreSchema = readSource("apps/backend_api/migrations/users/001_core_schema.sql");

    assert.doesNotMatch(coreSchema, /public\.users/);
    assert.doesNotMatch(coreSchema, /rollfinders_public_user/);
    assert.doesNotMatch(coreSchema, /\\ir backfills\//);
  });

  it("runs service SQL migrations from the deployment image before and after Prisma", () => {
    const migrate = readSource("scripts/cicd/migrate.sh");
    const dockerfile = readSource("Dockerfile");

    assert.match(migrate, /sh scripts\/cicd\/run-service-sql-migrations\.sh && npx prisma migrate deploy && sh scripts\/cicd\/run-service-sql-migrations\.sh/);
    assert.match(dockerfile, /COPY apps\/backend_api\/migrations\/authorisation \.\/apps\/backend_api\/migrations\/authorisation/);
    assert.match(dockerfile, /COPY apps\/backend_api\/migrations\/subscriptions \.\/apps\/backend_api\/migrations\/subscriptions/);
    assert.match(dockerfile, /COPY apps\/backend_api\/migrations\/wallet \.\/apps\/backend_api\/migrations\/wallet/);
  });

  it("runs wallet SQL migrations for existing deployed databases", () => {
    const runner = readSource("scripts/cicd/run-service-sql-migrations.sh");
    const migration = readSource("apps/backend_api/migrations/wallet/tables/011_paymentAdjustmentTypes.sql");

    assert.match(runner, /if \[ -d apps\/backend_api\/migrations\/wallet \]/);
    assert.match(runner, /for dir in tables functions procedures/);
    assert.match(runner, /apps\/backend_api\/migrations\/wallet\/\$\{dir\}\/\*\.sql/);
    assert.match(migration, /CREATE OR REPLACE FUNCTION wallet\.adjust/);
    assert.match(migration, /BOOKING_PAYMENT/);
    assert.match(migration, /COMMISSION/);
  });

  it("stores application runtime configuration in SSM parameters instead of one Secrets Manager JSON blob", () => {
    const appSecretsModule = readSource("infrastructure/terraform/modules/app_secrets/main.tf");
    const appSecretsOutputs = readSource("infrastructure/terraform/modules/app_secrets/outputs.tf");
    const terraform = readSource("infrastructure/terraform/main.tf");

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
    const terraform = readSource("infrastructure/terraform/main.tf");

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

  it("skips duplicate ECS redeploys when Terraform already applied target images", () => {
    const deploy = readSource("scripts/cicd/deploy.sh");

    assert.match(deploy, /IMAGES_ALREADY_MATCH=/);
    assert.match(deploy, /if \[\[ "\$\{IMAGES_ALREADY_MATCH\}" == "true" && "\$\{CURRENT_TASK_DEFINITION_ARN\}" == "\$\{BASE_TASK_DEFINITION_ARN\}" \]\]/);
    assert.match(deploy, /aws ecs wait services-stable/);
  });

  it("configures Prisma pg pools for RDS sslmode=require", () => {
    const prisma = readSource("apps/portal/src/lib/prisma.ts");
    const seed = readSource("prisma/seed.ts");
    const superAdmin = readSource("prisma/ensure-super-admin.ts");
    const pool = readSource("apps/portal/src/lib/prisma-pg-pool.ts");
    const dockerfile = readSource("Dockerfile");

    for (const source of [prisma, seed, superAdmin]) {
      assert.match(source, /createPrismaPgPool\(connectionString\)/);
    }
    assert.match(pool, /url\.searchParams\.delete\("sslmode"\)/);
    assert.match(pool, /sslMode === "require" \? \(\{ rejectUnauthorized: false \}/);
    assert.match(dockerfile, /COPY --chown=nextjs:nodejs apps\/portal\/src\/lib\/prisma-pg-pool\.ts \.\/apps\/portal\/src\/lib\/prisma-pg-pool\.ts/);
  });
});
