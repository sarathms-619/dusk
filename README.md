# Dusk

For the hour between who you were and who you're becoming.

Dusk is a tarot companion for life's in-between moments. Each evening at sunset you pick a card from three face-down cards, sit with one question, and write a few lines. The Reader (Claude) reflects back what it notices. Crossings last 3, 7, 21 or 40 cards, move through three movements (the Letting Go, the Threshold, the Return), and end with a Crossing Scroll.

Live: https://dusk-crossing.netlify.app

## Layout

| Path | What it is |
|---|---|
| `site/index.html` | The whole app: screens, styles, sign-in, sunset calculation |
| `site/art.js` | Draws all 78 cards and the card back as SVG line art |
| `site/cards.json` | The 78 cards: home movement, meaning, two evening questions, symbols |
| `worker/src/index.js` | Cloudflare Worker API: crossings, evenings, card offers, the single dusk |
| `worker/src/auth.js` | Google ID-token verification and signed session tokens |
| `worker/src/reader.js` | The Reader's prompts and Claude calls |
| `worker/schema.sql` | D1 tables: users, crossings, evenings, readings, checkins, anon_usage, reader_errors |
| `worker/migrations/` | One-off changes for databases created before them |

`worker/src/cards.json` is a copy of `site/cards.json`. Edit the site copy and copy it across.

## Running locally

```bash
cd worker && npm install
printf 'DEV_AUTH=1\nSESSION_SECRET=local-dev-secret-only\n' > .dev.vars
npx wrangler d1 execute dusk-db --local --file=schema.sql
npm run dev            # Worker on http://localhost:8787
cd ../site && python3 -m http.server 8788   # App on http://localhost:8788
```

On localhost the welcome screen shows "Sign in as a test user". Add `?test=1` to the address to open evenings any time; `?test=0` turns it off.

## Deploying

Worker (needs a Cloudflare API token with Workers and D1 edit access):

```bash
cd worker && npm run db:schema && npm run deploy
```

A new database only needs `schema.sql`. A database created before a migration in `worker/migrations/` needs that file run once:

```bash
npx wrangler d1 execute dusk-db --remote --file=migrations/002_outcomes.sql
```

Site: deploy the `site/` folder to the `dusk-crossing` Netlify site.

## Configuration

Worker secrets, set in Cloudflare (never in this repo):

- `ANTHROPIC_API_KEY`: used by the Reader
- `SESSION_SECRET`: signs session tokens

Worker variables in `wrangler.toml`: `GOOGLE_CLIENT_ID` (public) and `ALLOWED_ORIGINS`.

## Guardrails

- The Reader reflects and never predicts. Its rules are in `worker/src/reader.js`.
- If an entry suggests the person may be in crisis, the app shows support: Tele-MANAS 14416 and 112 in an emergency.
- A single dusk without signing in is limited to 6 Reader calls per visitor per day.
