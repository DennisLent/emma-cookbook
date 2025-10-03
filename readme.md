# Cookbook — Minimum Viable Product (MVP)

A lightweight, self‑hosted recipe app with an Angular frontend and a Django backend. It’s designed for small households or groups to add, find, and cook recipes fast—no accounts, no friction—while looking clean and staying maintainable.

---

## Name brainstorm:
- cookbooked?
- Eneldo
- RecipePod
- CookHub
- Cookdict
- Cookimize / Chefimize

## 1) One‑liner & Value Prop

**“Your household’s simple, beautiful recipe box—private, fast, and easy to cook from.”**

* Local-first, self‑hosted (Docker-ready)
* Zero-auth by default (everyone at home can add/edit)
* Focused on adding recipes quickly and cooking from a distraction‑free view

## 2) Primary Users & Jobs To Be Done

* **Household member**: Save a recipe in under 2 minutes; find it later in <5 seconds; cook it step‑by‑step in the kitchen.
* **Host/admin** (implicit): Back up data; change basic appearance; export/import recipes.

## 3) Scope — Must / Should / Later

### Must‑have (M0)

* **Recipe CRUD**: title, description, prep/cook time, servings, ingredients (structured), steps, tags, images.
* **Search & Filters**: instant search (title/tags/ingredients), tag chips.
* **Cook Mode**: large typography, step‑by‑step navigation, auto‑scaled ingredients by servings.
* **Import (Paste)**: paste raw text (ingredients + steps) with a quick guided split; no remote scraping.
* **Export/Backup**: JSON export of all recipes (one-click); JSON import.
* **Simple Theming**: Light theme by default + one accent color; site title/logo.
* **Deployability**: Docker image; SQLite for MVP; file-based image storage.
* **Performance & Accessibility**: Fast initial load, keyboard friendly, WCAG AA color contrast.

### Should‑have (M1)

* **Dark theme** toggle.
* **Timers in Cook Mode** (per step).
* **Print view** for a recipe.
* **Basic validation** on recipe forms; draft autosave (localStorage).

### Later (Not in MVP)

* Web scraping from social platforms; nutrition breakdown; ratings/comments; user accounts & roles; shopping lists; calendars; advanced analytics.

## 4) Key User Stories (short)

* As a cook, I can **paste a recipe** and save it in under 2 minutes.
* As a cook, I can **browse and filter** by tags and see results instantly.
* As a cook, I can **open Cook Mode** with clear steps and readable text.
* As a host, I can **export/import** the whole collection easily.
* As a host, I can **change the accent color and title** to personalize the app.

## 5) Core Flows

1. **Add recipe** → Title, tags, paste ingredients & steps → Preview → Save.
2. **Search** → Typeahead on title/tags/ingredients → Click card → View.
3. **Cook mode** → Toggle servings → Step controls (Next/Back) → Optional timers.
4. **Backup** → Settings → Export JSON / Import JSON.

## 6) Minimal Data Model

* **Recipe** { id, title, slug, description, servings, prep_time, cook_time, tags[], image_path }
* **Ingredient** { id, recipe_id, quantity (string), unit (string), item (string), note (string?) }
* **Step** { id, recipe_id, order, text, timer_seconds? }
* **Tag** { id, name, slug }
* **SiteSettings** { title, logo_path?, accent_color, theme ("light"|"dark") }

## 7) API (MVP sketch)

* `GET /api/recipes?query=&tags=` — search & filter
* `GET /api/recipes/:id` — detail
* `POST /api/recipes` — create (JSON)
* `PUT /api/recipes/:id` — update
* `DELETE /api/recipes/:id` — delete
* `POST /api/import` — paste text → returns parsed structure
* `GET /api/export` — JSON dump
* `GET/POST /api/settings` — branding, accent color, theme
* Image upload endpoint (multipart) or base64 field on create/update

## 8) Non‑functional

* **Stack**: Angular (frontend), Django (backend), SQLite, Docker.
* **CI**: run backend tests + lint + build on PR; build Docker image on main.
* **Perf**: under 2s TTI on LAN; list/search is instant after load.
* **Accessibility**: Keyboard focus visible; form labels; color contrast AA.

## 9) Success Metrics (post‑deployment)

* Median **add‑a‑recipe** time < 2 minutes.
* **Search to open**: < 5 seconds.
* **Return visits** per week per household: > 3 (goal).
* < 1% JSON export/import errors across releases.

---

# Design Guide (Default)

Clean, calm, and legible—no flashy UI, just great spacing and readable type.

## Palette (Light as default)

