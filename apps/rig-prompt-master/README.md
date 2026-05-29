# RIG Master Prompter

This folder owns the canonical RIG Master Prompter product surface. It is now a Next.js/Vercel-ready full-stack app with a local development store, v15 catalog APIs, context sync adapters, prompt runs, structured v10 DoneContracts, approval-gated agent runs, and ProofPacket recall.

- App bundle: `RIG Master Prompter.app`
- Backup launcher: `RIG Master Prompter.command`
- Local URL: `http://127.0.0.1:8767`
- v10 plan: `docs/v10-master-plan.md`
- Production runtime: Next.js on Vercel plus the Postgres schema in `migrations/001_initial.sql`
- Compatibility bridge: `python/rig/rig_app_server.py` remains as fallback until parity is no longer needed

## Local Development

```bash
cd apps/rig-prompt-master
npm install
RIG_DEV_ALLOW_ANON=1 npm run dev -- -H 127.0.0.1 -p 8767
```

Then open `http://127.0.0.1:8767`.

## Desktop App

```bash
cd apps/rig-prompt-master
npm run build
npm run desktop:build
open "RIG Master Prompter.app"
```

The desktop app is a native macOS WebView wrapper. It starts the local Next.js server when needed, loads the same frontend workbench, and talks to the same `/api/v1/*` backend routes. Use `RIG_MASTER_PROMPTER_URL` to point the wrapper at a hosted Vercel deployment instead of the local server.

## API Surface

- `POST /api/v1/prompt-runs`
- `GET /api/v1/prompt-runs/:id`
- `GET /api/v1/context-sources`
- `POST /api/v1/context-sources/:id/sync`
- `POST /api/v1/agent-runs`
- `GET /api/v1/approvals`
- `POST /api/v1/approvals/:id/decision`
- `GET /api/v1/proof-packets/:id`
- `GET /api/v1/catalog/v15`
- `GET /api/v1/v10/readiness`

All `/api/v1/*` routes use the same production contract: OIDC/API-key ready, canonical JSON errors, no hidden writes, and explicit approval gates for repo writes, browser submits, account changes, external sends, private exports, and destructive actions.

## v10 Readiness

The app now exposes a v10 readiness cockpit in the main workbench and at `/api/v1/v10/readiness`. It records the current maturity, v10 target, KPI bar, Definition of Done, L0-L7 lattice, A1-A4 operating posture, Double Double Diamond, IQRSQPI, and BMS/BMX confidence policy. The durable planning artifact is `docs/v10-master-plan.md`, including the 100 future-back questions with answers and solution actions.

## Deployment Notes

1. Create managed Postgres with pgvector.
2. Apply `migrations/001_initial.sql`.
3. Configure `RIG_API_KEY` or OIDC env vars from `.env.example`.
4. Deploy from the repository root and set the Vercel build command to `cd apps/rig-prompt-master && npm run build` so the root `catalogs/` directory is available to the app.
5. Run full agents and browser automation in a separate Docker worker. Vercel functions should remain the UI/API control plane, not the long-running agent executor.

The desktop launcher opens the same canonical system. If the Next app is not installed locally, it falls back to the Python compatibility bridge.
