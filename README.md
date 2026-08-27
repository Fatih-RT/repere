# Repère

A personal spaced-repetition study app. The content hierarchy is
**category → subject → chapter → question** (e.g. "L2 Chimie" → "Chimie
organique" → "Réactions" → a question) — category is the only optional level,
there purely to group subjects when a user is juggling more than one track
at once (a degree and a competitive exam prep, say). Alongside questions,
each subject (optionally scoped to one chapter) can also hold free-form
**notes** — course content rather than flashcards, see `apps/web/src/lib/
notes.ts` and `pb_migrations/1787658810_notes.js`. Questions and notes both
support KaTeX/mhchem, pasted images/formulas, and molecular structure
diagrams (see "Molecular structures" below); a dismissible "Aide
formules" popover — `apps/web/src/components/FormulaHelpButton.tsx` — is
available wherever you'd type one; review sessions run on an SM-2-derived
scheduler; there's a Pomodoro timer, a dashboard/statistics, and a
never-auto-emptied trash (see "Trash" below). Installable on iPhone/iPad via
Safari's "Add to Home Screen" (same build, same PocketBase backend — nothing
syncs separately, see `apps/web/public/manifest.webmanifest`), and works as
a normal website everywhere else. Built for exactly two users, both created
by hand from the PocketBase Admin UI — there is no public sign-up.
`apps/web/src/pages/RegisterPage.tsx` is kept in the repo but not routed;
see `pb_migrations/1787658780_close_registration.js`.

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

## Molecular structures (`$smiles{...}$`)

Alongside `$...$`/`$$...$$` KaTeX math and `\ce{}` (mhchem) equations,
questions/answers and notes support a third kind of inline span:
`$smiles{<SMILES string>}$`, rendered as a small 2D structure diagram
instead of being handed to KaTeX. Nobody is expected to type the SMILES by
hand — it's produced one of two ways while typing in any of those fields:

- **Type a formula or a name** (e.g. `C6H12O6` or `glucose`) and a dropdown
  offers the matching molecule(s) — with a thumbnail, name, formula and
  short description — to insert. A formula alone is often ambiguous (four
  different sugars share `C6H12O6`), which is the actual reason this is a
  selector and not a guess: the concrete SMILES is decided at insertion
  time, from a small local, hand-curated database
  (`apps/web/src/lib/molecules.ts`, ~35 entries covering the L2 chemistry
  program), never invented at render time.
- **Paste a SMILES string directly** (e.g. from a textbook/tool) — a paste
  that looks like SMILES (bond/branch/ring-closure punctuation) is wrapped
  as `$smiles{...}$` immediately, no dropdown.

Implementation notes:

- `apps/web/src/components/MoleculeDrawing.tsx` is the single seam onto the
  [smiles-drawer](https://github.com/reymond-group/smiles-drawer) npm
  package (pure JS/SVG, no WASM/native dependency) that actually draws a
  structure; it reads the app's theme tokens live off the DOM so it stays
  legible in Dark/Light/Rose, and renders an "invalid structure" fallback
  rather than throwing on a malformed SMILES.
- `apps/web/src/components/MoleculeAwareTextarea.tsx` wraps a plain
  `Textarea` with the live-detection dropdown and the paste interception,
  without swallowing any of the props the fast-entry flow depends on —
  Tab still moves focus normally, Ctrl+Enter is never intercepted even
  while the dropdown is open, and candidate selection uses
  `onMouseDown`+`preventDefault()` (not `onClick`) so the field is never
  blurred. It also suppresses all suggestions while the cursor sits inside
  an open `$...$` span (`isCursorInsideMath` in `molecules.ts`), which
  covers `\ce{}` for free since `\ce{}` only ever appears inside one.
- `MathText.tsx` renders the `$smiles{...}$` token as a small
  (~118×92px), inline-block `<MoleculeDrawing>` — deliberately not a
  full-width block — so it sits beside surrounding text and wraps with
  it, same as an inline image would, rather than pushing a block
  underneath. This is why it needs no separate layout in Notes/Cours vs.
  Questions vs. Révisions: all three already render question/answer/note
  text through `MathText`, so the same change lights up everywhere at
  once. Like KaTeX's own output, this never uses
  `dangerouslySetInnerHTML` with the raw SMILES string — the SVG is built
  by smiles-drawer through the DOM API and mounted as a normal React ref,
  and the SMILES itself is only ever passed down as a prop.

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
From the Admin UI, create the two real user accounts by hand (Collections →
`users` → New record) — registration is closed at the schema level, this is
the only way in.

### To do after the first start

Two settings genuinely can't be expressed as a migration — they live in
PocketBase's own runtime settings (`_params` table / Admin UI), not the
`_collections` schema — so nothing in `pb_migrations/` sets them, and it's
easy to forget them on a fresh deploy. Do both from `/_/` → **Settings**:

1. **Rate limit the auth routes** (Settings → Rate limiting): enable it and
   add rules for at least `POST /api/collections/users/auth-with-password`
   and `POST /api/collections/users/auth-refresh` — a handful of requests
   per IP per minute is plenty for two people logging in from their own
   devices, and it's the only thing standing between this instance and an
   unthrottled password-guessing loop against those two accounts.
2. **Turn on daily automatic backups** (Settings → Backups): enable
   scheduled backups, daily, with a handful of backups retained. This is
   separate from — and a better default than — the manual `tar` approach
   below, since it runs unattended.

### Trash

Deleting a category, subject, chapter, question, or note never removes it right
away — it's soft-deleted (`deleted_at` set) and shows up in **Paramètres →
Corbeille** with a "Restaurer" button, alongside a 5-second "Annuler" toast
at the moment of deletion itself. A `pb_hooks` cron (`pb_hooks/purge_trash.pb.js`)
permanently removes anything that's sat in the trash for more than 30 days —
that cron is the *only* thing that ever hard-deletes data in this app; there
is deliberately no manual "delete forever" button anywhere in the UI.

A few rules worth knowing if you're touching this code:

- Deleting a category **never** touches its subjects — `subjects.category`
  is not a cascading relation on purpose. A subject whose category was
  deleted (or is mid-30-day-countdown in the trash) just renders under
  "Sans catégorie" until the category is restored.
- Deleting a subject or chapter **does** cascade — to its chapters/questions
  /notes, or just its questions/notes, respectively — so trashing a subject
  actually hides everything under it, and restoring it brings all of that
  back together. See `buildSubjectCascadePlan`/`buildChapterCascadePlan` in
  `apps/web/src/lib/subjects.ts`. A note's own `chapter` relation is
  optional and non-cascading, same reasoning as `subjects.category`: it's
  the app-level cascade above, not the schema, that decides a note's fate
  when its chapter goes.
- `review_logs` are never deleted, by anything, ever — not by the purge
  cron (it only targets `categories`/`subjects`/`chapters`/`questions`/
  `notes`), and not by any UI action. A log's `question`/`session` relations quietly go
  empty once the record they pointed to is purged, but `question_text`/
  `answer_text` (snapshotted at review time) keep the log readable forever —
  see the manual test below.
- Settings shows a discreet banner once the trash holds more than 50 items,
  just so it doesn't silently pile up unnoticed — it's informational only,
  nothing about it forces a cleanup.

### Backup & restore

The entire application state — every user, subject, chapter, question,
review log, and uploaded image — lives in `pb_data/`. Two ways to back it up;
pick whichever restore path you'll actually want to use later.

**Option A — PocketBase's built-in backups** (what the automatic daily backup
above produces, and what you get if you trigger one by hand from Settings →
Backups → "Create backup"): a zip snapshot stored inside `pb_data/backups/`.

