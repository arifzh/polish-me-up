# Polish Me Up! — Full Feature Test Plan

> A complete manual-QA walkthrough for **every** feature in the codebase, with concrete sample inputs for both roles (Customer + Manicurist), expected results, and edge cases.

Use this as a checklist. Each section maps 1-to-1 to a file/flow in the repo so you can correlate bugs back to source. Test on a clean Supabase project with the migrations in `supabase/migrations/` applied and at least one manicurist account seeded.

---

## 0. Setup pre-conditions

| Need | How |
|---|---|
| `.env` populated | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| DB seeded | Run all `supabase/migrations/*.sql` (the latest one reseeds `items`) |
| Manicurist user | `supabase/seed_manicurist.sql` OR sign up + manually set `profiles.role = 'manicurist'` in SQL editor |
| Dev server | `npm run dev` → <http://localhost:3000> |
| Two browser sessions | One for customer (Chrome), one for manicurist (Edge / Incognito) — required to test both sides of notifications |

### Sample test accounts
| Role | Email | Password | Notes |
|---|---|---|---|
| Customer (regular) | `alice.tester@gmail.com` | `Pa$$w0rd123` | No discount |
| Customer (student) | `kim.student@university.edu` | `Studen7Pa$$` | Triggers edu auto-toggle |
| Manicurist | `nail.pro@polishmeup.test` | `MainCurist!1` | Promoted via `role = 'manicurist'` |

---

## 1. Authentication (`app/(auth)/`)

### 1.1 Register — `/register`
File: `app/(auth)/register/page.tsx` · Schema: `lib/validations/auth.schema.ts`

Validation rules (from `registerSchema`):
- `full_name`: trimmed, 2-80 chars, regex `^[\p{L}\s'.-]+$` (Unicode letters + spaces + `'`, `.`, `-`)
- `email`: required, valid email
- `password`: 8-72 chars, **must contain at least one letter AND at least one digit**
- `phone`: 7-20 chars, regex `^[+\d][\d\s-]+$` (starts with `+` or digit; allows digits, spaces, dashes)
- `is_student`: bool, server refuses `true` unless email's domain `.includes("edu")`

| # | Test | Sample input | Expected |
|---|---|---|---|
| 1.1.1 | Happy path (no discount) | name=`Alice Tester`, email=`alice.tester@gmail.com`, pwd=`Pa$$w0rd123`, phone=`+60 12-345 6789`, student=unticked | Account created, redirected to `/` |
| 1.1.2 | Happy path (auto-detected student) | name=`Kim Student`, email=`kim@uni.edu.my`, pwd=`Studen7Pa$$`, phone=`+60 11 1234 5678` | `is_student` auto-ticks, green "Congrats! 10% off" banner appears, account created with `is_student=true` |
| 1.1.3 | Edu email cleared mid-form | Type `kim@uni.edu.my` → checkbox ticks → backspace `.edu.my` to `gmail.com` | Checkbox auto-unticks |
| 1.1.4 | Name too short | name=`X` | "Full name must be at least 2 characters" |
| 1.1.5 | Name has digits | name=`John 99` | "Use letters, spaces, apostrophes, dots or hyphens only" |
| 1.1.6 | Invalid email | email=`not-an-email` | "Enter a valid email address" |
| 1.1.7 | Password 7 chars | pwd=`Ab1cdef` | "Password must be at least 8 characters" |
| 1.1.8 | Password no digit | pwd=`Abcdefghij` | "Password must contain a number" |
| 1.1.9 | Password no letter | pwd=`12345678` | "Password must contain a letter" |
| 1.1.10 | Phone too short | phone=`12345` | "Phone number is too short" |
| 1.1.11 | Phone bad chars | phone=`+60 abc-def` | "Use digits, spaces, dashes, and an optional +" |
| 1.1.12 | Duplicate email | Submit same email twice | Supabase auth error rendered inline |

### 1.2 Login — `/login`
File: `app/(auth)/login/page.tsx`

| # | Test | Sample input | Expected |
|---|---|---|---|
| 1.2.1 | Customer login | `alice.tester@gmail.com` / `Pa$$w0rd123` | Redirects to `/` (homepage) |
| 1.2.2 | Manicurist login | `nail.pro@polishmeup.test` / `MainCurist!1` | Redirects to `/dashboard` (NOT `/`) |
| 1.2.3 | Wrong password | any valid email + wrong pwd | "Invalid login credentials" |
| 1.2.4 | Profile row missing | Login a user whose `profiles` row was deleted manually | "Could not load your profile. Try again." |
| 1.2.5 | Empty fields | both blank | "Email is required" + "Password is required" |
| 1.2.6 | Already signed in customer visits `/` | Stay logged in, refresh `/` | Stays on `/` |
| 1.2.7 | Already signed in manicurist visits `/` | Sign in as manicurist, navigate to `/` | Auto-redirect to `/dashboard` (`app/page.tsx:46`) |

