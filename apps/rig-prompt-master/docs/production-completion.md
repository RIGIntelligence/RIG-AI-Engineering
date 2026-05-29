# RIG Master Prompter Production Completion

## What Is Operational Locally

- Next.js app and API run as the canonical RIG Master Prompter control plane.
- Desktop app opens the same product surface from `/Applications` and the Mac Desktop symlink.
- Prompt runs produce fixed prompts, DoneContracts, citations, selected v15 questions, gates, scores, and ProofPacket ids.
- Context sync has real adapter boundaries for GitHub, Gitea, QNAP local mount or SSH alias, Recall.it API or local scraper bridge, uploads, approved URLs, and local repo folders.
- Missing GitHub/Gitea/QNAP/Recall.it configuration is truth-labeled as setup-needed instead of faked.
- API auth supports `x-rig-api-key`, `Authorization: Bearer`, plain env keys, and SHA-256 hashed scoped key records.
- Agent runs create worker-job evidence; risky browser/repo work cannot advance without approval.
- Postgres/pgvector migrations include workspaces, prompts, context, approvals, ProofPackets, connector installations, local bridge registrations, worker jobs, artifacts, and vector matching.

## Required Secrets And Local Paths

Use these only in your shell, Vercel project, launchd plist, or local bridge config. Do not commit them.

```bash
export RIG_API_KEY="replace-with-local-dev-key"
export RIG_API_KEYS_JSON='[{"label":"mike-local","keyHash":"sha256-of-key","scopes":["*"]}]'
export RIG_GITHUB_REPOS="rodgemd1-lgtm/RIG-AI-Engineering"
export GITHUB_TOKEN="github-token-for-private-reads"
export RIG_GITEA_URL="https://your-gitea.example"
export RIG_GITEA_TOKEN="gitea-token"
export RIG_QNAP_MOUNT="/Volumes/RIG"
export RIG_QNAP_SSH_ALIAS="qnap"
export RIG_QNAP_REMOTE_ROOT="/share/Public/RIG"
export RIG_RECALL_API_URL="https://recall.example/api/search"
export RIG_RECALL_API_KEY="recall-token-if-required"
export RIG_RECALL_SCRAPER="/Users/mikerodgers/Desktop/Startup-Intelligence-OS/rig-scout-node/threat_intel/recall_scraper.py"
```

The Mac app reads `~/.rig/rig-master-prompter.env`, `.env.local`, and `.env` before launching the backend. This matters for Dock launches because macOS apps do not inherit terminal shell variables.

## Cloud Cutover Checklist

1. Create managed Postgres with pgvector enabled.
2. Apply `migrations/001_initial.sql`, then `migrations/002_connectors_workers_bridge.sql`.
3. Configure Vercel env vars for database, auth, and connector read credentials.
4. Set `RIG_DEV_ALLOW_ANON=0` and configure either OIDC or scoped API keys before public deployment.
5. Deploy the Next.js control plane to Vercel.
6. Run the local bridge on Mike's Mac or QNAP with read-only mounts first.
7. Move browser/repo agent adapters into a Docker worker with the same approval and ProofPacket contract.
8. Sign and notarize the Mac launcher when Apple Developer credentials are available.

## Still Account-Dependent

- Private GitHub/Gitea indexing needs scoped tokens.
- QNAP indexing can use the LAN mount path or the configured read-only SSH alias bridge.
- Recall.it retrieval can use the direct API endpoint or the existing local Recall scraper bridge.
- Vercel deployment needs the target project and managed Postgres credentials.
- Notarization needs Apple Developer signing identity and notary credentials.
