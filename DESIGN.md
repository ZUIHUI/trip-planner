# Trip Planner design system

This document is the source of truth for Trip Planner UI. It describes the
actual planning product: story-led trip entry, dense itinerary workspaces,
shared travel context, and responsive editing. It does not define a marketing,
documentation, or pricing site.

## Product character

Trip Planner should feel like a calm travel desk: cinematic when a destination
photo is available, precise when the user is making plans. **Ocean Pearl** is
the default visual language, with complete alternative travel atmospheres.

- Clear ocean blue anchors navigation, selected states, and the primary action.
- Pearl surfaces keep long planning sessions readable.
- Sea glass marks confirmation, progress, and supportive highlights.
- Ocean mist adds atmosphere without competing with the trip content.
- Photos belong to covers, overview heroes, sharing, and destination context.
  Editing surfaces stay flat and legible.

## Source tokens

The executable source is `src/styles/tokens.css`. Components must consume
semantic `--tp-*` variables. Existing `--story-*`, `--v4-*`, RGB utility, and
atlas variables are compatibility aliases only; do not add new hard-coded
palette values to those families.

### Color

| Token | Light | Role |
|---|---:|---|
| `--tp-primary` | `#277997` | Primary action, active navigation |
| `--tp-primary-strong` | `#155b78` | Pressed primary action, strong emphasis |
| `--tp-sea-glass` | `#79cbd5` | Completion and supportive accent |
| `--tp-sea-glass-deep` | `#2e7384` | Focus ring and accessible accent text |
| `--tp-sea-glass-soft` | `#dff4f6` | Success and selected secondary surface |
| `--tp-ocean-mist` | `#8bd4ee` | Restrained atmospheric accent |
| `--tp-canvas` | `#f8fcfe` | App background and primary cards |
| `--tp-surface` | `#eaf7fb` | Grouped planning surface |
| `--tp-surface-soft` | `#f4fbfd` | Quiet secondary surface |
| `--tp-ink` | `#173f52` | Primary text |
| `--tp-body` | `#3d6474` | Body copy and secondary text |
| `--tp-muted` | `#567786` | Metadata and tertiary controls |
| `--tp-border` | `#c5e0ea` | Main hairline |
| `--tp-border-soft` | `#dcecf2` | Quiet divider |
| `--tp-warning` | `#945f30` | Caution only |
| `--tp-error` | `#9f4f39` | Destructive and validation states |
| `--tp-on-dark` | `#ffffff` | Text on photos and dark surfaces |
| `--tp-on-dark-muted` | `#dceff6` | Secondary text on photos/dark surfaces |

Dark mode keeps the same semantic roles. Canvas becomes deep ocean, surfaces
step upward in lightness, and borders remain visible without turning bright.
Sea glass remains an accent; it must not become body text or a large default
surface.

### Complete visual themes

Every selectable theme owns the complete visual hierarchy: primary actions,
active navigation, hero and main cards, cover-photo scrim, decorative route
art, feature icons, planning surfaces, map previews, borders, focus rings, and
elevation. A theme must not leave another theme's signature accent on these
surfaces. Warning, error, and success states may remain semantically distinct.
The main journey card uses the original layered theme gradient: a restrained
corner glow over a three-stop diagonal blend generated from the active theme.
Photo covers may retain a scrim when needed for readable text.

**Ocean Pearl** (`light`) uses airy sky-blue heroes, clear-water route accents,
pearl-white planning surfaces, and a cool ocean photo scrim. **Deep Sea Night** (`dark`)
uses the same roles at low luminance with luminous sea-glass actions and deep
teal work surfaces. Its page sheets, cards, forms, dialogs, inputs, and bottom
docks must use `--tp-paper`, `--tp-surface`, or `--tp-surface-dark`; plain white
surfaces are reserved for photo-overlay text, small decorative details, and print.

#### Soft Pink

Users may choose **Soft Pink** (`soft-pink`) as a light appearance alongside
Ocean Pearl and dark mode. It keeps the same semantic roles and accessibility
rules rather than introducing component-specific colors.

- Candy rose `#e47fa5` replaces the former deep berry for primary actions.
- Strawberry candy pink `#f1a3be`, `#e076a1`, and `#c95785` forms the
  main-card gradient with warm-white text and a soft readability shadow.