### 1.3 Sign out
- Click "Sign out" in sidebar (manicurist) or header (customer)
- Expected: session cookies cleared, redirected to `/login`

---

## 2. Customer flow — public + customer routes

### 2.1 Public landing — `/` 
File: `app/page.tsx`

| # | Test | Expected |
|---|---|---|
| 2.1.1 | Unauth visit | Hero + "Our Services" + SDG cards + "Book Now" CTA visible |
| 2.1.2 | Service card images load | Three images from Supabase Storage `service-images/homepage/*` |
| 2.1.3 | Click "Book Now" / "View Packages" | Navigates to `/order/start` |
| 2.1.4 | Instagram footer link | Opens `https://www.instagram.com/polishmeup_my/` in new tab |

### 2.2 Service-mode chooser — `/order/start`
File: `app/(public)/order/start/page.tsx`

| # | Test | Action | Expected |
|---|---|---|---|
| 2.2.1 | Pick walk-in (empty cart) | Click "Start walk-in order" | `serviceMode='walkin'` in cart, navigate to `/packages?mode=walkin` |
| 2.2.2 | Pick mobile (empty cart) | Click "Start mobile order" | `serviceMode='mobile'`, navigate to `/order/address` |
| 2.2.3 | Switch mode mid-cart | Add 1 walk-in item → return → click Mobile | Amber "Switching to Mobile will clear your current cart (1 item). Continue?" banner |
| 2.2.4 | Confirm cart clear | Click "Yes, clear cart" | Cart wiped, navigate to mobile flow |
| 2.2.5 | Cancel cart clear | Click "Cancel" | Banner closes, cart preserved |
| 2.2.6 | Re-pick same mode | Already walk-in, click walk-in again | No prompt, just navigates |

### 2.3 Address picker — `/order/address` (mobile mode only)
File: `app/(public)/order/address/page.tsx` + `components/customer/AddressPicker.tsx`

| # | Test | Sample | Expected |
|---|---|---|---|
| 2.3.1 | Direct visit while walk-in | Set walk-in → manually navigate to `/order/address` | Auto-redirects to `/order/start` |
| 2.3.2 | Missing Mapbox token | Temporarily blank `NEXT_PUBLIC_MAPBOX_TOKEN` | Dashed error card with token-missing message |
| 2.3.3 | Google Autocomplete | Type `pavilion kl` (200 ms debounce) | Rose-coloured suggestion dropdown appears |
| 2.3.4 | Select suggestion | Pick "Pavilion Kuala Lumpur" | Map flies to zoom 16, marker drops, formatted 3-4-line address in input |
| 2.3.5 | Click map | Click a random point in KL | Geocoding + Places `searchNearby` fire; if a building (lodging/mall/hospital/mosque) ≤ 50 m, building name prepended on line 1 |
| 2.3.6 | Drag the pin | Drag rose marker 200 m | Same reverse-geocode flow as click |
| 2.3.7 | Additional info — counter | Type 281 chars | Counter caps at 280/280 (`NOTE_MAX`) |
| 2.3.8 | Save unauthenticated | Try to save before signing in | "Saved" panel not shown (`signedIn=false`) |
| 2.3.9 | Save as "Home" | Pin an address, click `Home` preset chip → click `Save` | Chip appears under Saved addresses; refresh page → chip persists |
| 2.3.10 | Custom label | Type `Mom's place`, save | Inserted; chip shows star icon (custom) |
| 2.3.11 | Label too long | Type 31 chars | "Label must be 1-30 characters." |
| 2.3.12 | Upsert by label | Save a different pin under existing label `Home` | Replaces in place (unique constraint `customer_id,label`) |
| 2.3.13 | Recall a saved chip | Click `Home` chip | Marker + map snap to saved coords; chip turns active (pink ring) |
| 2.3.14 | Delete chip | Hover Home chip → click trash icon | Chip removed, persisted |
| 2.3.15 | Continue without pin | Don't pick anything → mobile sticky bar | "Pick an address first" — button disabled |
| 2.3.16 | Continue with pin | Pin → click "Continue to packages" | Address saved to cart, navigate `/packages?mode=mobile` |

### 2.4 Packages — `/packages?mode=<walkin|mobile>`
File: `app/(public)/packages/page.tsx`

| # | Test | Expected |
|---|---|---|
| 2.4.1 | No `mode` query | Visit `/packages` raw | Redirects to `/order/start` |
| 2.4.2 | Walk-in pricing | `/packages?mode=walkin` | Only items where `service_mode IN ('walkin','both')` and `is_active=true` |
| 2.4.3 | Mobile pricing | `/packages?mode=mobile` | Only items where `service_mode IN ('mobile','both')` |
| 2.4.4 | Sort order | Any mode | Sorted ascending by price |
| 2.4.5 | Package + Add-on sections | Both visible | Two grids: Packages (3 cols) and Add-ons (4 cols on lg) |
| 2.4.6 | Image carousel | An item with 2+ photos | `ImageCarousel` cycles photos on hover/swipe |
| 2.4.7 | Duration chip | Item with `duration_min > 0` | Clock badge "X min" top-right |
| 2.4.8 | Add to cart | Click "Add to cart" on Manicure | `cartStore.addItem` called; cart pill in header bumps |
| 2.4.9 | Add same item twice | Click "Add" twice | Quantity becomes 2 (not a new line) |
| 2.4.10 | Mobile sticky bar | On phone width | `PackagesMobileCartBar` shows count + total — tap to go to `/order` |
| 2.4.11 | "Change service mode" link | Top-left link | Back to `/order/start` |

