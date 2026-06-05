# Feature PRD Organization

Feature requirements are grouped by product domain and then by requirement type.

Use these folders as the canonical locations:

| Domain | APIs | Components | Pages | Products |
| --- | --- | --- | --- | --- |
| Academies | `Academies/APIs` | `Academies/Components` | `Academies/Pages` | `Academies/Products` |
| Open Mats | `OpenMats/APIs` | `OpenMats/Components` | `OpenMats/Pages` | `OpenMats/Products` |
| Users | `Users/APIs` | - | `Users/Pages` | `Users/Products` |
| Platform | `Platform/APIs` | - | `Platform/Pages` | `Platform/Products` |
| Deployment | - | - | - | `Deployment/Products` |
| Public Site | - | - | `PublicSite/Pages` | - |
| Shared Components | - | `SharedComponents` and `SharedComponents/Components` | - | - |
| Product Planning | - | - | - | `Product/Products` |

## Duplication Rule

Do not create a second PRD for the same feature requirement in another folder. If another document needs the same requirement, link to the canonical PRD instead of copying the requirement text.

Task breakdowns, audits, and MVP planning documents may reference canonical PRDs, but the detailed IF/WHEN/THEN requirement should live in only one feature-domain PRD.