- Strawberry ink `#a33f64` is reserved for focus and accessible accent text.
- Mist pink `#fde4ed` marks selected and supportive surfaces.
- Blush canvas `#fff9fc` and paper `#fffdfd` keep planning screens bright.
- Neutral charcoal ink `#342e31` is limited to pale page surfaces; pink hero
  surfaces use warm-white text and darker translucent glass chips.
- Error and warning colors remain semantically distinct from the theme accent.
- The choice is stored locally and applied before the React screen renders.
- The full visual hierarchy follows the chosen theme. Soft Pink keeps cover
  photography but uses a rose photo scrim, candy-pink hero treatments, and
  blush workspace atmosphere; destination presets must not reintroduce Ocean colors.

#### Sunny Yellow

Users may choose **Sunny Yellow** (`sunny-yellow`) for a clear, bright travel
desk inspired by a highlighter accent on a clean editorial page.

- Warm off-white `#f7f6f2` is the app canvas and pure white is the card color.
- Bright yellow `#ffd51e` fills primary actions, selected navigation, hero and
  main cards; these surfaces use near-black text rather than white text.
- Near-black `#0a0a0a` provides the main hierarchy and a restrained deep gold
  `#725600` is reserved for focus and accessible small accent text.
- Lemon cream and pale yellow shape grouped and supportive surfaces without
  replacing the white-card structure.
- Cover photography keeps white overlaid text on a neutral dark scrim, while
  route art, map previews, feature icons, buttons, focus, and workspace
  atmosphere follow the yellow palette.

Theme choices are exposed as explicit labeled buttons. Selection uses
`aria-pressed`, a check icon, border, and background change rather than color
alone. The executable palettes remain in `src/styles/tokens.css` under the
corresponding `data-theme` value.

### Typography

Use the shared `--tp-font-editorial` family throughout the product. The Vite
entry imports the self-hosted `Noto Serif TC Variable` web font from Fontsource,
followed by `Noto Serif TC`, `Source Han Serif TC`, `Songti TC`, `PMingLiU`,
`MingLiU`, then the system serif fallback. This is the same refined Ming-style
family used by destination titles such as Osaka. Body copy, navigation, dates,
buttons, and form controls all consume the same token so typography remains
coherent across themes and devices.

| Token | Size / line height | Use |
|---|---|---|
| `--tp-text-display` | `clamp(32px, 5vw, 56px) / 1.08` | Photo hero title only |
| `--tp-text-h1` | `28px / 1.2` | Trip/page title |
| `--tp-text-h2` | `22px / 1.3` | Workspace section title |
| `--tp-text-h3` | `18px / 1.4` | Card title |
| `--tp-text-body` | `16px / 1.5` | Primary planning copy |
| `--tp-text-small` | `14px / 1.5` | Desktop navigation and secondary copy |
| `--tp-text-caption` | `13px / 1.4` | Metadata and helper text |
| `--tp-text-micro` | `11px / 1.4` | Small uppercase section labels |

Use weights 400, 500, 600, and 700. Headings use 700 for a clear editorial
hierarchy; primary action and active navigation labels use 600 or 500. Do not
shrink planning body copy below 16px.

Letter spacing is subtle but consistent across the complete product. Body copy
uses `--tp-tracking-body` (`0.018em`), headings use `--tp-tracking-heading`
(`0.035em`), buttons and form controls use `--tp-tracking-control` (`0.025em`),
and form labels use `--tp-tracking-label` (`0.06em`). Display titles and short
uppercase English accents may use a wider component-specific value when the
extra spacing is part of their visual role.

### Spacing, radius, and elevation

- Base spacing unit: 4px. Main sequence: 4, 8, 12, 16, 20, 24, 32, 40.
- Compact controls: 8px radius. Cards: 12px. Feature/hero panels: 16px.
- Pills and circular controls: `9999px`.
- Planning cards are predominantly flat: hairline border plus no shadow.
- Loading states use a flat themed surface without an outer border; the compact
  loading icon may retain a solid hairline for definition.
- Floating rails and photo heroes may use the documented card/hero shadows.
- Interactive controls have a 40px desktop minimum and 44px touch minimum.
- Icon framing is optically consistent: a 40x40px semantic background board
  carries a 20px glyph. Irregular glyphs align by the board, not their paths.
