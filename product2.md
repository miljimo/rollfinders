# RollFinder MVP Product Requirements Document (PRD)

Version: 1.0

Product: RollFinder

Market: London, United Kingdom

Stage: MVP

---

# Vision

RollFinder helps Brazilian Jiu-Jitsu practitioners answer one simple question:

> Where can I train today?

The MVP focuses exclusively on helping users discover open mats, drop-in sessions, and academies within London.

The product must provide an answer in less than 30 seconds.

---

# Problem Statement

BJJ practitioners currently discover training opportunities through:

* Instagram stories
* WhatsApp groups
* Facebook posts
* Google searches
* Word of mouth

This information is fragmented, outdated, and difficult to search.

Practitioners waste time searching multiple sources to find:

* Open mats
* Drop-in sessions
* Gi classes
* No-Gi classes
* Competition training

Academy owners also struggle to promote sessions effectively because social media posts disappear quickly.

---

# Product Goal

Create the fastest way to discover BJJ training opportunities in London.

The MVP is not a social network.

The MVP is not an academy management system.

The MVP is not a booking platform.

The MVP is a discovery platform.

---

# Success Metrics

First 90 Days

## User Metrics

* 1,000 registered users
* 3,000 monthly visitors
* 500 weekly active users
* 30% returning users
* 1,000 monthly searches

## Academy Metrics

* 50 academy listings
* 20 claimed academies
* 100 active open mat listings

## Revenue Metrics

* First paying academy
* £100 MRR validation target

---

# User Types

## Practitioner

A BJJ student looking for:

* Open mats
* Drop-in classes
* Competition sessions
* Nearby academies

## Academy Owner

A gym owner who wants:

* Visibility
* New visitors
* Open mat promotion

## Administrator

Maintains platform data quality.

---

# MVP Features

## Feature 1: Academy Directory

Purpose:

Allow users to discover academies in London.

Academy Profile Includes:

* Academy name
* Address
* Borough
* Website
* Phone number
* Email
* Affiliation
* Gi availability
* No-Gi availability
* Beginner friendly
* Competition focused
* Drop-in allowed
* Drop-in price
* Directions link

Acceptance Criteria:

* Users can browse all academies
* Users can search academies
* Users can open academy profiles
* Users can get directions

---

## Feature 2: Open Mat Radar

Purpose:

Provide the core value proposition.

Users should immediately see:

* Today's open mats
* Tomorrow's open mats
* This weekend's open mats

Open Mat Data:

* Academy
* Date
* Time
* Location
* Gi / No-Gi
* Drop-in fee
* Contact information

Acceptance Criteria:

* Open mats displayed chronologically
* Searchable
* Filterable
* Mobile friendly

---

## Feature 3: Search

Purpose:

Allow users to find training opportunities quickly.

Search By:

* Academy name
* Borough
* Postcode
* Gi
* No-Gi
* Competition training
* Open mat

Acceptance Criteria:

* Search results returned within 2 seconds
* Mobile optimized

---

## Feature 4: Interactive Map

Purpose:

Provide location-based discovery.

Map Displays:

* Academies
* Open mats

Map Functions:

* Zoom
* Directions
* View details

Acceptance Criteria:

* User can discover nearby training locations visually

---

## Feature 5: Academy Claiming

Purpose:

Allow academy owners to maintain accuracy.

Claim Flow:

1. Owner requests claim
2. Admin reviews
3. Owner receives access

Owner Capabilities:

* Update academy details
* Add open mats
* Edit drop-in information

Acceptance Criteria:

* Claim requests manageable by admin
* Approved owners can update listings

---

# User Flows

## Practitioner Flow

1. Visit RollFinder
2. View Open Mat Radar
3. Apply filters
4. Select academy
5. Get directions
6. Attend training

Maximum clicks:

5

---

## Academy Owner Flow

1. Find academy listing
2. Click Claim Profile
3. Submit verification
4. Receive approval
5. Add open mats

---

# Data Model

## Academy

Fields:

* id
* name
* slug
* address
* postcode
* borough
* latitude
* longitude
* website
* phone
* affiliation
* drop_in_price
* gi_available
* nogi_available
* beginner_friendly
* competition_focused
* verified

---

## OpenMat

Fields:

* id
* academy_id
* title
* description
* start_datetime
* end_datetime
* gi_type
* drop_in_fee
* active

---

## User

Fields:

* id
* email
* role
* created_at

Roles:

* Practitioner
* AcademyOwner
* Admin

---

# Technical Requirements

Frontend

* Next.js
* TypeScript
* TailwindCSS

Backend

* Next.js API Routes
* TypeScript

Database

* PostgreSQL

Authentication

* Clerk
* Auth0
* Supabase Auth

Maps

* Google Maps
* Mapbox

Hosting

* Vercel

Analytics

* Google Analytics
* PostHog

---

# Out of Scope

The following are explicitly excluded from MVP:

## Social Features

* User profiles
* Following users
* Activity feeds
* Chat

## Reviews

* Ratings
* Reviews
* Comments

## Payments

* Membership billing
* Subscription management

## Academy Management

* Attendance tracking
* Student management
* Timetable management

## Marketplace

* Equipment sales
* Merchandise

---

# Monetization Phase 1

No monetization during the first launch period.

Focus entirely on:

* User growth
* Academy adoption
* Data quality

After traction:

## Founding Academy Package

£29/month

Includes:

* Verified badge
* Priority listing
* Unlimited open mat posts
* Analytics dashboard

---

# 30-Day MVP Build Plan

Week 1

* Authentication
* Database schema
* Academy model
* Open mat model

Week 2

* Academy directory
* Search functionality
* Academy profile pages

Week 3

* Open Mat Radar
* Filters
* Interactive map

Week 4

* Academy claiming
* Admin dashboard
* Analytics integration
* Production deployment

---

# Core Principle

Every feature must support this goal:

> Help a BJJ practitioner find a place to train in less than 30 seconds.

If a feature does not directly contribute to training discovery, it should not be included in the MVP.
