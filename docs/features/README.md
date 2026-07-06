# Feature PRD Organization

Feature requirements are grouped by ownership first, then by product domain and requirement type.

Portal-owned UI, page, dashboard, reusable component, and Next.js API-route requirements live under:

```text
apps/portal/docs/features/
```

Top-level `docs/features/` is reserved for shared product planning, deployment, communications, and cross-cutting documents that are not owned by a single application.

Use these folders as the canonical locations:

| Domain | APIs | Components | Pages | Products |
| --- | --- | --- | --- | --- |
| User Academies | `apps/portal/docs/features/Users/Academies/APIs` | `apps/portal/docs/features/Users/Academies/Components` | `apps/portal/docs/features/Users/Academies/Pages` | `apps/portal/docs/features/Users/Academies/Products` |
| Open Mats | `apps/portal/docs/features/OpenMats/APIs` | `apps/portal/docs/features/OpenMats/Components` | `apps/portal/docs/features/OpenMats/Pages` | `apps/portal/docs/features/OpenMats/Products` |
| Standard Users | `apps/portal/docs/features/Users/Standard/APIs` | `apps/portal/docs/features/Users/Standard/Components` | `apps/portal/docs/features/Users/Standard/Pages` | `apps/portal/docs/features/Users/Standard/Products` |
| Super Admin Users | `apps/portal/docs/features/Users/SuperAdmin/APIs` | - | `apps/portal/docs/features/Users/SuperAdmin/Pages` | `apps/portal/docs/features/Users/SuperAdmin/Products` |
| Platform Users | `apps/portal/docs/features/Users/Platform/APIs` | - | `apps/portal/docs/features/Users/Platform/Pages` | `apps/portal/docs/features/Users/Platform/Products` |
| Platform portal | `apps/portal/docs/features/Platform/APIs` | - | `apps/portal/docs/features/Platform/Pages` | `apps/portal/docs/features/Platform/Products` |
| Public Site | - | - | `apps/portal/docs/features/PublicSite/Pages` | - |
| Shared Components | - | `apps/portal/docs/features/SharedComponents` and `apps/portal/docs/features/SharedComponents/Components` | - | - |
| Communications / Email Operations | `Communications/Email/Operations/APIs` | - | - | - |
| Communications / User Account Emails | `Communications/Email/UserAccountEmails/APIs` | - | - | `Communications/Email/UserAccountEmails/Products` |
| Deployment | - | - | - | `Deployment/Provisioning`, `Deployment/Delivery`, `Deployment/Operations` |
| Product Planning | - | - | - | `Product/Products` |

## Duplication Rule

Do not create a second PRD for the same feature requirement in another folder. If another document needs the same requirement, link to the canonical PRD instead of copying the requirement text.

Task breakdowns, audits, and MVP planning documents may reference canonical PRDs, but the detailed IF/WHEN/THEN requirement should live in only one feature-domain PRD.

