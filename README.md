# ai-usage-detect

This repository contains two independent projects:

- **[`ai_usage_detect/`](ai_usage_detect/)** — a small Python heuristic scorer for spotting text with surface-level signs of being AI-generated (stock phrases, repeated sentence openers, low lexical variety).
- **AI Humanizer app** (repo root) — an Expo (React Native) implementation of the "AI Humanizer" mobile app UI, built from a Claude Design HTML/JSX handoff and the accompanying BRD.

## Python: AI-text heuristic detector

```python
from ai_usage_detect import analyze_text

result = analyze_text("As an AI language model, I don't have personal opinions.")
print(result.score, result.likely_ai_generated, result.signals)
```

Tests:

```
pip install pytest
pytest tests/
```

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
