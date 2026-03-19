# Target Database Schema

## Goal

Keep the database limited to durable application data.

Do store:

- users and profile/preferences
- recipes
- ingredients and steps belonging to recipes
- tags
- recipe side/sauce suggestions
- ratings
- comments
- collections

Do not store:

- generated recipe suggestion results
- generated meal-plan runs
- meal-plan filters
- shopping lists
- cook-mode session state
- share links

Those should be backend functions or transient frontend state.

Important clarification:

- curated side and sauce suggestions attached to a recipe are durable recipe data and should be stored
- generated "what should I cook next?" recommendation results should not be stored

## Design Decisions

### Authentication

- Store password hashes only.
- Login returns a JWT.
- The frontend can persist the JWT client-side so the user does not need to log in repeatedly.
- JWTs are auth/session concerns, not database schema tables by default.

### Recipe required fields

The frontend only truly requires:

- `title`
- `ingredients`
- `steps`

Important clarification:

- `title` belongs on `recipes`
- `ingredients` belong in `recipe_ingredients`
- `steps` belong in `recipe_steps`

So they are part of the recipe model, but not all in the same physical table.

### Ingredient deduplication

We should not treat every literal ingredient string as a brand-new ingredient identity.

Examples:

- `salt`
- `kosher salt`
- `sea salt`
- `coarse salt`

These should be modeled as recipe ingredient text linked to a canonical ingredient when possible.

That gives us:

- a clean, deduplicated ingredient catalog for search, analytics, and matching
- freedom to preserve the exact wording the recipe author entered

## Minimal Persistent Schema

### `users`

Core account record.

Columns:

- `id` UUID primary key
- `username` varchar unique not null
- `email` varchar unique nullable
- `display_name` varchar not null
- `password_hash` varchar not null
- `avatar_url` text nullable
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

### `user_preferences`

One row per user.

Columns:

- `user_id` UUID primary key references `users(id)` on delete cascade
- `theme` varchar not null
- `color_scheme` varchar not null
- `density` varchar not null
- `cook_font_size` varchar not null
- `high_contrast` boolean not null default false
- `reduce_motion` boolean not null default false
- `updated_at` timestamptz not null

Expected values:

- `theme`: `light`, `dark`
- `density`: `cozy`, `compact`
- `cook_font_size`: `normal`, `large`, `x-large`

### `recipes`

Top-level recipe record.

Columns:

- `id` UUID primary key
- `author_id` UUID nullable references `users(id)` on delete set null
- `title` varchar not null
- `description` text nullable
- `servings` integer nullable
- `prep_minutes` integer nullable
- `cook_minutes` integer nullable
- `image_url` text nullable
- `is_side` boolean not null default false
- `is_sauce` boolean not null default false
- `source_url` text nullable
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Constraints:

- `title` required

Notes:

- `servings`, `prep_minutes`, `cook_minutes`, `description`, and `image_url` should stay optional.
- This matches your point that only a few recipe fields are actually mandatory.

### `recipe_suggested_sides`

Join table for curated side-dish suggestions.

Columns:

- `recipe_id` UUID references `recipes(id)` on delete cascade
- `side_recipe_id` UUID references `recipes(id)` on delete cascade

Primary key:

- (`recipe_id`, `side_recipe_id`)

Rules:

- `recipe_id` should normally reference a main recipe
- `side_recipe_id` must reference a recipe where `is_side = true`
- a recipe cannot suggest itself

### `recipe_suggested_sauces`

Join table for curated sauce or condiment suggestions.

Columns:

- `recipe_id` UUID references `recipes(id)` on delete cascade
- `sauce_recipe_id` UUID references `recipes(id)` on delete cascade

Primary key:

- (`recipe_id`, `sauce_recipe_id`)

Rules:

- `recipe_id` should normally reference a main recipe
- `sauce_recipe_id` must reference a recipe where `is_sauce = true`
- a recipe cannot suggest itself

### `tags`

Normalized tag dictionary.

Columns:

- `id` UUID primary key
- `name` varchar unique not null
- `slug` varchar unique not null

### `recipe_tags`

Join table.

Columns:

- `recipe_id` UUID references `recipes(id)` on delete cascade
- `tag_id` UUID references `tags(id)` on delete cascade

Primary key:

- (`recipe_id`, `tag_id`)

## Ingredient Model

### `ingredients`

Canonical ingredient catalog.

Columns:

- `id` UUID primary key
- `canonical_name` varchar unique not null
- `slug` varchar unique not null
- `parent_ingredient_id` UUID nullable references `ingredients(id)` on delete set null
- `created_at` timestamptz not null

How to use it:

- `salt` can be the canonical ingredient
- `sea salt`, `kosher salt`, `coarse salt` can either:
  - map directly to canonical `salt`, or
  - exist as child ingredients under `salt` if we want that nuance later

