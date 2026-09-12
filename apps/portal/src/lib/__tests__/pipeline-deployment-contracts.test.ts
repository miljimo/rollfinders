import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("GitHub validates feature branches and keeps production deployment manual", () => {
  const workflow = source(".github/workflows/ci.yml");
  const deployEnvironment = source("scripts/cicd/deploy-environment.sh");

  assert.match(workflow, /- master/);
  assert.match(workflow, /- "feature\/\*\*"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch' && inputs\.deploy/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/master'/);
  assert.match(workflow, /production_confirmation == 'production'/);
  assert.doesNotMatch(workflow, /release_ref/);
  assert.match(workflow, /packages:\s*read/);
  assert.match(workflow, /GITHUB_PACKAGE_TOKEN:\s*\$\{\{ github\.token \}\}/);
  assert.doesNotMatch(workflow, /PACKAGES_READ_TOKEN/);
  assert.match(deployEnvironment, /deployment_branch=.*GITHUB_REF_NAME.*BITBUCKET_BRANCH/);
  assert.match(deployEnvironment, /deployment_branch.*!= "master"/);
});

test("Bitbucket validates feature branches and deploys only the portal from master", () => {
  const pipeline = source("bitbucket-pipelines.yml");
  const masterPipeline = pipeline.split(/\n    master:\n/)[1] ?? "";

  assert.match(pipeline, /"feature\/\*":\n\s+- step: \*validate/);
  assert.match(masterPipeline, /Build Production Portal Image/);
  assert.match(masterPipeline, /Deploy Production/);
  assert.match(masterPipeline, /trigger: manual/);
  assert.match(masterPipeline, /PRODUCTION_APPROVED=true/);
  assert.doesNotMatch(masterPipeline, /build-go-services\.sh|FORCE_SERVICE_REDEPLOY|SERVICE_REDEPLOY_TARGET/);
});
