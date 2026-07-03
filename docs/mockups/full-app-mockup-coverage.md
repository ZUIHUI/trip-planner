# Trip Planner full app mockup coverage

Date: 2026-07-02
Figma file: https://www.figma.com/design/3RJXKuNurrRgIJntTjNiFd
Local preview: `docs/mockups/full-app-market-ui-mockup.html`
Figma replay script: `docs/mockups/full-app-market-ui-figma-script.ascii.js`
Detailed script draft: `docs/mockups/full-app-market-ui-figma-script.js`

## Current Figma status

The Figma MCP connection is available, but the current Starter plan has reached the MCP tool-call limit. The next Figma write should use the replay script above once the quota resets or the plan is upgraded.

Latest retry: 2026-07-02 15:30 Asia/Taipei, `use_figma` still returned the Starter plan MCP tool-call limit message before creating any nodes.

## Local verification

- Figma replay script syntax check: passed with bundled Codex Node.
- ASCII-safe one-shot replay script syntax check: passed with bundled Codex Node.
- Local HTML structure check: passed, with 6 mobile phone frames plus desktop, module and overlay sections detected.
- Browser screenshot check: not completed because the bundled Playwright package is missing `playwright-core` in this environment.

Existing Figma frames already created:

- `Desktop / Trip Detail Command Center`
- `Mobile / Trip Detail Command Center`
- `Market-inspired v2 / Mobile Today Map`
- `Market-inspired v2 / Mobile Ideas`
- `Market-inspired v2 / Desktop Map Command Center`
- `Notes / Design direction`

## Market references

The v3 direction borrows product patterns, not branding:

- Wanderlog: map and itinerary in one view, group trip collaboration, expenses, places, AI and checklists.
- Tripsy: all trip details in one place, reservation/email import mental model, flight alerts, sharing permissions, expenses and documents.
- Polarsteps: trip overview on a map, step-by-step journey panels, travel memory/stats, privacy controls.

## Design direction

- Map-first travel surface: the current day and desktop experience should make route geography visible before secondary controls.
- Modular but calm: many functions live in the app, so the design uses compact cards, chips, status rails and bottom navigation instead of oversized landing-page sections.
- Trip-operation tone: it should feel like a travel command center during the trip, and like a friendly planning workspace before the trip.
- Mobile first: primary use happens on the road; desktop becomes the wide planning dashboard.
- Clear system states: read-only, sync conflict, save state, GPS, install prompt, AI loading and collaboration presence all need visible slots.

## Coverage matrix

| Area | Current code entry | Mockup frame |
| --- | --- | --- |
| Login/auth | `src/pages/LoginPage.jsx` | `Login / welcome auth` |
| Trip list/dashboard | `src/pages/TripListPage.jsx` | `Trip Home / create join` |
| Create trip | `TripListPage` action mode | `Trip Home / create join` |
| Join invite | `TripListPage` invite code | `Trip Home / create join` |
| Today map-first | `TodayTab` | `Today / map first` |
| Summary overview | `SummaryTab` | `Summary / overview` |
| Day itinerary | `ItineraryTab` | `Itinerary / day timeline` |
| Route panel | `ItineraryRoutePanel` | `Itinerary / day timeline` |
| Ideas/place pool | `IdeasTab`, `PlacePoolCard` | `Ideas / place pool` |
| Logistics | `LogisticsTab` | `Logistics / stay flights` |
| Pre-trip checklist | `PreTripTab` | `PreTrip / checklist` |
| Packing checklist | `PackingTab` | `Packing / categories` |
| Expenses | `ExpensesTab` | `Expenses / budget` |
| Shopping | `ShoppingTab` | `Shopping / list` |
| More hub | `MoreTab` home | `More / hub` |
| Companions/share | `MoreTab` companions, `ShareCollaborationCard` | `Companions / share` |
| Settings | `SettingsPanel` | `Settings / bottom sheet` |
| Event detail/edit | `EventDetailView`, `EditEventForm`, `Modal` | `Event / detail editor` |
| Handbook/PDF | `TripHandbookModal` | `Handbook / PDF modal` |
| AI recommendations | `TripAiRecommendationPanel` | `AI / day plan` |
| Install/GPS/notifications | `InstallAppPrompt`, `TripNotificationCard`, GPS status | `Install + GPS + sync states` |
| Desktop planning | `TripDetailPage` wide nav + tabs | `Desktop / command center v3` |

## Figma replay notes

When Figma MCP quota is available again:

1. Load `figma-use` and `figma-generate-design`.
2. Call `use_figma` on file key `3RJXKuNurrRgIJntTjNiFd`.
3. Paste the contents of `docs/mockups/full-app-market-ui-figma-script.ascii.js`.
4. Pass `skillNames: "figma-use,figma-generate-design"`.
5. Screenshot at least:
   - `Full App Coverage v3 / board`
   - `Today / map first`
   - `Desktop / command center v3`
   - `AI / day plan`

## Open gap

Figma write and screenshot verification are pending because of the MCP quota. The local HTML preview and replay script are the current working mockup artifacts.
