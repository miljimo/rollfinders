# Feature.md

# Feature: Public Business Information Pages

## Feature ID

RF-007

## Priority

High

## Type

Platform Foundation

---

# Objective

Provide essential public-facing business pages that establish trust, provide legal transparency, and allow users, academy owners, and partners to contact RollFinder.

These pages are required for a professional public launch.

---

# Business Justification

Users need to know:

* Who operates RollFinder
* How to contact RollFinder
* How their data is used
* What terms govern the platform

Without these pages:

* Trust decreases
* SEO suffers
* Partnership opportunities suffer
* GDPR compliance becomes difficult

---

# Required Pages

## About

Route:

```text
/about
```

Purpose:

Explain:

* What RollFinder is
* Why it was created
* Who it serves
* Mission statement

Content:

* Platform introduction
* BJJ community focus
* Vision
* Founder story (optional)

---

## Contact

Route:

```text
/contact
```

Purpose:

Allow users and academy owners to contact RollFinder.

Display:

* Contact email
* Business enquiry email
* Support email

Optional:

* Contact form

---

## Privacy Policy

Route:

```text
/privacy-policy
```

Purpose:

Explain:

* Data collection
* Cookies
* User accounts
* Analytics
* GDPR rights

Must include:

* Contact information
* Data retention policy
* User rights

---

## Terms of Service

Route:

```text
/terms
```

Purpose:

Define:

* Platform usage rules
* User responsibilities
* Academy responsibilities
* Content ownership
* Liability limitations

---

# Footer Navigation

Every page must display:

```text
About

Contact

Privacy Policy

Terms of Service
```

---

# SEO Requirements

All pages must include:

* Page title
* Meta description
* Canonical URL

---

# Accessibility Requirements

Pages must:

* Be mobile friendly
* Be keyboard accessible
* Meet WCAG standards

---

# Acceptance Criteria

Feature is complete when:

* About page exists
* Contact page exists
* Privacy Policy exists
* Terms page exists
* Footer links are visible
* Pages are mobile responsive
* Pages are indexable by search engines

---

# AI Agent Instructions

Implementation Requirements:

* Create static pages.
* Add footer navigation.
* Use existing site layout.
* Follow SEO best practices.
* Ensure pages work without authentication.

Feature Status:

MVP REQUIRED
