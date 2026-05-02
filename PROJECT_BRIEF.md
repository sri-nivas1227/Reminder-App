# Project Brief — Reminder App

> Status: drafted by Claude from user notes. Sections marked **[CONFIRM]** need user sign-off. Sections marked **[ASSUMED]** are sensible defaults — overwrite if wrong.

---

## 1. One-Line Pitch

A personal reminder app for **recurring everyday tasks** (laundry, hair wash, skincare, dermaplaning, monthly chores) where the recurrence pattern is the hard part — not just "every day at 9am" but "every 4 days", "every Monday & Wednesday", "1st and 15th of each month", "every Dec 20". Sends email/SMS reminders and tracks completion history.

## 2. Problem & Goal

- **Problem:** Personal hygiene and household tasks repeat on irregular cadences. Generic calendar apps handle daily/weekly well but struggle with "every N days" or mixed weekday/monthly rules. Easy to lose track of when a task was last done.
- **Target user:** Busy individuals (students, working professionals, side-project hustlers) who want low-friction reminders for self-care and household upkeep.
- **Success looks like:**
  - User sets up a task in <30 seconds.
  - Reminders fire reliably 5 min before scheduled time.
  - User can answer "when did I last wash my hair?" instantly from the dashboard.

## 3. Core Features (MVP)

- [ ] **P0** — Auth (signup, login, 30-day session persistence).
- [ ] **P0** — Create / edit / delete task: title, category, recurrence rule, reminder time.
- [ ] **P0** — Recurrence engine supporting:
  - Every N days
  - Specific weekdays (e.g. Mon + Wed)
  - Specific dates of month (e.g. 1st & 15th)
  - Specific yearly date (e.g. Dec 20)
- [ ] **P0** — Dashboard: today's active tasks, upcoming tasks, mark done / missed.
- [ ] **P1** — Reminder delivery via email and/or SMS, 5 min before scheduled time, per-user preference.
- [ ] **P1** — Completion history + missed/completed counters per task.
- [ ] **P2** — Profile page to change reminder method, contact info, password.
- [ ] **P2** — Category management (predefined + custom).

## 4. Out of Scope (v1)

- Shared / team tasks.
- Push notifications (mobile app or web push).
- Native mobile app (PWA OK if cheap).
- Calendar import/export (.ics).
- Snooze / reschedule individual instances.
- Recurring tasks with end dates or occurrence limits — **[CONFIRM]**.
- Time zones beyond user's profile zone — **[CONFIRM]**.

## 5. User Flows

### Flow A — New user
1. Land on `/` → redirect to `/login`.
2. Click "Sign up" → `/signup` → enter email + password + phone (optional) → account created → redirect to `/`.
3. Empty dashboard with CTA "Add your first task" → `/new`.

### Flow B — Daily use
1. Login → `/` dashboard.
2. See today's tasks (tiles), each showing title, category, scheduled time, status (pending / done / missed).
3. Tap tile → modal with **Done** / **Missed** / **Edit** buttons.
4. Top of dashboard shows running totals: completed count, missed count, streak (optional **[ASSUMED]**).

### Flow C — Adding a task
1. Click "+ New task" → `/new` (or modal — **[CONFIRM]** route vs modal).
2. Fill: title, category, recurrence type, recurrence params, reminder time, reminder channel.
3. Save → returns to dashboard, task appears in upcoming list.

### Flow D — Reminder
1. Cron job runs every minute (or every 5 min — **[CONFIRM]**).
2. Finds tasks due in next 5 min for active users.
3. Sends email / SMS via configured provider.
4. On task day, tile appears on dashboard in "active" state until user marks done/missed or day ends.

## 6. Pages / Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Dashboard — today + upcoming tasks, stats | yes |
| `/login` | Login form | no |
| `/signup` | Signup form | no |
| `/new` | New task form | yes |
| `/task/[id]` | Edit task (or modal — **[CONFIRM]**) | yes |
| `/profile` | Profile, reminder prefs, password change | yes |
| `/history` | Full completion history & per-task stats — **[ASSUMED]** | yes |
| `/api/*` | Internal endpoints (auth, tasks, completions) | mixed |

## 7. Data Model

