# GitHub Actions OIDC

Creates an AWS IAM OpenID Connect provider and an assumable deployment role for
GitHub Actions. Restrict `allowed_subjects` to trusted repositories, branches,
tags, or protected GitHub environments.

The caller supplies managed policy ARNs because deployment permissions depend on
the stack managed by the consuming repository.
