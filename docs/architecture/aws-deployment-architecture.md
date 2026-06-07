# RollFinder AWS Deployment Architecture

This artifact describes the AWS resources used to run RollFinder and how they relate to each other. It reflects the Terraform stack in `terraform/main.tf` and the environment values under `terraform/environments`.

## System Context

RollFinder is a Next.js application packaged as a Docker image, pushed to Amazon ECR, and deployed on ECS Fargate. Public traffic enters through Route53 and an internet-facing Application Load Balancer. ECS tasks run in private subnets and connect to a private RDS PostgreSQL database. Static asset infrastructure is prepared through S3 and CloudFront.

```mermaid
flowchart LR
  user[User Browser]
  dns[Route53 Public Hosted Zone<br/>rollfinders.com]
  alb[Application Load Balancer<br/>HTTPS 443, HTTP redirect]
  ecs[ECS Fargate Service<br/>Next.js web container :3000]
  rds[(RDS PostgreSQL 16<br/>private database subnets)]
  secrets[Secrets Manager<br/>DATABASE_URL, NEXTAUTH_*]
  logs[CloudWatch Logs<br/>/ecs/rollfinder-env]
  ecr[ECR Repository<br/>rollfinder/env/app]
  s3[S3 Assets Bucket<br/>private, encrypted, versioned]
  cf[CloudFront Distribution<br/>S3 origin access control]
  state[S3 State and Deployment Control<br/>tfstate, deployment lock,<br/>promotion markers]

  user --> dns
  dns --> alb
  alb --> ecs
  ecs --> rds
  ecs --> secrets
  ecs --> logs
  ecr --> ecs
  cf --> s3
  user -. static assets .-> cf
  state -. controls deploys .-> ecs
```

## Network Topology

Each environment creates its own VPC in `eu-west-2` across two availability zones by default.

```mermaid
flowchart TB
  internet((Internet))

  subgraph vpc[VPC rollfinder-env-vpc<br/>10.40.0.0/16 default]
    igw[Internet Gateway]

    subgraph public[Public Subnets]
      alb[Application Load Balancer]
      nat[NAT Gateway<br/>single AZ]
    end

    subgraph private[Private App Subnets]
      ecs[ECS Fargate Tasks<br/>assign_public_ip = false]
    end

    subgraph dbsubnets[Database Subnets]
      rds[(RDS PostgreSQL<br/>publicly_accessible = false)]
    end

    public_rt[Public Route Table<br/>0.0.0.0/0 -> IGW]
    private_rt[Private Route Table<br/>0.0.0.0/0 -> NAT]
    database_rt[Database Route Table<br/>no default internet route]
  end

  internet --> igw
  igw --> alb
  public_rt --- public
  private_rt --- private
  database_rt --- dbsubnets
  nat --> internet
  alb --> ecs
  ecs --> rds
```

## Request Flow

```mermaid
sequenceDiagram
  participant Browser as User Browser
  participant R53 as Route53
  participant ALB as Application Load Balancer
  participant ECS as ECS Fargate Task
  participant SM as Secrets Manager
  participant RDS as RDS PostgreSQL
  participant CW as CloudWatch Logs

  Browser->>R53: Resolve environment domain
  R53-->>Browser: ALB alias target
  Browser->>ALB: HTTPS request
  ALB->>ECS: Forward HTTP :3000
  SM-->>ECS: Inject runtime secrets when task starts
  ECS->>RDS: Query PostgreSQL over 5432
  ECS->>CW: Emit application logs
  ECS-->>ALB: Next.js response
  ALB-->>Browser: HTTPS response
```

## Security Boundaries

```mermaid
flowchart LR
  internet[Internet]
  alb_sg[ALB Security Group<br/>in: 80/443 from 0.0.0.0/0<br/>out: all]
  ecs_sg[ECS Security Group<br/>in: 3000 from ALB SG<br/>out: all]
  db_sg[Database Security Group<br/>in: 5432 from ECS SG]

  internet --> alb_sg
  alb_sg --> ecs_sg
  ecs_sg --> db_sg
```

Key controls:

- Public ingress is limited to the ALB on ports `80` and `443`.
- HTTP is redirected to HTTPS.
- ECS tasks are not assigned public IPs.
- RDS is private, encrypted, and only accepts PostgreSQL traffic from the ECS security group.
- ECS receives `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` from Secrets Manager at task startup through the execution role.
- ECR scans images on push and uses AES-256 encryption.
- S3 assets bucket is private, encrypted, and versioned.
- Deployment locks and promotion markers are S3-backed, defaulting to the dev Terraform state bucket unless overridden.

## Environment Matrix

| Environment | Domain | Desired ECS Tasks | RDS Class | Production Controls |
| --- | --- | ---: | --- | --- |
| dev | `dev.rollfinders.com` | 1 | `db.t4g.micro` | 7-day backups, no deletion protection |
| production | `rollfinders.com` | 2 | `db.t4g.small` | Multi-AZ, 14-day backups, deletion protection, final snapshot |

## DNS Names

| Name | Target |
| --- | --- |
| Frontend domain | ALB alias record |
| API domain | ALB alias record, `api.rollfinders.com` in production and `api.<env-domain>` elsewhere |
| WWW domain | Production only, ALB alias record with HTTPS listener redirect to canonical domain |
| Static assets URL | CloudFront default distribution domain |

## Operational Notes

- Terraform remote state is bootstrapped per environment with encrypted, versioned S3 buckets.
- The deployment scripts also use S3 objects for the global deployment lock and promotion markers.
- ECS service has container insights enabled and logs to CloudWatch.
- ECS service auto scaling targets average CPU at 70 percent, with max capacity `2` outside production and `6` in production.
- The application health check endpoint is `/api/health` at both ALB target group and container levels.
