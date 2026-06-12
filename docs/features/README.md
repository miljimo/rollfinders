# Feature PRD Organization

Feature requirements are grouped by product domain and then by requirement type.

Use these folders as the canonical locations:

| Domain | APIs | Components | Pages | Products |
| --- | --- | --- | --- | --- |
| User Academies | `Users/Academies/APIs` | `Users/Academies/Components` | `Users/Academies/Pages` | `Users/Academies/Products` |
| Open Mats | `OpenMats/APIs` | `OpenMats/Components` | `OpenMats/Pages` | `OpenMats/Products` |
| Courses | - | - | - | `Courses/Products`, `Courses/Tickets` |
| Standard Users | `Users/Standard/APIs` | `Users/Standard/Components` | `Users/Standard/Pages` | `Users/Standard/Products` |
| Super Admin Users | `Users/SuperAdmin/APIs` | - | `Users/SuperAdmin/Pages` | `Users/SuperAdmin/Products` |
| Platform Users | `Users/Platform/APIs` | - | `Users/Platform/Pages` | `Users/Platform/Products` |
| Platform | `Platform/APIs` | - | `Platform/Pages` | `Platform/Products` |
| Communications / Email Operations | `Communications/Email/Operations/APIs` | - | - | - |
| Communications / User Account Emails | `Communications/Email/UserAccountEmails/APIs` | - | - | `Communications/Email/UserAccountEmails/Products` |
| Deployment | - | - | - | `Deployment/Provisioning`, `Deployment/Delivery`, `Deployment/Operations` |
| Public Site | - | - | `PublicSite/Pages` | - |
| Shared Components | - | `SharedComponents` and `SharedComponents/Components` | - | - |
| Product Planning | - | - | - | `Product/Products` |

## Duplication Rule

Do not create a second PRD for the same feature requirement in another folder. If another document needs the same requirement, link to the canonical PRD instead of copying the requirement text.

Task breakdowns, audits, and MVP planning documents may reference canonical PRDs, but the detailed IF/WHEN/THEN requirement should live in only one feature-domain PRD.