### 2.5 Checkout — `/order`
File: `app/(customer)/order/page.tsx` · Schema: `lib/validations/booking.schema.ts`

Pre-conditions: signed in as customer, cart non-empty, mode set, address set (if mobile).

**Slot logic:**
- Slots are 15-min increments from `09:00` to `19:00` (excludes anything past 19:00).
- A slot is shown only if `[slotStart, slotStart + myDuration)` fits entirely inside a manicurist working window AND doesn't overlap any non-cancelled booking for the same manicurist/date.
- `myDuration = max(Σ duration_min × qty, 30)` (constant `DEFAULT_SERVICE_MIN = 30`).
- An existing booking with missing duration data is treated as 60 min (`DEFAULT_EXISTING_MIN`).
- A date-override with `is_closed=true` empties slots completely.
- A date-override with custom hours **replaces** the weekly windows for that date.

| # | Test | Sample input | Expected |
|---|---|---|---|
| 2.5.1 | Empty cart visit | Clear cart, visit `/order` | "Your cart is empty" card + "Start an order" CTA |
| 2.5.2 | Skipped mode | Manually clear `serviceMode` in localStorage | Auto-redirect `/order/start` |
| 2.5.3 | Skipped address (mobile) | Clear `address` in cart, visit `/order` | Redirect to `/order/address` |
| 2.5.4 | No manicurists in DB | Disable all manicurists (`is_active=false`) | "No manicurists are available right now" notice; submit disabled |
| 2.5.5 | Date picker before today | Try to pick yesterday in calendar | Date disabled (`disabled={{ before: startOfToday() }}`) |
| 2.5.6 | Pick manicurist (no schedule today) | Manicurist with empty weekly schedule on chosen date | "This manicurist isn't available on the selected date." |
| 2.5.7 | Pick manicurist with override (closed) | Same manicurist has a closed date override | Same "not available" notice |
| 2.5.8 | Pick manicurist with custom hours override | Override 14:00-16:00 on chosen date | Slot list reflects 14:00, 14:15 … only |
| 2.5.9 | Slot fully booked | Existing booking 10:00 with 60 min duration | Slots 09:00, 09:15, … 09:45 still appear; 10:00-10:45 hidden; 11:00 visible again |
| 2.5.10 | Student auto-tick | Email contains `edu` AND profile already student | Checkbox ticked, "from your profile" hint shown |
| 2.5.11 | Non-edu email | Regular customer | Student checkbox disabled with `STUDENT_EMAIL_HINT` |
| 2.5.12 | Student toggle off | Edu customer unchecks | Price updates: discount disappears |
| 2.5.13 | Notes optional | Leave blank | Submit allowed |
| 2.5.14 | Mobile notes merging | Set `addressNote=Gate code 1234`, also type notes `Allergic to acetone` | Resulting `bookings.notes` = `"Address info: Gate code 1234\n\nAllergic to acetone"` |
| 2.5.15 | Submit happy path (walk-in) | Cart: Manicure (Walk-in) ×1, future date, valid slot | Booking row inserted; navigate `/confirm/<id>`; cart cleared (next tick); customer `total_visits++`, `total_spent += total`, `last_visit=today`, `first_visit` only set if previously null |
| 2.5.16 | Submit happy path (mobile + discount) | Cart: Mani+Pedi (60 MYR) ×1 + Press-on (15 MYR) ×1, student ticked, mobile | Subtotal 75.00, discount 7.50, total 67.50 — values match `calculateDiscount` |
| 2.5.17 | Race condition (slot stolen) | In a second browser book the same slot, then submit | "That slot was just taken - please pick another time." |
| 2.5.18 | booking_number format | Any submit | `bookings.booking_number = PMU-YYYY-####` (last 4 digits of `Date.now()`) |
| 2.5.19 | Notification side-effect | Submit → check `notifications` table | Two rows: one for customer profile (`booking.created`) and one for the manicurist (if `manicurist.profile_id` is set) |

### 2.6 Confirmation — `/confirm/[bookingId]`
File: `app/(customer)/confirm/[bookingId]/page.tsx`