Practical rule:

- The database should support both exact ingredient wording and a normalized ingredient identity.
- Search and ingredient matching should primarily use the canonical identity.

### `ingredient_aliases`

Maps freeform ingredient names to a canonical ingredient.

Columns:

- `id` UUID primary key
- `ingredient_id` UUID not null references `ingredients(id)` on delete cascade
- `alias_name` varchar unique not null
- `normalized_alias` varchar unique not null

Examples:

- alias `kosher salt` -> ingredient `salt`
- alias `sea salt` -> ingredient `salt`
- alias `scallions` -> ingredient `green onion`

### `recipe_ingredients`

Actual ingredients used in a recipe, preserving recipe wording.

Columns:

- `id` UUID primary key
- `recipe_id` UUID not null references `recipes(id)` on delete cascade
- `position` integer not null
- `quantity_text` varchar nullable
- `unit_text` varchar nullable
- `display_name` varchar not null
- `note` varchar nullable
- `ingredient_id` UUID nullable references `ingredients(id)` on delete set null

Constraints:

- at least one `recipe_ingredients` row must exist for a valid recipe

Notes:

- `display_name` stores exactly what the recipe author entered.
- `ingredient_id` links that entry to the canonical ingredient catalog when we can resolve it.
- This keeps the UX flexible while preventing uncontrolled ingredient duplication.

## Step Model

### `recipe_steps`

Ordered instructions for a recipe.

Columns:

- `id` UUID primary key
- `recipe_id` UUID not null references `recipes(id)` on delete cascade
- `position` integer not null
- `instruction_text` text not null
- `timer_seconds` integer nullable
- `image_url` text nullable

Constraints:

- at least one `recipe_steps` row must exist for a valid recipe

### `recipe_step_ingredients`

Optional mapping between steps and recipe ingredients.

Columns:

- `step_id` UUID references `recipe_steps(id)` on delete cascade
- `recipe_ingredient_id` UUID references `recipe_ingredients(id)` on delete cascade

Primary key:

- (`step_id`, `recipe_ingredient_id`)

## Social Data

### Ratings

Ratings are durable and worth storing.

`recipe_ratings`:

- `user_id` UUID references `users(id)` on delete cascade
- `recipe_id` UUID references `recipes(id)` on delete cascade
- `rating` smallint not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Primary key:

- (`user_id`, `recipe_id`)

Constraint:

- `rating` between 1 and 5

### Comments

Comments are durable and worth storing.

`recipe_comments`:

- `id` UUID primary key
- `recipe_id` UUID not null references `recipes(id)` on delete cascade
- `user_id` UUID not null references `users(id)` on delete cascade
- `body` text not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

## Collections

### `collections`

- `id` UUID primary key
- `owner_id` UUID not null references `users(id)` on delete cascade
- `name` varchar not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

### `collection_recipes`

- `collection_id` UUID references `collections(id)` on delete cascade
- `recipe_id` UUID references `recipes(id)` on delete cascade

Primary key:

- (`collection_id`, `recipe_id`)

## Favorites

Per your preference, favorites do not need a dedicated join table in the first pass.

Simplest option:

- add a `favorite_recipe_ids` field to the user profile representation at the application layer

Database options:

1. Keep favorites outside the relational schema for now if they are treated as lightweight user metadata.
2. If we later need queryability or integrity, promote them to a join table.

Recommendation for this phase:

- Do not add a `recipe_favorites` table yet.
- Treat favorites as user-owned metadata attached to the user record or user profile storage.

## Not In Database

These should be functions, not persisted schema:

- `recipe_suggestions`
  - backend endpoint/function takes recipe context and returns candidate sides/sauces
- meal plan generation
  - backend endpoint/function takes days, meal types, and frontend enum filters
- meal plan entries
  - return generated results to the frontend without persisting them

## Backend Validation Rules

The backend should enforce:

- user passwords are hashed
- recipe `title` is required
- recipe must have at least 1 ingredient
- recipe must have at least 1 step
- rating range is 1..5
- ingredient aliases normalize to a canonical ingredient where possible

## Recommended First Implementation Order

1. `users`
2. `user_preferences`
3. `recipes`
4. `tags` and `recipe_tags`
5. `ingredients`, `ingredient_aliases`, `recipe_ingredients`
6. `recipe_steps` and `recipe_step_ingredients`
7. `recipe_ratings`
8. `recipe_comments`
9. `collections` and `collection_recipes`

## Summary

The simplified target schema is:

- users
- user_preferences
- recipes
- tags
- recipe_tags
- ingredients
- ingredient_aliases
- recipe_ingredients
- recipe_steps
- recipe_step_ingredients
- recipe_ratings
- recipe_comments
- collections
- collection_recipes

Everything else should stay out of the database until it proves it needs persistence.
