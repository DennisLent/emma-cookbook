# Project Progress Tracker

Derived from readme.md (Scope — Must/Should/Later and Frontend MVP — Final Scope).

Legend: [x] completed, [ ] not yet

## Foundation / Platform
- [x] Dockerized backend and frontend (Dockerfiles, docker-compose.yml)
- [x] Run script for local dev (`run.sh`)
- [x] Database configured (PostgreSQL via .env)
- [x] Media storage for images (Django `MEDIA_ROOT`)
- [x] Auth modes supported (JWT and Keycloak; switchable by env)

## Core Recipe Features
- [x] Create recipe (manual form)
- [x] Recipe list and detail views
- [x] Tag model + tag chips in UI
- [x] Ingredient model + structured linkage to recipes
- [x] Preview/import from Website (backend + UI)
- [x] Preview/import from YouTube (backend + UI)
- [x] Edit recipe (update flow in UI)
- [x] Delete recipe (UI)
- [ ] Paste-text import with guided split
- [ ] Full JSON export/import (backup/restore endpoints + UI)

## Search & Browse
- [x] Instant search by title
- [x] Tag filtering with chips
- [x] Suggestions carousel (server-provided)
- [x] Filter by ingredients
- [x] Sort by newest/top rated
  - Note: Top rated / favorites sorting is implemented; "newest" sort pending.

## Cooking Experience
- [ ] Cook Mode (distraction‑free stepper, large type)
- [ ] Per‑step timers
- [ ] Servings scaling for ingredients

## Social & Sharing
- [x] Ratings (UI)
- [x] Favorites (UI)
- [x] Comments (display in detail view)
- [x] Comment create (UI)
- [ ] Comment edit/delete (UI)
- [ ] Share actions (Web Share API, WhatsApp deep link)

## Personalization & Settings
- [x] Light theme baseline (CSS variables)
- [x] Accent color picker + site title/logo settings
- [x] Dark theme toggle
- [ ] Per‑user preferences (theme, density, accessibility)

### Layout Customization
- [x] Recipe detail layout builder (1–3 columns, drag & drop, adjustable widths)
- [x] Persist per‑user layout (server + localStorage)
- [x] Comments fixed at bottom of recipe detail (not part of customization)
- [x] i18n language preference applied and persisted

## Planning & Shopping
- [ ] Meal planning list (per user)
- [ ] Shopping list aggregation/merge
- [ ] Print/PDF export for shopping list

## Quality & Operations
- [ ] Accessibility polish (AA contrast guardrails, full keyboard coverage)
- [ ] Performance targets (fast TTI, code‑split, skeletons) verified
- [ ] CI pipeline (tests, lint, build, Docker image build)

## Notes
- Back end includes endpoints for ratings, comments, tags, ingredients, and preview (website/YouTube/Instagram). Frontend currently surfaces website/YouTube preview and displays comments; ratings/favorites and Instagram/TikTok UIs are not present yet.
- DB in README initially suggested SQLite for MVP; current setup uses PostgreSQL via Docker and .env.