| # | Test | Expected |
|---|---|---|
| 2.6.1 | Owner views | Customer who created the booking | Page renders with full details + amber "Sent to manicurist for confirmation" banner (status=`pending`) |
| 2.6.2 | Non-owner views | Customer A opens booking B's URL | `notFound()` (404) |
| 2.6.3 | Anonymous | Logged out | Redirect to `/login` |
| 2.6.4 | After manicurist confirms | Refresh page | Green "Your booking is scheduled" banner |
| 2.6.5 | After manicurist cancels | Refresh | Rose "Booking cancelled" banner |
| 2.6.6 | Booking number copy | Visible chip e.g. `PMU-2026-1234` | Monospace pink chip |
| 2.6.7 | Address line for mobile | Mobile booking | `MapPin` row shows formatted address + "Home visit" |
| 2.6.8 | Items + totals match | Each line + subtotal + discount + grand total | All values come from `bookings.total/subtotal/discount_amount` |

### 2.7 My bookings — `/my-bookings`
File: `app/(customer)/my-bookings/page.tsx` · Cancel action: `actions.ts`

| # | Test | Expected |
|---|---|---|
| 2.7.1 | No customer record | Brand-new auth user (no `customers` row yet) | Empty state with "Start an order" CTA |
| 2.7.2 | Mixed list | Past + future bookings | Two sections: **Scheduled** (date ≥ today, sorted asc by date+time) and **History** (date < today) |
| 2.7.3 | "Next up" chip | Has scheduled bookings | Top chip shows next date + 12-hour time |
| 2.7.4 | Cancel button visibility | Status `pending` OR `confirmed` | Cancel button shown |
| 2.7.5 | Cancel button hidden | Status `in_progress`, `completed`, `cancelled` | No button |
| 2.7.6 | Cancel happy path | Click cancel on pending booking | Status → `cancelled`, page revalidates, notification inserted for customer (+ manicurist) |
| 2.7.7 | Rate-limit | Cancel 31+ bookings in 1 minute | "You're doing that too fast." (only when Upstash env vars set) |
| 2.7.8 | Cancel someone else's | Forge `bookingId` of another user | "You can only cancel your own bookings." |
| 2.7.9 | Cancel terminal | Try cancelling a `completed` row | `Cannot cancel a booking that is already "completed".` |

---

## 3. Manicurist studio — `app/(manicurist)/`

All routes require `profiles.role = 'manicurist'`. Visiting any manicurist route as a customer or signed-out user → redirect to `/login` (layout guard `app/(manicurist)/layout.tsx:32`).

### 3.1 Dashboard — `/dashboard`
File: `app/(manicurist)/dashboard/page.tsx`

| # | Test | Expected |
|---|---|---|
| 3.1.1 | KPI cards | Top 4 cards | My Customers (distinct `customer_id`), Bookings This Month, Revenue This Month (sum of `total` where `status=completed`), Top Package (most-booked package name in last 90 days) |
| 3.1.2 | Scope to mine | Only bookings where `bookings.manicurist_id = my id` | Customers added by other manicurists don't bleed in |
| 3.1.3 | Today's appointments | Bookings with `booking_date = today` (UTC) | Sorted ascending by time |
| 3.1.4 | Empty today | No bookings today | Empty card "No appointments today" |
| 3.1.5 | Quick actions | 4 tiles | Links: Add customer, Add item, All bookings, My schedule |
| 3.1.6 | Recent bookings | Last 8 created | Mobile: card list. Desktop: table |
| 3.1.7 | Manicurist with no row | Sign in as a `role=manicurist` but no `manicurists` table row | All KPIs zero (no peer leak) |

### 3.2 Bookings — `/bookings`
File: `app/(manicurist)/bookings/page.tsx` + `components/manicurist/BookingsView.tsx` · Actions: `actions.ts`

#### Filters
| # | Test | Expected |
|---|---|---|
| 3.2.1 | Default = mine | Open page | Toggle defaults to "Mine" when current manicurist row exists |
| 3.2.2 | Status filter | Pick "Pending" | Only `status=pending` rows visible |
| 3.2.3 | Source filter | Pick "Manual" | Only `source=manual` (those inserted via Add Sale) |
| 3.2.4 | Date range | Set `from=2026-05-01`, `to=2026-05-31` | Only May bookings |
| 3.2.5 | Mobile filter sheet | Open on phone width | Tap "Filters" → drawer; "Active filter count" badge updates |
| 3.2.6 | Export CSV | Click "Download" with filters applied | Saves `bookings-<today>.csv` with 10 columns matching `exportToCSV` keys |

#### Status transitions
Only **forward** transitions are allowed by `bookingStatusTransitionSchema`:

| From | Allowed to |
|---|---|
| pending | confirmed |
| confirmed | in_progress |
| in_progress | completed |
| completed | _none_ |
| cancelled | _none_ |
| **any non-terminal** | cancelled |

