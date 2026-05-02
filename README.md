# Reminder App

Personal reminder app for recurring everyday tasks (laundry, hair wash, skincare) with flexible recurrence rules. Built with Astro + React + Tailwind v4 + Postgres.

See [PROJECT_BRIEF.md](./PROJECT_BRIEF.md) for full spec & implementation plan.

## Stack

- Astro 6 (SSR, Netlify adapter)
- React 19 (UI islands)
- Tailwind CSS v4 (Vite plugin)
- PostgreSQL + Drizzle ORM (Phase 1)
- Better-Auth (Phase 1)
- Resend (email) + Twilio (SMS) (Phase 4)

## Setup

### 1. Install deps + env
```bash
npm install
cp .env.example .env
```
Generate `AUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Paste into `.env`.

### 2. Start Postgres (Docker)
```bash
docker compose up -d
```
Default `DATABASE_URL` already points at this:
`postgres://reminder:reminder@localhost:5432/reminder_app`

Stop later with `docker compose down`. Wipe data with `docker compose down -v`.

### 3. Push schema + seed
```bash
npm run db:generate   # write migration SQL to ./drizzle
npm run db:push       # apply schema directly (dev shortcut)
npm run db:seed       # default categories
```

### 4. Run
```bash
npm run dev
```
App at http://localhost:4321. Sign up at `/signup`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Astro dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview built site |
| `npm run check` | Astro type-check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |

## Layout

```
src/
  pages/         Astro routes
  layouts/       Shared layouts
  components/    .astro + .tsx components
  lib/
    env.ts       Validated env (zod)
    db/          Drizzle schema + client (Phase 1)
    auth/        Better-Auth config (Phase 1)
    recurrence/  Pure recurrence engine (Phase 2)
    reminders/   Email/SMS dispatcher (Phase 4)
  styles/
    global.css   Tailwind entry
```

## Deploy to Netlify

### 1. Provision Postgres (Neon)
1. https://neon.tech → New project
2. Copy connection string (looks like `postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
3. Run schema migrations against it locally:
   ```bash
   DATABASE_URL="<neon-url>" npm run db:push
   DATABASE_URL="<neon-url>" npm run db:seed
   ```

### 2. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
gh repo create reminder-app --private --source=. --push   # or use GitHub UI
```

### 3. Netlify site
1. https://app.netlify.com → **Add new site → Import from Git** → pick repo
2. Build command auto-detected from [netlify.toml](netlify.toml)
3. **Site settings → Environment variables**, add:
   | Var | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string |
   | `AUTH_SECRET` | 32+ char random (regenerate; do not reuse local) |
   | `AUTH_URL` | `https://<site>.netlify.app` (update after first deploy) |
   | `RESEND_API_KEY` | from Resend |
   | `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (sandbox) |
   | `CRON_SECRET` | 16+ char random |
   | `NODE_ENV` | `production` |
4. Trigger deploy. Wait ~2 min.
5. Update `AUTH_URL` env to actual deployed URL → trigger redeploy.

### 4. Verify scheduled function
- Netlify dashboard → **Functions → dispatch-reminders**
- Should show "Scheduled · every 1 minute"
- Check logs after a minute → expect `200` and dispatch JSON

### 5. Smoke test
1. Open deployed URL → signup
2. Profile → set timezone
3. New task scheduled ~6 min from now
4. Wait for cron fire → email arrives at signup address (sandbox limit)

### Production Resend (later)
Sandbox `onboarding@resend.dev` only delivers to your signup email. For real users:
1. Resend → Domains → add domain → set 3 DNS records
2. Update `RESEND_FROM_EMAIL` to `reminders@yourdomain.com`

## Status

Phases 0–5 complete. Phase 6 deploy: scaffolded, awaiting GitHub push + Netlify connect.
