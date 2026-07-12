# CLAUDE.md

Guidance for working in this repository. Read this before making changes.

## Project

**Polish Me Up** — a mobile-first booking + light POS web app for a nail/manicure
business (Malaysia-based). Two audiences:

- **Customers** — browse packages, pick walk-in or mobile (home-visit) service,
  pin an address, choose a time slot, book, and track/cancel their bookings.
- **Manicurists** — a back-office "studio": dashboard KPIs, manage bookings &
  status, customers, items/services, manual sales, availability schedule,
  profile, and create other manicurist accounts.

Production: https://polish-me-up.vercel.app (Vercel, auto-deploy on push to `master`).

## Commands

```bash
npm run dev      # next dev — http://localhost:3000
npm run build    # next build (Sentry-wrapped)
npm run start    # serve production build
npm run lint     # eslint (flat config, eslint-config-next)
npx tsc --noEmit # typecheck — run this before declaring work done
```

There is **no test runner**. Verification is manual via `TESTING.md` (a full
per-feature QA checklist that maps 1:1 to source files — keep it in sync when you
change behavior) plus `npm run build` + `npx tsc --noEmit`.

## Tech stack

- **Next.js 16** (App Router, React 19, RSC) + **TypeScript** (strict).
- **Supabase** — Postgres + Auth + Storage, accessed via PostgREST. No ORM, no raw SQL in app code.
- **Tailwind CSS v4** (config-less, via `@tailwindcss/postcss`; tokens live in `app/globals.css`).
- **shadcn/ui** (style `radix-nova`, `radix-ui` primitives, `lucide-react` icons) — components in `components/ui/`.
- **react-hook-form** + **zod** (`@hookform/resolvers/zod`) for all forms.
- **zustand** (with `persist`) for the cart — the only global client state.
- **@tanstack/react-query** is installed but used sparingly; most data is fetched in RSCs.
- **Mapbox GL** + **Google Maps/Places** for the address picker (mobile bookings).
- **Upstash Redis** (`@upstash/ratelimit`) for rate limiting.
- **Sentry** (`@sentry/nextjs`) + **Vercel Analytics/Speed Insights** for observability.
- **recharts** for sales charts, **papaparse** for CSV export, **date-fns** for dates.

Path alias: `@/*` → repo root (e.g. `@/lib/...`, `@/components/...`).

## Architecture & routing