* **Background**: `#F8FAFC`
* **Surface / Card**: `#FFFFFF`
* **Text (primary)**: `#0F172A`
* **Text (muted)**: `#475569`
* **Border**: `#E2E8F0`
* **Primary (accent)**: `#2563EB`  (hover: `#1D4ED8`)
* **Success**: `#16A34A`
* **Warning**: `#F59E0B`
* **Danger**: `#DC2626`
  All combinations above meet or exceed **WCAG AA** for text and controls.

### Optional Dark Mode (M1)

* **Background**: `#0B1120`
* **Surface**: `#111827`
* **Text**: `#E5E7EB`
* **Text (muted)**: `#9CA3AF`
* **Border**: `#1F2937`
* **Primary**: `#60A5FA` (hover: `#3B82F6`)

## Typography

* **Base**: 16px, line‑height 1.6
* **Font**: System stack (SF Pro / Segoe UI / Roboto / Inter fallback)
* **Scale**: h1 28–32, h2 24, h3 20, body 16, small 14
* Use **600** weight for headings, **400** for body. Avoid more than two weights.

## Spacing & Layout

* **8‑pt spacing** system (4/8/12/16/24/32)
* Max content width ~ **960–1080px**; cards in a responsive grid (min 280px)
* **Container padding**: 16–24px; card padding: 16px; generous white space

## Components

* **App Shell**: top bar with title/logo + search field; sidebar (optional) with tag filters.
* **Recipe Card**: image, title, tag chips, prep/cook times.
* **Search Bar**: full‑width, rounded, with instant filtering.
* **Tag Chips**: pill style, 28–32px height, focus outline visible.
* **Buttons**: primary (solid), secondary (outline), tertiary (text link). Min height 40px.
* **Forms**: clear labels over inputs, helper text below; avoid placeholders as labels.
* **Cook Mode**: full‑bleed surface; large text; step nav fixed bottom; quick servings +/-.

## States & Feedback

* Hover: elevate card (subtle shadow); active: press shadow; focus: 2px outline using primary.
* Empty states with a friendly illustration/line icon and “Add your first recipe.”
* Toasts for save/update/delete; confirm modal for deletes.

## Accessibility Checklist (MVP)

* Keyboard: tab order logical; Enter/Space on buttons; Esc closes modals.
* Focus: always visible; minimum 2px; high contrast to surroundings.
* Forms: label+id associations; inline error text with aria‑describedby.
* Color: meet **AA** for text (≥4.5:1) and UI components (≥3:1).

## Theming Implementation (CSS variables)

Define tokens once; Angular binds components to tokens, so changing the accent or theme updates the whole UI.

```css
:root {
  --bg: #F8FAFC;
  --surface: #FFFFFF;
  --text: #0F172A;
  --text-muted: #475569;
  --border: #E2E8F0;
  --primary: #2563EB;
  --primary-hover: #1D4ED8;
  --success: #16A34A;
  --warning: #F59E0B;
  --danger: #DC2626;
}

[data-theme="dark"] {
  --bg: #0B1120;
  --surface: #111827;
  --text: #E5E7EB;
  --text-muted: #9CA3AF;
  --border: #1F2937;
  --primary: #60A5FA;
  --primary-hover: #3B82F6;
}

body { background: var(--bg); color: var(--text); }
.card { background: var(--surface); border: 1px solid var(--border); }
.btn-primary { background: var(--primary); }
.btn-primary:hover { background: var(--primary-hover); }
```

## Screens (MVP)

1. **Home / Browse**: search on top, tag filters, grid of recipe cards.
2. **Add/Edit Recipe**: two columns on desktop (ingredients/steps), single column on mobile.
3. **Recipe Detail**: hero image, metadata, ingredients (checkable), steps.
4. **Cook Mode**: distraction‑free, big type, step nav, optional timers.
5. **Settings**: site title, accent color picker, dark mode toggle, export/import.

## Visual Style

* Neutral backgrounds, **one strong accent**.
* Soft corners (8–12px radii), subtle elevation on hover only.
* Icons: simple line icons; avoid dense iconography.

---

# Release Plan (fast path)

**v0.1**: CRUD, search, Cook Mode (basic), JSON export/import, light theme, Docker.

**v0.2**: Dark theme, timers, print view, autosave drafts, polish accessibility.

**v0.3**: Tag management UI, bulk import/export, improved paste‑parser.

---

## Nice-to‑have Delighters (post‑MVP ideas)

* Offline‑ready PWA; add‑to‑home‑screen.
* Ingredient unit converter; portion scaling memory.
* Share link within LAN.

---

**That’s the minimum lovable cut**: opinionated, simple, and pleasant, while leaving room for future growth without complicating the first experience.

