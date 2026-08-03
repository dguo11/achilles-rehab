# Achilla

A rehab companion for recovery from an Achilles tendon rupture — surgical and
non-surgical. Achilla turns a clinical rehab protocol into a personalized,
trackable daily program.

**Not a medical device.** Achilla does not replace advice from your surgeon
or physical therapist. Every generated plan is shown read-only until you
confirm you've reviewed it with your PT.

## Stack

- Next.js (App Router) + TypeScript + Tailwind, mobile-first
- Supabase (Postgres + Auth + Storage), Row Level Security on every user table
- Google Gemini API for bounded personalization (server-side only)
- Deploy target: Cloudflare Workers via `@opennextjs/cloudflare`

## Development

```bash
cp .env.example .env.local   # fill in Supabase project values
npm install
npm run dev                  # Next.js dev server, http://localhost:3000
```

## Cloudflare preview / deploy

```bash
npm run preview   # build + run in the actual Workers runtime locally
npm run deploy     # build + deploy to Cloudflare Workers
```

Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) are set with
`wrangler secret put <NAME>`, not committed.

> `src/middleware.ts` deliberately uses Next.js's deprecated
> `middleware`/Edge-runtime convention rather than Next 16's `proxy.ts`:
> `@opennextjs/cloudflare` doesn't yet support the new Node.js-runtime proxy.
> Switch back once
> [opennextjs-cloudflare#962](https://github.com/opennextjs/opennextjs-cloudflare/issues/962)
> is resolved.
