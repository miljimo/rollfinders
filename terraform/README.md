# Terraform Code Documentations
Feature branch deployment allows complete stack for the application to be deployed in isolation. This approach ensures that each environment has its own isolated resource stack, allowing development environments to remain fully separate for each developer.

If we decided to not use this approach we can decide to delete "fixtures" folder and use set the local variables to the shared resources directly.

and also make sure the branch environment variable "**DEFAULT_BRANCH_NAME**" is set to empty.




## Circuit Deployment Diagram
![alt text](./docs/DeploymentCircuitDiagram.png)

## Environments
-  Development
-  Staging(testing, uat e.t.c)
-  Production
---



## Terraform Lock Problem

During deployment, Terraform will lock the state if two applications try to deploy to the same environment at the same time.
![alt text](./docs/lock_image.png)

### Possible Causes

- Internet connection failure during deployment
- Deployment interruption
- Other unexpected issues

### Solution

If you suspect the issue is caused by a locked state (as shown in the image):

- Navigate to the relevant S3 path.
- Delete the lock file.
- Redeploy the Terraform code.