- Mobile cover-to-sheet joins use a 28px radius. Cards remain 12px and compact
  controls remain 8px so the hierarchy is visible without oversized rounding.

## Layout system

### Mobile: below 768px

- One content column.
- The trip cover and one four-item bottom navigation provide orientation. Do
  not repeat the same four tabs below the cover.
- Trip Library and Trip Workspace reveal the shared compact title bar only
  after the observed hero leaves the viewport. It contains the page/trip title,
  current section context, and the relevant account, back, or settings action.
- The itinerary has one horizontal date strip. Do not add a second next-day or
  previous-day mechanism beside it.
- A single floating add action is the dominant creation entry.
- Icon controls, pills, and inputs meet a 44x44px target where practical.

### Tablet: 768px to 1179px

- One main timeline column with wider gutters.
- Date selection stays horizontal.
- Route and unfinished-task context follows the timeline in collapsible panels.
- Do not squeeze the desktop three-rail workspace into this range.

### Desktop: 1180px and above

- Use a planning workspace with optional day rail, central content, and context
  rail. Itinerary keeps the horizontal date strip; other sections may use the
  day rail when it adds information.
- The context rail summarizes route, readiness, and unfinished tasks. It must
  not duplicate a full interactive timeline.
- Exactly one visually dominant add action is shown at a time.
- Desktop navigation labels use the 14px body-small scale.

Maximum readable workspace width is 1440px. Verify 320, 390, 768, 1180, and
1440px rather than assuming the named breakpoints cover the boundary states.

## Shared planning components

### Navigation

- `TRIP_NAV_ITEMS` is the single source for item labels, icons, order, desktop
  rail groups, and the mobile More-child mapping.
- Mobile bottom navigation and the desktop workspace rail use a shared sliding
  selection surface. Labels and icons move at most 1px for press feedback; do
  not scale the active item.
- Trip Library and Trip Workspace mobile docks use the same theme-primary
  selected fill, high-contrast text, radius, and restrained elevation.
- Changing a workspace section returns the main content to its start with the
  compact-header offset applied. Content enters over 160–200ms with 6–8px of
  vertical movement.
- At 1180px and above, the desktop rail is the only persistent workspace
  navigation. The mobile bottom dock and its spacer are not rendered visually.

### Journey overview

- Prioritize the day hero, important reminders, flights, timeline, and route so
  travelers reach the active itinerary without crossing duplicate summaries.
- Show readiness editing prompts in the itinerary workspace only when data is
  incomplete. A fully ready day needs no success banner. The journey overview
  must not repeat a readiness banner or a full daily-status card.
- Desktop may retain compact readiness context in the right rail; it must remain
  read-mostly and must not recreate the removed center-column status surface.

### Date strip

- Render user-facing dates as `10/25 Wed.` when a date is available.
- Never substitute generic `Day N` or `第 N 天` for a known date.
- Preserve trip order; do not independently re-sort days in each screen.
- Use `aria-pressed` for the selected day and provide a readable label.

### Timeline and event cards

- Preserve the saved itinerary order. Time is supporting context, not a sorting
  instruction unless the user explicitly requests sorting.
- Time, title, place, transport, cost, and ownership should be visually
  scannable without opening the card.
- Editing controls remain keyboard reachable and have visible focus.
- Empty states provide one clear next action.

### Route panel

- Route stop order must come from the same shared daily summary used by the
  timeline and context rail.
- Embedded preview and external navigation must share the same origin, stops,
  and travel mode.
- A missing Google Maps Embed key must fall back to the cloud-geocoded
  OpenStreetMap route preview with visible attribution; do not replace the map
  with a permanent configuration-error card.
- A route panel summarizes transportation; it does not duplicate event editing.

### Task summary

- Show unfinished tasks first and cap compact summaries.
- Completion uses sea glass and explicit text/icon state; never color alone.
- The right rail and tablet panel consume the same shared task data.

### Context rail

- Summarize the selected day: next event, route, readiness, reminders,
  unfinished tasks, and cost by currency.
- It is read-mostly context. Primary editing happens in the center column.
- Links and icon-only controls use descriptive accessible labels.