| # | Test | Expected |
|---|---|---|
| 3.2.7 | Open detail | Click a row | `BookingDetailDialog` opens with customer, manicurist, MiniMap (mobile only), notes, lines |
| 3.2.8 | Advance pending → confirmed | Click "Advance" | DB status flips; customer receives `booking.confirmed` notification |
| 3.2.9 | Mark completed | Walk through pending → confirmed → in_progress → completed | On `completed`, a `sales` row is inserted (upsert by `booking_id`) — `gross_sales`, `discounts`, `cost_of_goods` (Σ items.cost × qty), `source` mirror booking |
| 3.2.10 | Stale status guard | Open dialog → in another tab move it forward → click old "Advance" | "Booking is already \"X\", cannot transition from \"Y\"" |
| 3.2.11 | Cancel from manicurist side | Click cancel on a `confirmed` booking | Customer receives `booking.cancelled` notification ("Your manicurist cancelled…") |
| 3.2.12 | Cancel customer-side notif | Customer cancels a booking | Manicurist receives a cancellation notification |
| 3.2.13 | Set payment status | Dropdown unpaid → paid | DB updates; customer receives `payment.received` notification with the booking total |
| 3.2.14 | Refunded payment | paid → refunded | No notification (only `paid` triggers `notifyPaymentReceived`) |
| 3.2.15 | Mobile-mode MiniMap | Open a mobile booking with `address_lat/lng` set | Embedded Mapbox map + "Open in Google Maps" link |
| 3.2.16 | Walk-in detail | Walk-in booking | No MiniMap, just "At the booth" |

### 3.3 Customers — `/customers`
File: `app/(manicurist)/customers/page.tsx`

#### List
| # | Test | Expected |
|---|---|---|
| 3.3.1 | Sorted | Most recently created on top |
| 3.3.2 | Search | Type partial name in `Search by name…` | Live filter on `full_name` |
| 3.3.3 | Source badge | `system` (auto from signup) vs `manual` (admin added) | Pink chip vs muted chip |
| 3.3.4 | Export CSV | Click "Export customers" | Downloads CSV |
| 3.3.5 | View detail | Click "View" | `/customers/<id>` with full Visit/Spent stats |

#### Add — `/customers/new`
Schema: `customerManualSchema`.

| # | Test | Sample input | Expected |
|---|---|---|---|
| 3.3.6 | Required name | name blank | "Full name is required" |
| 3.3.7 | Optional fields | name=`Walk-in #1`, others blank | Saved with `source='manual'`, `profile_id=null`, redirect to `/customers?added=true` with success banner |
| 3.3.8 | Email invalid | email=`abc` | "Enter a valid email" |
| 3.3.9 | Negative visits | total_visits=-1 | "Cannot be negative" |
| 3.3.10 | Empty email saved as null | email="" | Empty string transformed to `undefined` → null in DB |
| 3.3.11 | Full backfill | name=`Diana Past Client`, phone=`+60111234567`, email=`diana@yahoo.com`, student=on, first_visit=`2025-01-15`, total_visits=12, total_spent=540.50, notes=`Allergic to acetone` | Row inserted with all fields populated |
| 3.3.12 | First visit date format | first_visit=`15/01/2025` (typed manually instead of via date picker) | "Use YYYY-MM-DD format" |

### 3.4 Items — `/items`
File: `app/(manicurist)/items/page.tsx`

#### List
| # | Test | Expected |
|---|---|---|
| 3.4.1 | Subtitle counts | Header shows e.g. "6 packages, 5 add-ons" |
| 3.4.2 | Sort | Packages first, then add-ons; alphabetical inside each |
| 3.4.3 | Export CSV | Download | Full item list |

#### Add — `/items/new`
Schema: `itemSchema`.

| # | Test | Sample input | Expected |
|---|---|---|---|
| 3.4.4 | Required name | name=`X` (1 char) | "Name must be at least 2 characters" |
| 3.4.5 | Category | Select "Package" / "Add-on" | Either accepted |
| 3.4.6 | Price ≤ 0 | price=0 | "Price must be greater than 0" |
| 3.4.7 | Cost negative | cost=-5 | "Cost cannot be negative" |
| 3.4.8 | Stock 0 | stock=0 | "Stock must be greater than 0" |
| 3.4.9 | Stock blank (service) | stock="" | Saved as `null` |
| 3.4.10 | Duration blank | duration_min="" | Saved as `null` |
| 3.4.11 | More than 3 photos | Drop 4 images | Dropzone rejects; "Up to 3 photos only" |
| 3.4.12 | Active default | Don't touch | `is_active=true` |
| 3.4.13 | Happy path | name=`Glitter top-coat`, category=`addon`, price=`12.50`, cost=`3.20`, duration=`10`, photos=2 images, active=on | Insert OK, redirect `/items?added=true`; cover (first photo) and `photo_urls[]` both saved |

#### Edit — `/items/<id>/edit`
| # | Test | Expected |
|---|---|---|
| 3.4.14 | Edit existing | Change price 45 → 50, save | Row updated; redirect `/items?updated=true` |
| 3.4.15 | Photo reorder/remove | Remove cover, drop new one | `photo_urls` and `photo_url` (first) update in lockstep |
| 3.4.16 | Soft disable | Untick `is_active` | Item disappears from `/packages` and from new booking dropdowns immediately |

### 3.5 Sales — `/sales`
File: `app/(manicurist)/sales/page.tsx` + `components/manicurist/SalesView.tsx` · Action: `actions.ts`