Route groups under `app/` (the `(group)` folders don't affect URLs):

- `app/(public)/` — landing, `/order/start` (service-mode chooser), `/order/address` (Mapbox picker, mobile only), `/packages`.
- `app/(auth)/` — `/login`, `/register`. Client-side Supabase auth.
- `app/(customer)/` — `/order` (checkout), `/confirm/[bookingId]`, `/my-bookings`. Layout requires a signed-in user.
- `app/(manicurist)/` — `/dashboard`, `/bookings`, `/customers`, `/items`, `/sales`, `/availability`, `/profile`. Layout requires `profiles.role = 'manicurist'`.
- `app/notifications/actions.ts` — shared notification server action.
- `app/{error,global-error,not-found}.tsx` — branded error boundaries (Sentry captures runtime errors).

`app/page.tsx` is the public landing; signed-in manicurists are redirected to `/dashboard`.

There is **no root `middleware.ts`** and **no `app/api/` routes**. `lib/supabase/middleware.ts`
(`updateSession`) exists as an SSR session-refresh helper but is not currently wired to a
root middleware — auth is enforced per-layout (see Auth below). All mutations go through
**Server Actions** (`"use server"`), which are same-origin only.

## Directory map

```
app/                      # routes (see Architecture); *.actions.ts = server actions
components/
  ui/                     # shadcn primitives — don't hand-edit beyond styling intent
  customer/               # cart, address picker, image carousel, etc.
  manicurist/             # tables, dialogs, views, nav, forms for the studio
  shared/                 # header, nav, sign-out, notification bell
  animations/             # decorative client components
  common/                 # RefreshControl, etc.
lib/
  supabase/               # client.ts (browser), server.ts (RSC/action), admin.ts (service-role), middleware.ts
  validations/            # zod schemas: auth, booking, bookingStatus, customer, item
  notifications/          # events.ts (notify* builders) + recipients.ts (booking loader)
  utils/                  # calculateDiscount, csvExport, formatPrice
  rate-limit.ts           # Upstash sliding-window helper
store/cartStore.ts        # zustand persisted cart (localStorage key "polish-me-up-cart")
types/database.types.ts   # generated Supabase types — source of truth for the schema
supabase/migrations/      # versioned SQL (additive only); seed_manicurist.sql
scripts/                  # one-off .mjs (seed item photos, upload homepage images, inject manicurist)
```

## Supabase clients — pick the right one

- `lib/supabase/client.ts` → `createClient()` — **browser** (Client Components). Uses the publishable key; RLS applies.
- `lib/supabase/server.ts` → `await createClient()` — **RSCs and Server Actions**. Reads auth cookie; RLS applies. Async (awaits `cookies()`).
- `lib/supabase/admin.ts` → `createAdminClient()` — **service role, bypasses RLS**. Marked `"server-only"`; uses `SUPABASE_SECRET_KEY`. Only used where strictly necessary (e.g. `createManicuristAccount` creating an auth user). Never import this into anything that could reach the client.

All clients are typed with `Database` from `types/database.types.ts`.

## Auth & authorization model

- Auth is Supabase email/password. `profiles.role` is `'customer' | 'manicurist'`.
- **Layout guards** are the primary gate: `(manicurist)/layout.tsx` redirects non-manicurists to `/login`; `(customer)/layout.tsx` requires a session.
- **Server actions re-verify** independently — never trust the layout alone. The standard pattern returns a discriminated result and bails early:
  ```ts
  type ActionResult<T = undefined> = ({ ok: true } & ...) | { ok: false; error: string };
  async function requireManicurist() { /* getUser → check profiles.role */ }
  ```
  (See `bookings/actions.ts` `assertManicurist`, `sales/actions.ts` & `profile/actions.ts` `requireManicurist`.)
- **Ownership checks**: customer-facing actions verify the row belongs to the user (e.g. `cancelBookingAsCustomer` checks `customers.profile_id === user.id`; `/confirm/[id]` 404s for non-owners).
- **RLS is on every table** (defined in migrations) as defense-in-depth.

## Conventions & patterns to follow

- **Validate every input with zod** before any DB call, in both the form (`zodResolver`) and the server action (`schema.safeParse`). Return `parsed.error.issues[0]?.message`.
- **Recompute money server-side.** Never trust client-sent totals. `calculateDiscount` (`lib/utils/calculateDiscount.ts`) is the single pure pricing function used identically client (preview) and server (insert). Student discount = 10%, rounds to 2dp. Loyalty is stubbed (`"none"`).
- **Server actions** live in colocated `actions.ts`, start with `"use server"`, return the `ActionResult` shape (not throws), and call `revalidatePath(...)` for affected routes after a successful mutation.
- **Notifications are fire-and-forget.** Build them via `lib/notifications/events.ts` (`notifyBookingCreated`, `notifyStatusChanged`, `notifyPaymentReceived`) and always `void ...().catch(console.error)` so a notification failure never rolls back the DB change. These insert into the `notifications` table; the bell polls it.
- **Booking status is a forward-only state machine** (`lib/validations/bookingStatus.schema.ts`): `pending → confirmed → in_progress → completed`; cancel allowed from any non-terminal state. Transitions re-check current status server-side to defeat stale UI. Entering `completed` upserts a `sales` row (by `booking_id`).
- **Supabase nested relations** can come back as object OR array depending on the join — unwrap defensively (see the `unwrap()` helper in `recipients.ts` and inline `Array.isArray(...)` guards). This is a recurring gotcha.
- **Manual writes that span tables** (e.g. `createManualSale`) compensate on failure by deleting earlier inserts — there are no DB transactions through PostgREST. Preserve that cleanup if you touch these.
- **Cart** (`store/cartStore.ts`): switching `serviceMode` clears items (and address/note when switching to walk-in). Adding an existing item increments quantity; `updateQuantity(id, 0)` removes the line.
- Styling: pink/rose brand palette is largely inline (e.g. `#EC4899`, `#3D1A2A`). Mobile-first; manicurist studio has a desktop sidebar + mobile bottom nav. Match the surrounding component's idiom rather than introducing a new system.

## Database (high level)

Source of truth for shape: `types/database.types.ts`. Key tables:

- `profiles` (1:1 with auth user; `role`), `customers` (may link a `profile_id`; tracks `total_visits/total_spent/first_visit/last_visit/points_balance`, `source`), `manicurists` (1:1 profile).
- `items` (services/products; `category` package|addon, `service_mode` walkin|mobile|both, `price/cost/margin`, `photo_urls[]`, `is_active`).
- `bookings` + `booking_items`; `sales` (mirrors completed/manual bookings); `promotions`; `saved_addresses`.
- Availability: `manicurist_weekly_schedule` (recurring, multi-window per weekday), `manicurist_date_overrides` (block/custom-hours per date), legacy `manicurist_availability`.
- `notifications` (per-recipient, `read_at` null = unread).
- Enums: `booking_status`, `payment_status`, `discount_type`, `item_category`, `location_type`, `service_mode`, `record_source` (system|manual), `promotion_type`, `user_role`.

`record_source` distinguishes app-generated (`system`) vs manually-entered (`manual`) bookings/customers/sales — deletion of a `manual` sale also removes its booking; `system` sales are kept.

### Migrations

`supabase/migrations/*.sql`, applied with `supabase db push`. **Additive only** by convention (new tables/indexes/policies) — Vercel rollbacks do NOT revert migrations, so write a down-migration first if you ever ship a destructive change. After a schema change, regenerate `types/database.types.ts`.

## Booking slot logic (checkout, `app/(customer)/order/page.tsx`)

15-min slots from 09:00–19:00. A slot shows only if the service duration
(`max(Σ duration_min × qty, 30)`) fits inside a working window AND doesn't overlap any
non-cancelled booking for that manicurist/date. Date overrides replace weekly hours
(closed override = no slots). The submit path re-checks for slot collisions, generates a
`PMU-YYYY-####` booking number, inserts booking + items, updates customer rollups, clears
the cart after navigation, and fires the created-notification. See `TESTING.md §2.5` for exact cases.

## Rate limiting (`lib/rate-limit.ts`)

Upstash sliding window, keyed by auth user id. Two tiers: `admin` (8/min — auth/money
actions like `changeMyPassword`, `createManicuristAccount`) and `write` (30/min —
`createManualSale`, `cancelBookingAsCustomer`). **Fails open**: if Upstash env vars are
missing (local/preview) or the check throws, the request is allowed (logged to console/Sentry).
Add limits to new abuse-prone actions with `checkRateLimit(kind, userId)` + `rateLimitError(kind)`.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY    # client + server, RLS-gated
SUPABASE_SECRET_KEY                     # service role — server only, never NEXT_PUBLIC_
NEXT_PUBLIC_MAPBOX_TOKEN                # address picker map
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY         # Places autocomplete / reverse geocode
UPSTASH_REDIS_REST_URL                  # optional locally (rate limit no-ops if unset)
UPSTASH_REDIS_REST_TOKEN
SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN     # optional
SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN  # optional, enables source-map upload
```

The app is designed to **boot cleanly without** the optional vars (rate limiting, Sentry
source maps degrade gracefully).

## Gotchas

- No middleware-based auth refresh is active — rely on layout guards; if you need session refresh on every request, wire `updateSession` into a root `middleware.ts`.
- PostgREST has no transactions — multi-step writes must self-compensate on error.
- Nested Supabase selects type as `T | T[]` — always unwrap.
- `npx tsc --noEmit` and `npm run build` must stay clean; the generated `database.types.ts` is the schema contract — don't hand-mutate it to silence errors, regenerate it.
- Money is stored/treated as 2dp numbers; always round (`Math.round(x*100)/100`).
- Keep `TESTING.md` (and `PRE_DEPLOY_AUDIT.md` where relevant) updated when behavior changes.