### Buttons and inputs

- Primary button: deep teal, white text, pill shape.
- Secondary button: pearl surface, ink text, hairline border, pill shape.
- Every non-semantic primary action and solid selected navigation state follows
  `--tp-primary`; never use `--tp-ink` as its fill. Soft Pink therefore renders
  dusty berry controls, Ocean Pearl renders deep teal controls, and dark mode
  renders sea-glass controls with the matching `--tp-on-primary` text.
- Secondary and ghost controls follow the active theme surface, border, and
  primary text tokens. Photo-overlay controls may stay white or dark when that
  is required for contrast.
- Destructive actions use the error token and explicit wording.
- Disabled controls must remain readable and communicate disabled state beyond
  opacity when needed.
- Inputs always have a programmatic label. Errors use `aria-invalid` and an
  associated message.

## Photos and overlays

Text over photography must use `--tp-on-dark` or `--tp-on-dark-muted` and the
shared atmospheric scrim `--tp-photo-scrim`. The scrim combines the active
theme's dark hue with three opacity stops and a lower-edge readability gradient;
it never uses pure black. A plain translucent rectangle is not sufficient for
unpredictable travel photos.

Compact context chips over a trip cover use a translucent canvas surface with
theme-primary text, medium weight, and an explicit border. Prefer useful trip
context such as day count, itinerary count, and destination weather; do not use
self-presence status such as `你在線` as permanent hero content. Temporary save
status may replace the weather chip while a write is in progress.

The photo itself keeps its aspect ratio and uses `object-fit: cover`. When an
image is missing, use the active theme's semantic hero gradient; Ocean Pearl
remains the default. Never place ordinary planning forms directly over
photography.

## Interaction and accessibility

- Use semantic buttons and links; do not make clickable `div` elements.
- Every icon-only control has an `aria-label` or screen-reader text.
- Keyboard focus uses a visible 3px `--tp-focus-ring` with 2px offset.
- Preserve logical tab order and return focus when dialogs close.
- Selected state uses both `aria-pressed`/`aria-selected` and a visible change.
- Normal text targets WCAG AA 4.5:1; large text targets 3:1.
- Dynamic save/error feedback uses a polite or assertive live region as
  appropriate.
- Respect `prefers-reduced-motion`; decorative animation becomes effectively
  instant while state changes remain understandable.
- The interface must remain usable at 200% browser zoom.

## Motion

- Micro transitions: 150ms ease.
- Panel and section state changes: 160–200ms ease with no more than 8px travel.
- Motion supports continuity only; it never delays data entry.
- Do not add scale-on-hover or perpetual decorative motion to planning cards.

## Semantic module tones

- Modules accept only `neutral`, `primary`, `info`, `success`, `warning`, or
  `danger`. Decorative names such as teal, sky, sand, coral, or soft are legacy
  aliases and must not be used by active components.
- A tone changes the icon board, hairline, small label, or progress treatment.
  Main titles and body copy remain `--tp-ink`, `--tp-body`, and `--tp-muted`.
- Every theme supplies low-chroma semantic tone surfaces. Success, warning, and
  danger remain recognizable and never inherit a meaning from the theme accent.

## Do

- Read this file before changing frontend presentation.
- Use semantic `--tp-*` tokens and shared components.
- Keep one data derivation path for timeline, route, readiness, tasks, and cost.
- Keep dense planning surfaces flat, calm, and highly readable.
- Test keyboard focus, dark mode, reduced motion, and breakpoint boundaries.

## Do not

- Do not add a new palette generation or redefine active colors in a component.
- Do not duplicate date selection, route calculation, or a dominant add action.
- Do not use sea glass as body text or a large page background.
- Do not hide essential actions behind hover-only interactions.
- Do not claim visual completion from a production build alone.

## Release checks

Before a frontend release:

1. Run JavaScript syntax and production-debug checks.
2. Run the repository test suite.
3. Run a production build and compare CSS/page chunk sizes.
4. Inspect 320, 390, 768, 1180, and 1440px in light and dark mode where the
   changed surface is visible.
5. Exercise keyboard focus and the primary creation/editing path.
6. Confirm no duplicate primary action or date-navigation mechanism appears.