| # | Test | Expected |
|---|---|---|
| 3.5.1 | KPI cards | 4 cards: Net Sales (Σ `net_sales`), Gross Profit (Σ `gross_profit`), Bookings count, Average booking |
| 3.5.2 | Auto-row on completion | After 3.2.9 | A new sales row appears for the just-completed booking; `source='system'` (or whatever booking.source was) |
| 3.5.3 | Source filter | Filter `manual` | Only manual entries |
| 3.5.4 | Date range filter | from=2026-05-01, to=2026-05-31 | Only rows in range |
| 3.5.5 | Export CSV | Download | 9 columns (Date, Booking#, Gross, Discounts, Refunds, Net, COGS, Profit, Source) |
| 3.5.6 | Manual sale row has delete | `source=manual` row | Trash icon visible |
| 3.5.7 | System sale row no delete | `source=system` row | No trash icon |

#### Add Manual Sale (button opens `AddSaleDialog`)
Schema: `createSaleSchema`.

| # | Test | Sample input | Expected |
|---|---|---|---|
| 3.5.8 | Existing customer | Pick `Diana Past Client`, booking#=`MAN-2026-001`, date=today, line: existing Manicure ×1 @ 25 | Inserts `bookings` (status=`completed`, payment=`paid`, source=`manual`, service_mode=`walkin`, location=`booth`, time=null), `booking_items`, `sales` row |
| 3.5.9 | New customer + new item | customer.kind=`new` name=`Susan Walk-in`, line.item.kind=`new` name=`Quick polish` cost=2 unit_price=10 ×1 | Inserts customer (manual), inserts item (active=false, mode=walkin), then booking+lines+sale |
| 3.5.10 | Missing booking# | booking_number="" | "Booking number is required" |
| 3.5.11 | Zero lines | Empty lines | "Add at least one line item" |
| 3.5.12 | Quantity > 99 | qty=100 | Zod rejects |
| 3.5.13 | Discount > subtotal | subtotal=20, discount=50 | Total clamped to 0 (`Math.max(0, …)`) |
| 3.5.14 | Notes 500+ chars | 501 chars | Zod rejects |
| 3.5.15 | Rate-limit | 31+ manual sales in 1 min | "You're doing that too fast." (when Upstash configured) |

#### Delete sale
| # | Test | Expected |
|---|---|---|
| 3.5.16 | Delete manual sale | Confirm dialog → OK | Sales row deleted **AND** underlying booking + booking_items also deleted |
| 3.5.17 | Try to delete system sale | UI hides button — but if you call `deleteSale` action with a `source=system` sale_id | Sale deleted, but booking + items kept (`if (sale.source === "manual")` gate) |

### 3.6 Availability — `/availability`
File: `app/(manicurist)/availability/page.tsx`

#### Weekly schedule
| # | Test | Sample | Expected |
|---|---|---|---|
| 3.6.1 | First visit bootstraps | New manicurist user with no `manicurists` row | Row auto-created on load |
| 3.6.2 | Add window | Click "Add window" on Monday → enter 09:00-12:00, Save | Row inserted |
| 3.6.3 | Multiple windows | Add 09:00-12:00 + 14:00-18:00 on Mon, save | Both stored |
| 3.6.4 | Overlap rejection | Try 09:00-13:00 + 12:00-15:00 | Toast: "Monday: time windows overlap." |
| 3.6.5 | Start ≥ End | 14:00-12:00 | "Monday: start time must be before end time." |
| 3.6.6 | Empty day (closed) | Remove all windows + Save | Day shows "Closed" chip; customers see no slots for that weekday |
| 3.6.7 | Save persists | Refresh after save | Same windows restored |

#### Date overrides
| # | Test | Sample | Expected |
|---|---|---|---|
| 3.6.8 | Block date | Mode=`Block date`, date=`2026-12-25`, note=`Christmas` | Row inserted, listed as red "Blocked" chip |
| 3.6.9 | Custom hours | Mode=`Custom hours`, date=`2026-06-15`, 10:00-13:00, note=`Half day` | Violet chip "Custom · 10:00-13:00" |
| 3.6.10 | Upsert by date | Add another override for same date | Replaces previous (unique `manicurist_id,date`) |
| 3.6.11 | Past date | min=today on date input | Can't pick past dates |
| 3.6.12 | Customer-side effect | After 3.6.8, customer tries to book that date with this manicurist | Slots empty |
| 3.6.13 | Remove override | Click trash icon | Optimistic remove + DB delete |

### 3.7 Profile — `/profile`
File: `app/(manicurist)/profile/page.tsx` · Action: `actions.ts`

#### Update profile
Schema: `profileSchema`.

| # | Test | Sample | Expected |
|---|---|---|---|
| 3.7.1 | Update name | full_name=`Nail Pro Senior` | `profiles.full_name` updated |
| 3.7.2 | Update phone | phone=`+60 12 999 8888` | Saved |
| 3.7.3 | Update bio (max 500) | 501 chars | Zod error |
| 3.7.4 | Specialties comma list | specialties=`gel, nail art, french` | Stored as `['gel','nail art','french']` in `manicurists.specialties` |
| 3.7.5 | Empty specialties | specialties=`` | Saved as `null` |
| 3.7.6 | Empty bio | bio="" | Saved as `null` (transform) |

#### Change password
Schema: `passwordSchema`.

| # | Test | Sample | Expected |
|---|---|---|---|
| 3.7.7 | Too short | new_password=`abc` | "Password must be at least 8 characters" |
| 3.7.8 | Valid | new_password=`NewPa$$w0rd` | Supabase auth updates; next sign-in uses it |
| 3.7.9 | Rate limit | 6+ password changes in 1 minute | "Too many sensitive operations. Please wait a minute and try again." (admin limiter: 5/min) |

#### Create new manicurist (admin op)
Schema: `newManicuristSchema`.

| # | Test | Sample | Expected |
|---|---|---|---|
| 3.7.10 | New manicurist account | full_name=`Sarah Apprentice`, email=`sarah@polishmeup.test`, password=`Apprent1cePa$$` | Auth user created (`email_confirm=true`), profile upserted `role='manicurist'`, `manicurists` row inserted (`rating=5.0`, `is_active=true`) |
| 3.7.11 | Duplicate email | Same email twice | Supabase auth error |
| 3.7.12 | Invalid email | email=`foo` | "Invalid email" |
| 3.7.13 | Password short | password=`short` | "Password must be at least 8 characters" |
| 3.7.14 | Rate limit | 6+ creates in 1 min | Admin rate-limit error |
| 3.7.15 | Cross-check sign-in | Sign in as `sarah@polishmeup.test` | Lands on `/dashboard` (manicurist role) |

---

## 4. In-app notifications

### 4.1 Notification bell + dropdown
Component: `components/shared/NotificationBell` · Actions: `app/notifications/actions.ts`

| # | Test | Expected |
|---|---|---|
| 4.1.1 | Unread badge | Has unread rows (`read_at` null) | Red dot on bell, count chip |
| 4.1.2 | Click bell | Dropdown lists latest 20 ordered desc by `created_at` |
| 4.1.3 | Click a single notification | Marks `read_at = now`, navigates to `link` (e.g. `/my-bookings`, `/bookings`) |
| 4.1.4 | Mark all read | Click "Mark all read" | All unread rows for current user get `read_at` |
| 4.1.5 | RLS isolation | Sign in as a second user | Cannot see another user's notifications |
| 4.1.6 | Booking created | After 2.5.15 customer side | Customer sees: `Booking #PMU-2026-#### received` |
| 4.1.7 | Booking confirmed | After 3.2.8 manicurist confirms | Customer sees: `Booking #… confirmed` |
| 4.1.8 | Booking completed | After 3.2.9 | Customer sees: `Booking #… completed` |
| 4.1.9 | Booking cancelled (by manicurist) | 3.2.11 | Customer sees: `Your manicurist cancelled your booking on YYYY-MM-DD at HH:MM` |
| 4.1.10 | Booking cancelled (by customer) | 2.7.6 | Manicurist sees: `<customer name> cancelled their booking on …` |
| 4.1.11 | Payment received | 3.2.13 | Customer sees: `Payment received for #…` with `We received your payment of RM <total>` |
| 4.1.12 | Notification fire-and-forget | Disconnect from network mid-status-change | DB change still succeeds; only console error for notifications |

---

## 5. Cross-cutting concerns

### 5.1 Authorization guards
| # | Test | Expected |
|---|---|---|
| 5.1.1 | Manicurist routes as customer | Sign in as customer, visit `/dashboard` | Redirect to `/login` (layout server check) |
| 5.1.2 | Customer routes anonymous | Sign out, visit `/my-bookings` | Redirect to `/login` |
| 5.1.3 | Confirm page non-owner | Visit `/confirm/<someoneElseId>` | 404 |
| 5.1.4 | Cancel someone else's | Use server action with foreign booking id | "You can only cancel your own bookings." |
| 5.1.5 | Manicurist actions while signed out | Call `transitionBookingStatus` from devtools | "Not signed in" |
| 5.1.6 | Customer trying status transition | Customer profile triggers `transitionBookingStatus` | "Only manicurists may perform this action" |

### 5.2 Cart store persistence
File: `store/cartStore.ts` (`zustand/persist` → localStorage key `polish-me-up-cart`)

| # | Test | Expected |
|---|---|---|
| 5.2.1 | Add items, hard refresh | Cart preserved |
| 5.2.2 | Switch mode | Items emptied; address+addressNote cleared if switching to walkin |
| 5.2.3 | Same item twice | Quantity merge (not duplicate line) |
| 5.2.4 | `updateQuantity(itemId, 0)` | Line removed |
| 5.2.5 | Sign out mid-flow | Cart survives (it's local) but order page requires re-login |

### 5.3 Discount math
Pure function `lib/utils/calculateDiscount.ts`.

| Input | subtotal | discount | total |
|---|---|---|---|
| 1×100, isStudent=false | 100 | 0 | 100 |
| 1×100, isStudent=true | 100 | 10 | 90 |
| 1×79.9 + 2×15, isStudent=false | 109.9 | 0 | 109.9 |
| 1×79.9 + 2×15, isStudent=true | 109.9 | 10.99 | 98.91 |
| Empty lines | 0 | 0 | 0 |

All rounded to 2 dp via `Math.round(x*100)/100`.

### 5.4 Rate limiting
`lib/rate-limit.ts` — uses Upstash; absent env vars = always allow.

| Limiter | Window | Tokens | Hit by |
|---|---|---|---|
| `rl:write` | 1 minute | 30 | `cancelBookingAsCustomer`, `createManualSale` |
| `rl:admin` | 1 minute | 5 | `changeMyPassword`, `createManicuristAccount` |

Test by setting `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, then rapid-firing the relevant action.

### 5.5 Mapbox / Google Places
| # | Test | Expected |
|---|---|---|
| 5.5.1 | Bias to Malaysia | Type `Pavilion` | Suggestions all in MY |
| 5.5.2 | Building detection | Click on Mid Valley Megamall | Top line of address becomes `Mid Valley Megamall` |
| 5.5.3 | No building within 50 m | Click an empty road in Bukit Bintang | Plain street address (3 lines) |
| 5.5.4 | Postcode line | Reverse-geocode any KL pin | Last line is `<postcode> <locality>, <state>` |

### 5.6 CSV export
File: `lib/utils/csvExport.ts`

| # | Test | Expected |
|---|---|---|
| 5.6.1 | Bookings export | Filename `bookings-YYYY-MM-DD.csv` |
| 5.6.2 | Sales export | Filename `sales-YYYY-MM-DD.csv` |
| 5.6.3 | Customers export | Headers correct |
| 5.6.4 | Items export | Headers correct |
| 5.6.5 | Quotes in cells | Customer name `O'Brien, "Pat"` | Escaped per RFC 4180 (`papaparse`) |
| 5.6.6 | Empty filter result | Apply filter that excludes everything → export | CSV with only headers (or empty) — verify no crash |

---

## 6. Error & edge-case smoke tests

| # | Test | Expected |
|---|---|---|
| 6.1 | 404 | Visit `/no-such-page` | `app/not-found.tsx` renders |
| 6.2 | Server error | Force throw in a server component | `app/error.tsx` / `global-error.tsx` renders; Sentry captures (if DSN set) |
| 6.3 | Offline checkout | Disconnect mid-submit | Booking insert fails, error surfaced — cart NOT cleared |
| 6.4 | Two tabs same booking | Open `/confirm/<id>` in two tabs, cancel in one | Other tab still shows old banner until refresh (no realtime) |
| 6.5 | Long full_name | 80 chars exactly | Accepted; 81 chars → registration rejected |
| 6.6 | Unicode names | name=`王小明 / Müller-O'Reilly` | Accepted (`\p{L}` regex) |
| 6.7 | Mobile booking with address=null | Manually craft via dev tools | Zod refines → "Address is required for mobile bookings" |
| 6.8 | Mobile booking with lat/lng missing | Address text only | "Pin a location on the map first" |
| 6.9 | Booking past 19:00 | Schedule allows 18:00-20:00, cart needs 90 min, pick 18:00 | Slot hidden because 18:00 + 90 = 19:30 ≤ 20:00 ✅ (test 17:30 too: 17:30+90=19:00 ≤ 20:00 ✅); 18:30 → 18:30+90=20:00 ≤ 20:00 ✅; 18:45 → 20:15 > 20:00 ❌ |
| 6.10 | Manicurist with two windows | 09:00-12:00 + 14:00-18:00, 60-min service | Slots from 09:00-11:00 and 14:00-17:00, gap 12:00-13:45 hidden |

---

## Quick smoke checklist

```
[ ] Customer can sign up + sign in
[ ] Edu email auto-toggles student
[ ] Walk-in flow: /order/start → /packages?mode=walkin → /order → /confirm
[ ] Mobile flow: /order/start → /order/address → /packages?mode=mobile → /order → /confirm
[ ] Saved addresses save / recall / delete
[ ] Slot picker hides taken times
[ ] Student discount applied at total
[ ] Customer can cancel a pending/confirmed booking
[ ] Notification bell shows new booking on both sides
[ ] Manicurist can advance pending → confirmed → in_progress → completed
[ ] Completed booking creates a sales row
[ ] Manicurist can add a manual sale (existing/new customer + item)
[ ] Manicurist can block a date AND set custom hours
[ ] Customer slot picker respects overrides
[ ] Bookings/Sales/Customers/Items CSV export works
[ ] Profile update, password change, new manicurist creation
[ ] Rate limits trigger (only when Upstash configured)
[ ] Manicurist routes are blocked for customers
```

Run through this list end-to-end every release. Any failure → file an issue with the test #.
