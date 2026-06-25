# PRD: Rollfinders Mobile-First WebView App

## Objective

Create a mobile-first Rollfinders experience that can run as:

1. A responsive mobile web app.
2. A WebView-based iOS application.
3. A WebView-based Android application.

The goal is to avoid building a separate native mobile application while still allowing Rollfinders to be distributed through the Apple App Store and Google Play Store.

---

# Product Direction

Rollfinders Mobile is not a separate native product.

It is a mobile-first version of the public Rollfinders web experience, wrapped inside a lightweight native mobile container.

The mobile app should expose only the public side of Rollfinders:

* Academy discovery
* Open mat discovery
* Course discovery
* Map search
* Academy profile
* Course details
* Booking
* Payment handoff
* User login for booking
* My bookings
* Saved academies or courses

It must not include CRM, admin, subscription, access key, or platform management features.

---

# Architecture

```text
Mobile Web App
        ↓
WebView Shell
        ↓
iOS App / Android App
```

The main application is hosted as a responsive web application:

```text
https://rollfinders.com
```

The mobile app wraps the mobile-first web experience inside a native WebView.

---

# Recommended URL Structure

## Public Web

```text
https://rollfinders.com
```

Used for:

* Public homepage
* Academy discovery
* Open mat discovery
* Public course discovery
* Public academy pages

## Mobile Web Entry

```text
https://rollfinders.com/mobile
```

Used by WebView apps.

## Dashboard

```text
https://rollfinders.com/dashboard
```

Used only for authenticated dashboard shell.

## Auth

```text
https://auth.rollfinders.com
```

Used for:

* Login
* Register
* Forgot password
* Reset password
* Session management

---

# WebView App Behaviour

The WebView app must load:

```text
https://rollfinders.com/mobile
```

The page must be mobile-first and optimized for phone screens.

The WebView app must not simply show a desktop website squeezed into a phone screen.

---

# Mobile Navigation

Use mobile-first bottom navigation:

```text
Discover
Map
Bookings
Saved
Profile
```

## Discover

Shows nearby academies, open mats, and courses.

## Map

Shows academies and courses by location.

## Bookings

Shows the user’s bookings after login.

## Saved

Shows saved academies or courses.

## Profile

Shows login status, basic profile, logout, privacy, support, and settings.

---

# Authentication

Users can browse without logging in.

Login is required only for:

* Creating a booking
* Paying for a booking
* Saving favourites
* Viewing My Bookings
* Managing basic profile

If login is required, redirect to:

```text
https://auth.rollfinders.com/login?redirect=https://rollfinders.com/mobile/...
```

After login, return the user back to the requested mobile page.

---

# WebView Shell Responsibilities

The native WebView shell should be minimal.

It should handle:

* Loading the mobile web app.
* Showing a native splash screen.
* Detecting offline state.
* Showing a friendly offline page.
* Handling back button on Android.
* Opening external links in system browser.
* Supporting push notifications later.
* Supporting app version metadata.
* Supporting deep links later.

The shell must not contain business logic.

---

# App Store Readiness

To reduce rejection risk, the WebView app should include app-like behaviour:

* Mobile-first responsive UI.
* Native splash screen.
* Clear navigation.
* Stable loading.
* Offline fallback screen.
* Privacy policy link.
* Terms link.
* Support/contact link.
* Account deletion/help route.
* No broken links.
* No desktop-only pages.
* No empty placeholder pages.

Apple states that apps should be complete and ready for review, with working links including support and privacy policy links.

---

# Public Website Login Rule

The public website should not behave like a CRM login portal.

Public users should browse freely.

Authentication should appear only when needed for user actions such as booking or saving.

---

# Backend Integration

The mobile web app must communicate only through the API Gateway.

```text
Mobile Web / WebView
        ↓
API Gateway
        ↓
Rollfinders Services
```

No direct service calls are allowed from the WebView.

---

# MVP Scope

## Include

* Mobile-first homepage
* Academy discovery
* Map search
* Open mat/course discovery
* Academy profile
* Course detail page
* Login/register handoff
* Booking
* Payment handoff
* My bookings
* Saved academies/courses
* Basic profile
* Privacy/support pages

## Exclude

* CRM
* Admin dashboard
* Subscription plan management
* Access key management
* Platform engineering tools
* Personal training management
* AI Coach
* Native-only complex features

---

# Recommended Technology

## Web

```text
React / Next.js
TypeScript
Responsive mobile-first UI
PWA support
```

## Native Shell

Recommended options:

```text
Capacitor
React Native WebView
Flutter WebView
```

For Rollfinders, **Capacitor** is probably the best fit because it is designed to wrap web apps into iOS and Android apps while still allowing native plugins later.

---

# Acceptance Criteria

The implementation is complete when:

* `rollfinders.com/mobile` works as a mobile-first web app.
* iOS WebView app loads the mobile web experience.
* Android WebView app loads the mobile web experience.
* Users can browse without login.
* Login appears only when required.
* Booking flow works on mobile.
* Payment handoff works on mobile.
* External links open correctly.
* App has privacy policy, support, and terms links.
* App has an offline fallback screen.
* No CRM/admin features appear in the mobile app.
* The app is ready for App Store and Play Store submission.

---

# Core Rule

```text
Build once as mobile-first web.
Wrap lightly for app stores.
Keep CRM separate.
Do not build a separate native app until Rollfinders has enough users to justify it.
```