### `User`
- `id` (uuid)
- `email` (unique)
- `password_hash`
- `phone` (nullable)
- `timezone` (default `America/Los_Angeles` — **[CONFIRM]**)
- `reminder_channel` (`email` | `sms` | `both`)
- `created_at`, `updated_at`

### `Task`
- `id` (uuid)
- `user_id` (fk → User)
- `title`
- `category_id` (fk → Category, nullable)
- `recurrence_type` (`every_n_days` | `weekdays` | `month_dates` | `yearly_date`)
- `recurrence_config` (jsonb) — shape depends on type:
  - `every_n_days`: `{ n: 4, anchor_date: "2026-05-01" }`
  - `weekdays`: `{ days: [1, 3] }` (0=Sun)
  - `month_dates`: `{ days: [1, 15] }`
  - `yearly_date`: `{ month: 12, day: 20 }`
- `reminder_time` (time of day, e.g. `09:00`)
- `is_active` (bool)
- `created_at`, `updated_at`

### `Category`
- `id` (uuid)
- `user_id` (fk, nullable for system defaults)
- `name`
- `color` (hex)

### `TaskOccurrence`
- `id` (uuid)
- `task_id` (fk → Task)
- `scheduled_for` (timestamp, computed from recurrence)
- `status` (`pending` | `done` | `missed`)
- `completed_at` (nullable)
- `reminder_sent_at` (nullable)

> Occurrences materialized rolling window (e.g. next 30 days) by cron. Past occurrences kept for history.

### `Session`
- Managed by auth library. 30-day rolling expiry on activity.

## 8. Tech Stack

- **Framework:** Astro (latest)
- **Rendering:** SSR (Astro `output: 'server'`)
- **UI islands:** React (for interactive bits — modals, forms, dashboard tiles)
- **Styling:** Tailwind CSS v4 (Vite plugin setup, no `tailwind.config.js`)
- **Database:** PostgreSQL
- **ORM:** Drizzle **[ASSUMED]** (lightweight, TS-native, plays well with Astro)
- **Auth:** Better-Auth **[ASSUMED]** — modern, framework-agnostic, supports email/password, sessions, 30-day expiry config. Alternatives: Lucia (now deprecated), Clerk (paid), roll-your-own.
- **Deployment:** Netlify (primary) + self-hosted Docker option
- **Package manager:** npm
- **Scheduling:** node-cron in a long-running worker (self-host) **OR** Netlify scheduled functions (Netlify deploy). **[CONFIRM]** — affects architecture.

## 9. Third-Party Services / APIs

- **Email:** Resend **[ASSUMED]** (cheap, dev-friendly, generous free tier). Alt: Postmark, SendGrid.
- **SMS:** Twilio **[ASSUMED]** (industry standard). Alt: MessageBird, Vonage. Note: SMS costs real money — **[CONFIRM]** budget.
- **Postgres host:** Neon or Supabase **[ASSUMED]** (free tier, serverless-friendly).

## 10. Auth & Permissions

- **Anonymous:** view `/login`, `/signup` only.
- **Logged-in user:** full CRUD on own tasks/categories/profile. Cannot see others' data.
- **Admin:** none in v1. **[CONFIRM]**

## 11. Design / UI Vibe — **[NEEDS USER INPUT]**

- **Inspiration:** _TBD_ (suggest: Things 3, TickTick, Linear for clean minimal feel)
- **Tone:** minimal **[ASSUMED]**
- **Dark mode:** both **[ASSUMED]**
- **Mobile-first:** yes **[ASSUMED]** — phone-primary use case

## 12. Non-Functional Requirements

- **Performance:** dashboard <1s on 4G **[ASSUMED]**
- **Accessibility:** WCAG AA **[ASSUMED]**
- **i18n:** no, English only v1 **[ASSUMED]**
- **Offline:** no v1 **[ASSUMED]**
- **SEO:** low (auth-walled app) **[ASSUMED]**

## 13. Existing Assets

- None reported.

## 14. Constraints & Deadlines — **[NEEDS USER INPUT]**

- Deadline: _TBD_
- Budget for paid services (Twilio SMS, hosting): _TBD_

## 15. Open Questions

