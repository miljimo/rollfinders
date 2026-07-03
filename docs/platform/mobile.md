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

If an authenticated admin user follows a dashboard, CRM, subscription, access key, or platform-management URL inside the WebView, the app must not render that feature inside the mobile shell. It should either open the URL in the system browser or send the user to a clear unsupported-in-app state.

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
https://rollfinders.com/login
```

Used for:

* Login
* Register
* Forgot password
* Reset password
* Session management

Rollfinders should keep auth on the main domain for the first mobile release. A dedicated auth domain, such as `https://auth.rollfinders.com`, is a later architecture option only if multiple first-party applications need shared centralised login.

---

# WebView App Behaviour

The WebView app must load:

```text
https://rollfinders.com/mobile
```

The page must be mobile-first and optimized for phone screens.

The WebView app must not simply show a desktop website squeezed into a phone screen.

The `/mobile` route is a distinct mobile product surface. It should use its own compact app chrome, bottom navigation, touch-friendly controls, and mobile-first content density instead of reusing the desktop public header and footer.

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

The first release may render Bookings and Saved as authenticated mobile surfaces with useful login and product-state messaging, but they must not be empty placeholders. They should explain the next action and link to working login, booking, privacy, terms, and support routes.

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
https://rollfinders.com/login?redirect=/mobile/...
```

After login, return the user back to the requested mobile page.

Do not show login as the default public mobile entry point. Users must be able to browse discovery, maps, academy profiles, and course/open-mat details without authentication.

## Payment Handoff

Payment pages and third-party checkout flows must not be trapped inside an unsafe or unsupported WebView payment context.

When a booking requires external payment, the mobile web app should hand off to the payment provider using a browser-safe flow. The native shell should open external checkout/payment domains in the system browser, SFSafariViewController, or Chrome Custom Tabs unless the provider explicitly supports embedded WebView checkout.

After payment, callback URLs should return the user to a mobile-aware status page or the relevant booking/detail page.

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
* Opening payment provider links in system browser or platform browser tabs.
* Blocking admin/dashboard/CRM routes from rendering inside the mobile shell.
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
* Real public discovery data on first launch.
* Account deletion/help route or clear support route for account deletion requests.
* Booking and saved-item states that either show real data or provide a clear authenticated next step.

Apple states that apps should be complete and ready for review, with working links including support and privacy policy links.

The first app-store candidate should feel useful in Safari/Chrome before it is wrapped. Native shells should not be submitted until `/mobile` is complete enough to stand on its own as a mobile web app.

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

Browser/WebView client code must not call internal services directly. Server-rendered Next.js code may continue to use existing server-side service helpers, provided those helpers respect the platform API gateway and service-boundary rules.

---

# Delivery Phases

## Phase 1: Mobile Web App

Build `/mobile` as a production-quality mobile web surface:

* Mobile app shell with bottom navigation.
* Discover tab with real academy, open mat, and course data.
* Map tab with nearby locations and directions links.
* Booking/login entry points.
* Saved and Profile states with working links.
* No admin, CRM, subscription, access key, or platform-management entry points.

## Phase 2: User State

Add authenticated user value:

* My Bookings.
* Saved academies/courses.
* Basic profile and logout.
* Account deletion/support route.

## Phase 3: Native Shells

Wrap `/mobile` with Capacitor and add:

* Native splash screen.
* Offline fallback.
* Android back-button handling.
* External-link and payment-link routing.
* App version metadata.

## Phase 4: Native Enhancements

Add optional native capabilities only after the web mobile product is stable:

* Push notifications.
* Deep links.
* Native share targets.
* App-store analytics.

---

# MVP Scope

## Include

* Mobile-first `/mobile` shell
* Academy discovery
* Map search
* Open mat/course discovery
* Academy profile
* Course detail page
* Login/register handoff
* Booking
* Payment handoff
* Authenticated My Bookings entry point
* Authenticated Saved entry point
* Basic profile/support entry point
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

Do not start the native shell until `/mobile` passes the mobile web acceptance criteria. The shell should remain a transport layer, not a second application.

---

# Acceptance Criteria

The implementation is complete when:

* `rollfinders.com/mobile` works as a mobile-first web app.
* `/mobile` has app-like bottom navigation and does not render the desktop header/footer.
* `/mobile` opens with real public discovery data.
* Users can browse without login.
* Login appears only when required.
* Booking flow works on mobile.
* Payment handoff works on mobile.
* External links open correctly.
* App has privacy policy, support, and terms links.
* No CRM/admin features appear in the mobile app.
* iOS WebView app loads the mobile web experience.
* Android WebView app loads the mobile web experience.
* App has an offline fallback screen.
* The app is ready for App Store and Play Store submission.

---

# Core Rule

```text
Build once as mobile-first web.
Wrap lightly for app stores.
Keep CRM separate.
Do not build a separate native app until Rollfinders has enough users to justify it.
```
