# Design Tokens and Style Guide

These tokens define the visual system used across the app. Use the CSS variables in `src/theme.scss` wherever possible so components stay consistent.

## Colors
- `--color-bg`: App background
- `--color-surface`: Card/surfaces
- `--color-text`: Primary text
- `--color-muted`: Secondary text
- `--color-border`: Borders/dividers
- `--color-primary` / `--color-primary-hover`: Accent color
- `--color-success`, `--color-warning`, `--color-danger`

## Typography
- Base font family: `Inter, Roboto, Helvetica Neue, Arial, sans-serif`
- Line height: `--lh-base: 1.6`
- Weights: `--fw-regular: 400`, `--fw-semibold: 600`
- Sizes:
  - `--fs-xs: 12px`
  - `--fs-sm: 14px`
  - `--fs-md: 16px` (body)
  - `--fs-lg: 18px` (h3)
  - `--fs-xl: 24px` (h2)
  - `--fs-xxl: 32px` (h1)

Headings are normalized in `src/styles.scss` (h1/h2/h3) using these tokens. Use utility classes `.text-sm` and `.text-muted` when needed.

## Spacing (8-pt with half steps)
- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-5: 24px`
- `--space-6: 32px`

## Radii & Shadows
- `--radius-sm: 8px`
- `--radius-md: 12px` (default card)
- `--radius-lg: 16px` (large surfaces)
- `--radius-pill: 999px` (chips/pills)
- Shadows: `--shadow-sm`, `--shadow-md`

## Focus
- `--focus-ring`: shared focus ring (applies via `*:focus-visible` in styles.scss)

## Usage
- Cards and interactive surfaces: use `.card`
- Containers: wrap pages in `.container`
- Search bar, chips, buttons, inputs: rely on these tokens for padding, radii, and colors

If new components are added, prefer these tokens before introducing new values.
