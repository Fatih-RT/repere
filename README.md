# Repère

A personal spaced-repetition study app — subjects, chapters, questions with
KaTeX/mhchem support, a review session driven by an SM-2-derived scheduler,
Pomodoro, dashboard/statistics, and a soft-delete trash. Built for one or two
users (no public sign-up flow beyond a plain email/password register screen).

## Architecture

- **Backend**: [PocketBase](https://pocketbase.io) 0.39.11 — a single Go
  binary with SQLite storage, a REST API, and a built-in auth collection.
  There is no separate application server: business rules live either in the
  collection schema/rules (`pb_migrations/`) or client-side in the frontend
  (see "Scheduler" below), with one small cron hook (`pb_hooks/`) for trash
  cleanup.
- **Frontend**: React + Vite + TypeScript + Tailwind (`apps/web/`), talking to
  PocketBase through its official JS SDK. In production it's a static build
  served directly by PocketBase from `pb_public/` — same origin, no CORS, no
  separate web server.
- **Scheduler**: `apps/web/src/lib/scheduler/` is a pure, dependency-free
  module (no React, no PocketBase SDK) that computes the next interval/ease
  factor/due date for a card given a rating. It runs client-side today — the
  review session page calls it directly and writes the result straight to
  PocketBase — but its pure signature means it could move into a `pb_hooks`
  server-side hook later without changing its interface, only who calls it.

```
apps/web/          React/Vite frontend — the only app in this monorepo
pb_migrations/      Versioned PocketBase schema (collections + access rules)
pb_hooks/           Server-side JS hooks (currently: 30-day trash purge cron)
pb_data/            PocketBase's SQLite database + uploaded files (gitignored)
pb_public/          Built frontend, served by PocketBase (gitignored)
infra/               docker-compose.yml + .env.example for deployment
Dockerfile           web-build (throwaway, for deploy.sh) + pocketbase targets
deploy.sh            Builds the frontend and drops it into pb_public/
```

## Local development

You need Docker (to run a local PocketBase instance) and Node 20+ (for the
frontend dev server only — nothing else touches your host).

**1. Run PocketBase locally**, with its data directory outside the repo so it
never gets committed:

```bash
docker run --rm -it -p 8090:8090 \
  -v "$PWD/pb_migrations:/pb/pb_migrations:ro" \
  -v "$PWD/pb_hooks:/pb/pb_hooks:ro" \
  -v "$HOME/.repere-dev-data:/pb/pb_data" \
  --entrypoint sh alpine:3.20 -c "
    apk add --no-cache ca-certificates curl unzip &&
    curl -sSL -o /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.39.11/pocketbase_0.39.11_linux_amd64.zip &&
    unzip -q /tmp/pb.zip -d /pb &&
    /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data --migrationsDir=/pb/pb_migrations --hooksDir=/pb/pb_hooks
  "
```

(Or build just the `pocketbase` target from the root `Dockerfile` and run
that image instead — same result, cached after the first build.) On first
run, open `http://localhost:8090/_/` to create a superuser account for the
Admin UI; the app collections themselves come from `pb_migrations/`
automatically, no manual setup needed.

**2. Run the frontend dev server** pointed at your local PocketBase instead
of production:

```bash
cd apps/web
npm install
echo "VITE_PB_PROXY_TARGET=http://localhost:8090" > .env   # gitignored
npm run dev
```

Open `http://localhost:5173`. Without the `.env` override, the dev server's
`/api` proxy defaults to the production instance (`https://revise.fatih-kilic.fr`)
so `npm run dev` still works against real data if you just want to poke at
the UI — set the override whenever you want an isolated local database.

**Other commands**: `npm run build` (typecheck + production build),
`npm run test` (Vitest — currently covers the scheduler and streak
calculations, the two pieces of pure logic worth unit-testing).

## Deployment

Target: a Debian LXC on Proxmox at `/opt/revise`, running `pocketbase` and
`cloudflared` via Docker Compose, reachable only through a Cloudflare Tunnel
— no ports published on the host at all.

**1. First-time setup on the LXC:**

```bash
mkdir -p /opt/revise && cd /opt/revise
git clone <this repo> .
mkdir -p pb_data pb_public
cp infra/.env.example infra/.env
# edit infra/.env — fill in CLOUDFLARE_TUNNEL_TOKEN (see the comment in
# that file for exactly where to get it from Cloudflare Zero Trust)
```

**2. Build the frontend and start the containers:**

```bash
./deploy.sh                                    # builds apps/web, fills pb_public/
docker compose -f infra/docker-compose.yml up -d --build
```

`deploy.sh` only needs Docker on the host — the Vite build runs inside a
throwaway container (`web-build` target), so Node is never installed on the
LXC itself. Re-run it alone for a frontend-only change (no restart needed,
PocketBase serves `pb_public/` straight from disk); re-run the `docker
compose up -d --build` line too if you changed `pb_migrations/`,
`pb_hooks/`, the Dockerfile, or the pinned `PB_VERSION`.

**3. First run**: visit `https://<your-domain>/_/` to create a superuser
account. Put that path behind Cloudflare Access (Zero Trust → Access →
Applications) so the admin UI isn't reachable by anyone who just knows the
URL — the rest of the app is intentionally open at the root path since it's
protected by PocketBase's own per-user auth and collection rules instead.

### Backup & restore

The entire application state — every user, subject, chapter, question,
review log, and uploaded image — lives in `pb_data/`. Back it up like any
SQLite-based app:

```bash
# Backup: stop writes briefly, or just accept a point-in-time copy of a
# WAL-mode SQLite db (safe in practice for a low-write personal app)
docker compose -f infra/docker-compose.yml exec pocketbase \
  tar -C /pb -czf - pb_data > repere-backup-$(date +%F).tar.gz

# Restore: stop the stack, replace pb_data/, start it again
docker compose -f infra/docker-compose.yml down
rm -rf pb_data && mkdir pb_data
tar -xzf repere-backup-2026-01-01.tar.gz -C .
docker compose -f infra/docker-compose.yml up -d
```

PocketBase also has a built-in backup feature in its Admin UI (Settings →
Backups) that snapshots `pb_data/` to a zip on a schedule, if you'd rather
not script it. Separately, each user has a **Paramètres → Exporter mes
données** button that downloads their own subjects/chapters/questions/review
history as JSON — a personal-level export, not a substitute for backing up
`pb_data/` itself (it doesn't include other users' data, uploaded images, or
anything needed to actually restore the app).

## Known limitation: auth token storage

PocketBase's JS SDK stores its auth token in `localStorage` (via
`LocalAuthStore`), not an httpOnly cookie — meaning a successful XSS attack
could exfiltrate a logged-in session, which wouldn't be possible with an
httpOnly cookie. This is a real regression compared to a hand-rolled
httpOnly-cookie auth setup, and it's the main tradeoff accepted by moving
this app onto PocketBase's built-in auth rather than maintaining custom
session handling.

Accepted as a reasonable risk for a small, personal, two-user app — with
these mitigations in place to actually keep XSS from happening in the first
place:

- No `dangerouslySetInnerHTML` anywhere in the app **except** for KaTeX's
  own rendered output (`apps/web/src/components/MathText.tsx`), which runs
  in KaTeX's non-trust mode (`throwOnError: false`, no `trust` option
  enabled) — KaTeX itself is designed to safely render arbitrary
  user-supplied LaTeX without emitting attacker-controllable HTML/JS.
- All other user-supplied content (question/answer text outside of `$...$`
  math delimiters, subject/chapter names, etc.) is rendered as plain React
  children, which auto-escapes by default.
- No `eval`, no dynamically constructed script tags, no third-party
  analytics/ad scripts that could be compromised upstream.

If this were ever opened up beyond a couple of trusted users, migrating to a
`pb_hooks`-based httpOnly-cookie auth wrapper (PocketBase supports this,
just not out of the box) would be the natural next step.
