# Technical Specification

## Project: Video Platform with Series, Video Tutorials, Subscriptions, and Partner Program

---

## 1. General Project Concept

The website is a closed video platform with proprietary content in various formats, including entertainment and educational content, with access differentiation based on subscription, partner model, and age restrictions.

---

## 2. User Roles

- **Guest**
- **Buyer** (registered user)
- **Service Partner**
- **Minor User** (restricted role)
- **Administrator**
- **Moderator**

---

## 3. Functional Requirements

### 3.1. Video Sections and Content Structure

The following sections must be implemented on the website:

- Video Series
- Clips
- Short Videos
- Video Tutorials (separate section)

**Requirements:**

- Content is uploaded through the administrative panel
- Mandatory moderation before publication
- Ability to specify:
  - Description
  - Category
  - Tags
  - Content type
  - Format (series / tutorial / clip)
  - Age category
- Streaming video delivery without direct download capability

### 3.2. Age Rating and Content Filtering

Implement an age restriction system.

**Age categories for content:**

- Under 18 years
- 18+

**Logic:**

- Age category is assigned to each video upon upload
- User's age is recorded during registration
- 18+ content:
  - Is not displayed
  - Is not available in search
  - Is not accessible via direct links for personal accounts belonging to minors
- Filtering applies to all website sections

### 3.3. User Registration and Verification

Mandatory verification is required to create a personal account.

**Requirements:**

- Registration with date of birth indication
- Identity/age confirmation
- Verification method to be determined during the design phase; possible options:
  - Confirmation via payment
  - Document upload
  - Third-party service integration
- Without verification, access to content and features is limited

### 3.4. Subscriptions and Content Access

- Free content
- Subscription to individual series
- Subscription to video tutorials
- Annual premium subscription (access to all content)

**Functionality:**

- Individual pricing for each series and course
- Access management through admin panel
- History of active and completed subscriptions in personal account

### 3.5. User Personal Account

**Functionality:**

- User profile
- Verification status
- Age category
- Subscriptions and access permissions
- Purchase history
- Referral link generation
- Bonus balance

### 3.6. Partner Program

- Multi-level system up to 5 levels
- Bonus accrual for:
  - Subscriptions
  - Video tutorials
  - Store merchandise
- Partner structure display:
  - Users
  - Partners
  - Levels
  - Accruals for each participant

### 3.7. Bonuses and Store

**Bonus usage:**

- Video tutorial payment
- Accessories payment
- Ticket purchases
- Partial or full payment

### 3.8. Bonus Withdrawal and Taxation

- Bonus conversion to rubles
- Tax status accounting
- Transaction and request history

### 3.9. Payment Methods (Russia)

- Payment by bank details
- SBP (Faster Payments System)
- QR code
- Architectural readiness for YooKassa integration

### 3.10. Newsletters

- Mass mailings
- Filtering by:
  - Age
  - Verification status
  - Subscriptions
  - User roles

### 3.11. Administrative Panel

**Additional features:**

- Content age category management
- User verification control
- Access restriction logs
- Reports on minor accounts

---

## 4. Non-Functional Requirements

### 4.1. Security and Compliance

- Personal data protection
- Restricting minors' access
- Partner system protection
- Action logging

### 4.2. Scalability

The website architecture must be designed with consideration for subsequent functionality expansion without the need for complete system overhaul.

**Scalability requirements:**

- Support for connecting other currencies and payment systems
- Ability to accept payments from users in other countries
- Cryptocurrency payment integration capability
- Video storage and CDN scaling without changing user logic
- Readiness for load increase (growth in number of users and content)

**Content age gradation:**

Implementation of a flexible age category system:

- 0+
- 6+
- 12+
- 16+
- 18+

- Ability to add new age categories without changing the system core
- Assigning an age category to each content item upon upload
- Automatic content filtering based on user age
- Applying age restrictions to all website sections, including search, recommendations, and direct links

---

## 5. Legal Documents and Partner Agreements

The website must implement the ability to centrally upload, store, and display legally significant documents.

**Requirements:**

- Hosting the following document types:
  - User agreement
  - Offer
  - Privacy policy
  - Partner agreement
  - Contracts and supplementary agreements
- Linking the current document version to:
  - User registration
  - Partner status activation
  - Subscription and product payments
- Document version history storage
- Recording user document acceptance (logging)
- Ability for mandatory re-acceptance of documents when terms are updated
- Document display in public access and in user personal account

---

## Main Idea

**Concept:**
A "next-generation streaming platform" digital product: a mix of Netflix/Spotify

Minimalism, living interface, micro-animations, content-first, emotional UX, dark mode by default

**Brand tone:**
Confident, technological, yet friendly. Not "entertainment for teenagers," but a platform where you can binge-watch series, level up with tutorials, and earn bonuses.

**Basic idea:** Dark, "cinematic" interface with neon/gradient accents

---

## Design System

### Color Palette

| Element                                    | Color Code                                                    |
| ------------------------------------------ | ------------------------------------------------------------- |
| **Main background**                        | Near-black `#05060A` or deep graphite `#080B12`               |
| **Surface blocks (cards, panels)**         | `#10131C`, `#151824`                                          |
| **Primary accent**                         | Saturated neon violet-magenta `#C94BFF`                       |
| **Secondary accent**                       | Turquoise-cyan `#28E0C4` (statuses, success, active elements) |
| **Tertiary accent** (rare, important CTAs) | Warm coral `#FF6B5A`                                          |
| **Primary text**                           | `#F5F7FF`                                                     |
| **Secondary text / captions**              | `#9CA2BC`                                                     |
| **Disabled / less significant**            | `#5A6072`                                                     |
| **Borders / delicate dividers**            | `#272B38` ⚠️ _needs visual validation_                        |

