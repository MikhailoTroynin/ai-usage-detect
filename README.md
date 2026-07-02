# ai-usage-detect

**AI Humanizer app** — an Expo (React Native) implementation of the "AI Humanizer" mobile app UI, built from a Claude Design HTML/JSX handoff and the accompanying BRD.

## Expo app: AI Humanizer

Expo (React Native) implementation of the "AI Humanizer" mobile app UI, built from a Claude Design HTML/JSX handoff (`AI Humanizer.html` prototype) and the accompanying BRD.

### Status

This is the **frontend/UI layer only** — a pixel-faithful port of the design prototype's 9 screens, navigation, theming and mock data. It is not yet wired to a backend.

Implemented:
- Onboarding, Home/Dashboard, Humanize editor, Processing pipeline animation, Result (sentence highlighting + alternative rewrites), AI Detector funnel, Readability Metrics, Pricing, Profile/Settings
- Light/dark theming (follows system, with manual override in Account → Appearance)
- Custom tab bar, bottom sheets, gauges, and the rest of the design system, using mock/demo data matching the original prototype

Not implemented (out of scope for this pass — see `design-handoff/uploads/BRD AI detect.txt` for the full spec):
- Real humanization pipeline (LLM rewrite via OpenRouter/Claude/Llama, regex post-processing, multi-model chaining)
- Real AI detection (GPTZero/Turnitin/Copyleaks/Originality.ai integrations)
- Auth, Supabase/Postgres backend, credits/RLS logic
- Stripe billing + Stripe Sync Engine

### Getting started

```bash
npm install
npm run start   # then press i / a / w, or scan the QR code with Expo Go
```

### Backend proxy (`supabase/functions/`)

`POST /humanize` and `POST /alternatives` are minimal Supabase Edge Functions (Deno/TS) that call the Anthropic API. They keep `ANTHROPIC_API_KEY` server-side only — it is never bundled into the Expo client.

`POST /detect` scores text with a heuristic AI-detector (stock phrases, repeated sentence openers, low lexical variety) — no external API or key required. It returns sentence-level `red`/`amber`/`green` risk plus an overall score, behind an `AiDetector` interface designed to be swapped for a real GPTZero/Turnitin integration later without changing callers.

Client configuration (Expo public variables only):

```bash
# Optional; defaults to the local Supabase Functions URL below
EXPO_PUBLIC_API_URL=http://127.0.0.1:54321/functions/v1

# Optional; defaults to 45000 ms
EXPO_PUBLIC_API_TIMEOUT_MS=45000
```

Only `EXPO_PUBLIC_*` values are bundled into the Expo client, so never place provider API keys there. Keep secrets in Supabase Edge Function environment variables.

Local development:

```bash
cp supabase/.env.example supabase/.env.local   # fill in ANTHROPIC_API_KEY, keep this file local-only
npx supabase start
npx supabase functions serve --env-file supabase/.env.local
```

Deploy:

**No computer / browser only?** See [`supabase/DEPLOY-UA.md`](supabase/DEPLOY-UA.md) for a
click-by-click, browser-only path that lets GitHub Actions do the deploy for
you (`.github/workflows/deploy-supabase.yml`). Add three repository secrets
(`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `ANTHROPIC_API_KEY`) and press
**Run workflow** — no local CLI needed.

Or, with the CLI on your own machine:

```bash
# One-shot: link + set the ANTHROPIC_API_KEY secret + deploy all three functions.
# Reads the (gitignored) key from supabase/.env.local; must run locally by the
# project owner with the supabase CLI logged in.
supabase/deploy.sh <your-project-ref>
```

Or run the equivalent steps by hand:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set --env-file supabase/.env.local
npx supabase functions deploy humanize
npx supabase functions deploy alternatives
npx supabase functions deploy detect
```

After deploy, point the Expo client at the deployed Functions URL:

```bash
EXPO_PUBLIC_API_URL=https://<your-project-ref>.supabase.co/functions/v1
```

Never commit `supabase/.env.local` or paste API keys into chat/commits — the `.env*.local` pattern is already gitignored. If a key is ever pasted somewhere it could be logged (chat, CI logs, issue text), treat it as compromised and rotate it in the Anthropic Console.

These functions require a signed-in Supabase user: `_shared/auth.ts` (`requireUser`)
validates the caller's access token via `GET /auth/v1/user` and rejects anonymous
requests with 401, so knowing the URL is not enough to spend the Anthropic key.
(`verify_jwt` is left `false`; the in-code guard is the enforcement, and it is
stronger — `verify_jwt` alone would also accept the public anon key.)

The client signs in with an email one-time code (`src/screens/Auth.tsx`,
`src/lib/supabase.ts`). It needs two public Expo variables — the anon key is a
public value, safe to ship in the client:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key from Project Settings → API>
```

### Design source

`design-handoff/` contains the original Claude Design HTML/JSX prototype and BRD this app was built from, kept for reference.

### Project structure

```
App.tsx                  entry point (theme provider + navigator)
src/
  theme/                 color tokens + light/dark ThemeContext
  data/                  mock content + icon path data (ported from the prototype)
  components/            shared UI primitives (Card, Button, Sheet, Gauge, TabBar, ...)
  screens/               the 9 app screens
  navigation/types.ts    screen name + editor state types
  RootNavigator.tsx       lightweight state-machine navigator (mirrors the prototype's screen switch)
```
