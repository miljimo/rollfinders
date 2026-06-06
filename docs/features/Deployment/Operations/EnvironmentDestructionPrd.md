# Environment Destruction PRD

## Purpose

Allow disposable environments to be destroyed safely while protecting production and preserving critical data by default.

## Scope

- Environment destruction scripts.
- Production safeguards.
- Database and storage protection.
- Destroy validation.

## Requirements

### Destroy Command

IF an operator requests environment destruction, WHEN the destroy workflow starts, THEN it must require an explicit environment name and show the resources planned for deletion.

### Production Protection

IF the target environment is production, WHEN destruction is requested, THEN the workflow must block by default and require an explicit production override.

### Data Protection

IF database or persistent storage resources are included in a destroy plan, WHEN the plan is reviewed, THEN the workflow must identify those resources separately before deletion is allowed.

### Resource Cleanup

IF a lower environment is destroyed, WHEN the workflow completes, THEN compute, networking, DNS, secrets, scheduled jobs, and logs configured for that environment should be removed or marked intentionally retained.

### Completion Verification

IF destruction succeeds, WHEN the workflow finishes, THEN it must report removed resources and any retained resources that still cost money.

## Acceptance Criteria

- Production cannot be destroyed by an ordinary lower-environment command.
- Persistent data deletion requires explicit acknowledgement.
- Destroy output shows what was removed and what remains.
- Retained resources are visible for follow-up cleanup.

