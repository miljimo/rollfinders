# EC2 App Host

Runs the RollFinders application stack on a single EC2 instance for low-cost environments.

The module installs Docker and the SSM agent through user data, attaches an instance profile with ECR read and SSM access, and exposes the instance private IP for ALB target registration.