---

# Frontend MVP — Final Scope (supersedes earlier scope)

A complete, frontend‑focused MVP definition covering all features you listed. The backend/APIs may be mocked during development; the UI/UX below is final for MVP.

---

## Auth Modes (JWT or Keycloak)

- Local development uses JWT by default. `run.sh` starts Django and Angular; Angular runs with `environment.ts` where `authProvider: 'jwt'`.
- Keycloak setup is supported for SSO (PKCE + silent SSO). To run the app in Keycloak mode locally: `cd cookbook-app && npm run start:keycloak`. Configure backend `.env` with `KEYCLOAK_*` (issuer, realm, client id, jwks URL).
- Production build defaults to Keycloak (`environment.prod.ts` has `authProvider: 'keycloak'`). Switch to JWT by changing `authProvider` to `'jwt'` if desired.
- Angular provides two environments: `development` (JWT) and `keycloak` (SSO). Use `npm run start:jwt` or `npm run start:keycloak` to choose.
- Backend accepts both Keycloak OIDC Bearer tokens and SimpleJWT tokens. You can keep JWT endpoints enabled for local/dev while using Keycloak in production.

You can also drive the local choice via run.sh:

- `FRONTEND_MODE=keycloak ./run.sh` → starts Angular in Keycloak mode
- `./run.sh` → starts Angular in JWT mode

## 1) Core Capabilities

* **Create Recipes**

  * **Manual form**: title, description, servings, prep/cook time, tags, hero image, ingredients (structured rows), steps (rich text + optional timer per step), source link.
  * **Paste import**: paste raw text; split into ingredients/steps with a two‑pane preview. Manual corrections always possible.
  * **From URL (websites)**: user pastes a URL; UI tries to fetch preview (title, image) via backend proxy; if parsing isn’t available, the UI embeds link preview and keeps manual fields.
  * **From YouTube / Instagram / TikTok**: paste URL → show native **embed** (player) + autofill title/thumbnail when available; user still fills ingredients & steps manually. Stores the video URL on the recipe so it’s visible in detail & Cook Mode.

* **Browse & Search**: instant filter on title, tags, and ingredients; tag chips; sort by newest/top rated.

* **Recipe Detail**: hero image/video embed, metadata, ingredients checklist, steps, ratings, comments, share button, favorite toggle.

* **Cook Mode** (prominent): full‑bleed view with large typography; step‑by‑step controls; **per‑step timers**; quick **servings +/-** that scales ingredient quantities; auto “keep screen awake” prompt.

* **Favorites, Ratings, Comments**: heart toggle, 1–5 stars (single rating per user), comment thread with timestamps and simple markdown (bold/italic, links) and basic moderation UI (delete own comment).

* **Sharing**: Web Share API when available; otherwise copy link + dedicated **WhatsApp** deep link (wa.me) prefilled with title + URL.

* **User & Auth (SSO‑first, not auto‑signed‑in)**

  * Default is **guest mode** with full browse/cook; actions that require identity (favorite, rate, comment, personal plan, customization) prompt a **Sign in** modal.
  * **Login screen**: “Continue with SSO” (provider buttons) + optional “Use one‑time magic link” (if supported later). If the user previously signed in and still has a session, they remain signed in on revisit.
  * **Profile**: name, username/handle, avatar upload, email (read‑only if SSO), **Change password** only if local password auth is enabled; hidden for pure SSO.

* **Per‑User Customization**

  * **Theme**: light/dark toggle + personal **accent color** picker.
  * **Layout**: card density (cozy/compact), recipe detail layout (two‑column on desktop vs single), Cook Mode font size (normal/large/x‑large).
  * **Accessibility prefs**: high‑contrast toggle, reduce motion.

* **Planning & Shopping List**

  * Add any recipe to **My Plan** (simple per‑user list; optional date tag).
  * **Shopping list**: aggregates ingredients from selected planned recipes; merges like items (smart string match); checklist UI with sections.
  * **Export**: print‑to‑PDF via print stylesheet + “Download PDF” (client‑side rendering).

---

## 2) Screens & UX (Final)

1. **Home / Browse**

   * Search input (debounced), tag chips row, sort dropdown.
   * Grid of recipe cards (image/video badge, title, tags, rating, favorite heart).

2. **Add Recipe**

   * Tabs: **Manual** | **Paste** | **From URL**.
   * Manual: field groups; dynamic ingredient & step rows; live preview panel.
   * Paste: two‑pane (left textarea, right preview); quick buttons “Split lines”, “Detect quantities”.
   * From URL: URL field → preview card (title/image/embed). Always shows manual fields underneath.