To restore one:

```bash
docker compose -f infra/docker-compose.yml down
# with the stack stopped, unzip the backup over a fresh pb_data/ — it
# contains a full replacement data.db, auxiliary.db, and storage/
rm -rf pb_data && mkdir pb_data
unzip pb_data_backup_2026-01-01T03_00_00.zip -d pb_data
docker compose -f infra/docker-compose.yml up -d
```

(You can also restore through the Admin UI itself — Settings → Backups →
pick the backup → Restore — while the instance is still running; PocketBase
handles stopping/swapping/restarting internally. The `docker compose down`
path above is the one that still works if the instance won't start at all.)

**Option B — a manual tar snapshot**, if you'd rather script your own backup
outside PocketBase's scheduler:

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

Separately, each user has a **Paramètres → Exporter mes données** button
that downloads their own subjects/chapters/questions/review history as
JSON — a personal-level export, not a substitute for either backup above
(it doesn't include other users' data, uploaded images, or anything needed
to actually restore the app).

### Manual test: a review log survives its question being deleted

Worth checking by hand after touching anything near `review_logs` or the
trash — this exercises the exact bug fixed by
`pb_migrations/1787658790_review_logs_snapshot.js` (a required, non-cascading
relation blocked deletion of any question that had ever been reviewed):

1. Create a question, then review it once from `/review/session` (any
   rating). This writes a `review_logs` row referencing that question.
2. Delete the question (from its chapter, or by deleting the chapter/subject
   it belongs to) — it goes to the trash (`deleted_at` set), nothing is hard-deleted yet.
3. From the PocketBase Admin UI (`/_/` → Collections → `questions`), hard-delete
   that same record — this is the same operation trash purging performs.
4. In Collections → `review_logs`, open the log row for that review. Expect:
   the `question` relation is now empty, but `question_text` and
   `answer_text` still hold the original text — the log is still fully
   readable. Before the fix, step 3 itself would have failed outright with
   a validation error on the `question` field.

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
  user-supplied LaTeX without emitting attacker-controllable HTML/JS. The
  `$smiles{...}$` molecule spans that same file renders (see "Molecular
  structures" above) go through `<MoleculeDrawing>` as a normal React
  prop instead — smiles-drawer builds the SVG via the DOM API, not string
  injection.
- All other user-supplied content (question/answer text outside of `$...$`
  math delimiters, subject/chapter names, etc.) is rendered as plain React
  children, which auto-escapes by default.
- No `eval`, no dynamically constructed script tags, no third-party
  analytics/ad scripts that could be compromised upstream.

If this were ever opened up beyond a couple of trusted users, migrating to a
`pb_hooks`-based httpOnly-cookie auth wrapper (PocketBase supports this,
just not out of the box) would be the natural next step.