1. **Scheduler architecture:** Netlify scheduled functions vs separate worker process? Netlify funcs cap at ~1 min granularity but free; worker needs always-on host.
2. **SMS budget:** Twilio US SMS ≈ $0.0083/msg. 100 users × 3 reminders/day = ~$75/mo. Confirm willingness or restrict SMS to paid tier later.
3. **Anchor date semantics:** for "every N days", does day 0 = task creation date or user-picked start date?
4. **Task on weekend/holiday:** skip, shift, or fire as scheduled?
5. **Multi-device sessions:** allowed simultaneously? (default yes)
6. **Account deletion / data export:** scope for v1?
7. Auth library — confirm Better-Auth or pick alternative.
8. Edit task: dedicated route `/task/[id]` or modal overlay on dashboard?

## 16. Notes

- Recurrence engine is the technical risk. Will use a small pure function `nextOccurrence(rule, after) → Date` and unit-test it heavily before wiring UI.
- Reminder dispatch must be idempotent (no duplicate sends if cron retries).

---

# Implementation Plan

## Phase 0 — Scaffolding (½ day)
1. `npm create astro@latest` — minimal template, TypeScript strict.
2. Add React integration: `npx astro add react`.
3. Add Tailwind v4 via Vite plugin (`@tailwindcss/vite`), import in global stylesheet.
4. Set Astro `output: 'server'`, add Netlify adapter.
5. Configure ESLint + Prettier.
6. Create `.env.example` and `src/lib/env.ts` (zod-validated).
7. Folder layout:
   ```
   src/
     pages/           # Astro routes
     components/      # .astro + .tsx
     lib/
       db/            # Drizzle schema + client
       auth/          # Better-Auth config
       recurrence/    # pure functions + tests
       reminders/     # dispatcher
     styles/
   ```

## Phase 1 — Database & Auth (1 day)
1. Provision Postgres (Neon free tier).
2. Drizzle schema for `users`, `sessions`, `categories`, `tasks`, `task_occurrences`.
3. Migrations + seed script (one demo user, sample tasks).
4. Better-Auth setup, email/password provider, 30-day session.
5. Middleware: protect routes, redirect to `/login`.
6. Pages: `/login`, `/signup` with React form islands.

## Phase 2 — Recurrence Engine (1 day)
1. Pure module `src/lib/recurrence/`:
   - `nextOccurrence(rule, after: Date): Date | null`
   - `occurrencesBetween(rule, start, end): Date[]`
2. Unit tests (Vitest) for all 4 rule types + edge cases (DST, month-end, leap years).
3. Materializer: cron job calls `occurrencesBetween(rule, now, now+30d)` per active task, upserts into `task_occurrences`.

## Phase 3 — Task CRUD + Dashboard (1.5 days)
1. `/new` page — React form with conditional fields per recurrence type.
2. API routes: `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`, `POST /api/tasks/:id/complete`, `POST /api/tasks/:id/miss`.
3. `/` dashboard:
   - Server-render today's occurrences + upcoming 7 days.
   - Stats header: completed / missed counts (lifetime + this month).
   - Tile component (React) with status color, click → edit modal.
4. Edit modal — same form as `/new`, prefilled.

## Phase 4 — Reminder Dispatch (1 day)
1. Resend + Twilio clients in `src/lib/reminders/`.
2. Email + SMS templates (text only, no HTML bloat for v1).
3. Dispatcher: query `task_occurrences` where `scheduled_for BETWEEN now+4min AND now+6min` AND `reminder_sent_at IS NULL`. Send, mark sent.
4. Wire to scheduled function (Netlify) running every minute.
5. Idempotency via `reminder_sent_at` write before send (or row lock).

## Phase 5 — Profile & Polish (½ day)
1. `/profile` — change channel preference, phone, password.
2. `/history` — list past occurrences, filter by task / date range.
3. Empty states, loading states, error toasts.
4. Dark mode toggle.
5. Mobile responsive pass.

## Phase 6 — Deploy (½ day)
1. Netlify deploy preview from main branch.
2. Set env vars (DB_URL, RESEND_KEY, TWILIO_*, AUTH_SECRET).
3. Smoke test: signup → create task → trigger reminder manually → mark done.
4. Dockerfile + docker-compose for self-host (Postgres + app + cron worker).

**Total estimate:** ~5–6 working days for solo dev with the stack above.

## Key Risks
- **Scheduler choice** blocks Phase 4 — decide before Phase 0.
- **Twilio account approval** can take days — register early.
- **Recurrence DST bugs** — write tests in Phase 2 before building UI.