3. **Recipe Detail**

   * Hero (image or video embed), actions: Favorite, Share, Add to Plan.
   * Metadata chips (servings, times, tags), source link.
   * Ingredients (checkable) | Steps (numbered, timers inline) | Comments | Ratings.

4. **Cook Mode**

   * Full‑screen, sticky bottom bar with Prev/Next, timer display, and servings +/-.
   * Option to “Highlight current step” and “Keep screen awake”.

5. **Login / Profile**

   * Login modal/page with SSO buttons; guest info.
   * Profile: form for name, username, avatar; password panel shown only for local auth users.

6. **Customize**

   * Live preview: palette swatches, light/dark toggle, accent color picker (with contrast guardrails), layout density, Cook Mode text size.

7. **Plan & Shopping List**

   * Plan: list of saved recipes (optional date labels). Bulk select → “Create shopping list”.
   * Shopping list: grouped by recipe + merged list; checkbox UI; actions: “Copy”, “Print”, “Download PDF”.

---

## 3) Responsive Design

* **Breakpoints**: 0–599 (mobile), 600–1023 (tablet), 1024+ (desktop).
* **Home**: mobile single‑column list; tablet/desktop grid (min card width ~280px) with masonry fallback.
* **Add Recipe**: mobile stacked sections; tablet split (form over preview); desktop two‑pane (form | live preview) with sticky form sidebar.
* **Recipe Detail**: mobile single column; desktop two‑column (ingredients sidebar | steps main). Comments below on both.
* **Cook Mode**: mobile bottom stepper; desktop wide centered content with generous margins.
* **Customize/Profile**: single column on mobile; two columns on desktop (controls | live preview).
* **Plan/List**: responsive table/cards; sticky action bar on mobile for “Create shopping list”.

---

## 4) Component Library & Interactions

* Form inputs with floating labels; accessible helper/error text.
* Tag chips (filterable, selectable); rating stars (ARIA slider pattern); favorite heart (toggle button with aria‑pressed).
* Share modal uses **Web Share API** first; fallback shows copy field + **WhatsApp** button (wa.me deep link).
* Timers: step row hosts a start/pause button; when active, shows countdown and fires a toast at 0.

---

## 5) Frontend State & Types (sketch)

```ts
type User = {
  id: string; name: string; username: string; email?: string;
  avatarUrl?: string; authProvider?: 'sso' | 'local';
  prefs: { theme: 'light'|'dark'; accent: string; density: 'cozy'|'compact'; cookFont: 'n'|'l'|'xl'; highContrast?: boolean; reduceMotion?: boolean; };
};

type Ingredient = { qty?: string; unit?: string; item: string; note?: string };

type Step = { order: number; text: string; timerSec?: number };

type Recipe = {
  id: string; title: string; description?: string; servings: number;
  prepMin?: number; cookMin?: number; tags: string[];
  imageUrl?: string; videoUrl?: string; sourceUrl?: string;
  ingredients: Ingredient[]; steps: Step[];
  ratingAvg?: number; ratingCount?: number; isFavorite?: boolean;
};
```

---

## 6) Accessibility & Performance (FE)

* **AA contrast** enforced (guardrails on accent selection); visible focus rings; semantic HTML with ARIA for custom controls.
* Keyboard: full tab order; Esc closes modals; Space/Enter activate buttons; arrow keys for star rating.
* Lazy‑load images/embeds; code‑split routes; cache search results in memory; skeleton loaders.

---

## 7) Theming Tokens (Per‑User)

* In addition to the global tokens already defined, persist **per‑user overrides** in local storage (and sync to backend when signed in): `--primary`, `--density`, `--cook-font-scale`, `--contrast-mode`.
* Guardrails: do not allow accent choices that drop below 3:1 contrast for UI elements or 4.5:1 for text.

---

## 8) WhatsApp & Sharing Details

* **Primary action** on Recipe Detail: Share →

  * If `navigator.share` available: `{title, text, url}`.
  * Else: **Copy Link** + button to `https://wa.me/?text=${encode(title + ' ' + url)}`.
* Include UTM/source tag if desired (configurable).

---

## 9) PDF Shopping List (Client‑side)

* Print stylesheet for clean A4 layout (title, date, grouped items with checkboxes).
* “Download PDF” uses client‑side rendering (e.g., print to PDF or a lightweight generator) without server round‑trip.

---

## 10) Default Visuals (carry‑over)

* Keep the provided palette and typography. For embeds (YT/IG/TikTok), use 16:9 containers with responsive iframes; rounded corners to match cards; muted until interacted with.
