# Signal

Private X content workspace: collect public X post links, deduplicate materials, review with rules or JEV, and save drafts.

## Vercel deployment

This checkout uses standard Next.js and Neon Postgres. It does not depend on ChatGPT Sites or Cloudflare D1.

1. Push this source to a **private GitHub repository** and import it into Vercel (Next.js preset).
2. Connect a Neon Postgres database through Vercel Storage / Marketplace.
3. Set `DATABASE_URL` and `SIGNAL_ACCESS_KEY` in Vercel. The access key must be a random secret of at least 32 characters. Generate it locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Do not commit either value.
4. With `DATABASE_URL` in the environment, run `pnpm db:migrate` once. The migration is idempotent and does not delete data.
5. Deploy, open `/login`, and enter the access key. All data endpoints require a signed, expiring session cookie. Missing access configuration fails closed.

## Public demo

Visitors to `/` without an owner session get a public demo. `/demo` always opens the demo, even for a signed-in owner. Materials, drafts, reviews, and profile settings use the browser-local `signal.public-demo.v1` storage key. Nothing is sent to the private data APIs or Neon. Different browser profiles have independent demo data; clearing browser storage removes it. Export JSON to keep a copy.

The demo supports example materials, text/JSON collection, deduplication, free rule-based review, drafts, and archive/done actions. Automatic X link resolution and paid JEV review remain private-only. `/login` retains owner access; authenticated `/` and all existing data APIs keep the existing access-key protections. No database migration is required for the demo.

## Local development

Use Node 22+ and the pnpm version in package.json. Run `pnpm install --frozen-lockfile`, copy `.env.example` to `.env.local`, fill its values, initialize the schema, then run `pnpm dev`.

For migration, load the environment explicitly: `node --env-file=.env.local scripts/migrate.mjs`.

## Moving existing materials

The original Sites database is not copied by deploying this repository. Export materials from the existing Collector as JSON. Use `node --env-file=.env.local scripts/import-materials.mjs /path/to/signal-materials.json` to preserve source IDs, text, drafts, reviews, statuses, reflection and timestamps. Matching IDs or fingerprints are skipped rather than overwritten. Existing profile settings must be copied into Settings separately. Exports may contain private drafts: never commit them.

## Limits

- Public X embeds can return shortened text for long posts. Private and deleted posts cannot be read this way.
- JEV keys are entered per browser session and are not stored in the database.
- This is a single-owner workspace, not a multi-user service.
- Database connection and live Vercel deployment must be verified after provisioning.