**Action buttons (CTA):** Fill with neon gradient (violet → magenta → turquoise), white text

**Notifications:**
| Type | Background | Text |
|------|------------|------|
| Success | `#12352E` | `#7CF2CF` |
| Error | `#35141A` | `#FF9AA8` ⚠️ _needs validation_ |

### Typography

Modern Cyrillic required, variable weights, good readability.

**Accent font (branded / headlines):**

- Aeonik
- Suisse Intl Condensed
- Or an understated wide grotesque

**Sizes and hierarchy** (for desktop - should this be specified?)

### Grid System and Composition

A mix of strict grid and light organic/anti-grid elements.

- **Base grid:** 12-column, maximum content width 1200–1320 px
- **Video feed:** Bento layout
  - Large recommended series
  - Medium cards for tutorials
  - Compact for clips and shorts

---

## Page Layouts

### 1. Home Page (after login)

- Overall 12-column grid for block placement
- Hero block composition (large promo banner for series/course) + content carousels below
- "Bento" layout: cards of different sizes (flagship series, tutorials, clips), but within a single grid to look cohesive, not chaotic

### 2. Content Showcases (Series, Clips, Shorts, Tutorials)

- Card grid: uniform spacing, number of cards per row at different resolutions, clear visual hierarchy
- Preview composition: cover, age label, title, type, viewing progress — all in a unified structure for quick scanning
- For mobile: same logic, adapted for one-two cards per row

### 3. Video Viewing Page

- Player composition as the main focus (wide block centered/top)
- Below the player: structured grid — description, series/lessons, related content block

### 4. User Personal Account

- Side menu + main area, all on common grid
- Inside: status cards (verification, age, balance, subscriptions)
- Tables/lists (purchase history, subscriptions, bonus transactions) built on grid columns: vertical and horizontal alignment

### 5. Partner Program and Bonuses

- Partner structure display (levels, people, amounts) in tables, cards, diagrams arranged on grid
- Composition: key figures on top (income, levels), detailed lists and structures below — summary first, then details

### 6. Store (Accessories, Tickets)

- Classic product grid: product cards, filters, sorting — all based on grid to prevent "floating" sizes and spacing
- Product card composition: photo/cover, name, price, ability to pay with bonuses/partially — reads consistently from product to product

### 7. Registration, Verification, Payment Forms

- Grid defines: field width, hint placement, progress location, label alignment
- Composition: from "large headline" and brief explanation to logical field groups (personal data, documents, payment)

### 8. Legal Documents Section

- Unified grid for text: margins, spacing, line width for comfortable reading
- Composition: headline, brief summary, main text, "Accept terms" checkbox block — all predictably positioned

### 9. Responsive Design

Grid system ensures the same layout logic transitions beautifully and predictably to:

- **Desktop:** Multiple columns
- **Tablet:** 2–3 columns
- **Mobile:** 1 column, scroll

---

## UI Elements

### Icons

- Flat, linear, or duotone, without excessive detail
- Rounded corners, visual style close to system icons (like iOS/macOS/Material 3) — to avoid looking dated

### Age Categories (0+, 6+, 12+, 16+, 18+)

Compact capsules/pills with color coding:

| Category | Color           |
| -------- | --------------- |
| 0+ / 6+  | Green/turquoise |
| 12+      | Blue            |
| 16+      | Orange          |
| 18+      | Red/burgundy    |

Always on preview: in card corner, readable, doesn't conflict with cover

### Header and Navigation

**Header (for authenticated user):**

- Logo on left (minimalist mark + wordmark)
- Main menu: "Series," "Clips," "Shorts," "Tutorials," "Partners," "Store"
- Right side: search (embedded in header bar), notification icon, profile icon with avatar and verification indicator

### Search

- "Smart" search + suggestions
- On click: full-screen overlay, dark background, large input field
- Below: quick filters (genres, content type, age filter)

### Video Cards

**General logic:**

- Preview cover
- Top: age label, sometimes "New" / "Platform Exclusive" badge
- Bottom / on hover:
  - Title
  - Type: "Series / Course / Clip / Short"
  - Viewing progress (progress bar)
  - For paid: "In subscription" badge or price

**On hover (desktop):**

- Light scale + shadow + brief description
- Micro-animation: smooth darkening, appearance of "Watch" / "Add to Playlist" buttons

### Visual Separation of Age-Appropriate and Adult Content

To make the platform comfortable for both minors and 18+:

**For accounts <18:**

- No visual hint that "there's something 18+ out there"
- Recommendations and cross-promo only 0–16+

**For 18+:**

- 18+ content is not aggressively highlighted, simply marked with a badge and appears in results
- Separate "18+" collections are allowed only within confirmed age

---

## Brand Character and Visual Details

To make the platform feel "alive" rather than template-like:

- Custom patterns/gradients (e.g., wave-like shapes or soft geometric intersections in background layer)
- Custom icons for key entities: subscription, bonuses, partner program, age, tutorials
- Emphasis on "human" details:
  - Personalized recommendations addressing user by name
  - Mini-labels: "Returned to watching," "You might like"

---

## Open Questions

> ⚠️ **To be decided:**
>
> 1. **Enable comments under each video**
> 2. **Is it possible to implement animations, micro-animations, and a "living interface" on the website?**

---

_Note: Personal account and similar sections haven't been detailed visually. Open to adjustments and accepting alternative adaptive visual solutions._
