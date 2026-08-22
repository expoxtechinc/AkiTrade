# Railway Deployment Preparation

## Service Topology

This repository contains two Railway-ready process roles. The **control-plane service** runs `pnpm start`, exposes the authenticated tRPC API, and uses `/api/health` for a deployment health check. The optional **worker service** runs `pnpm start:worker`. It publishes heartbeats only and is intentionally unable to send broker orders in this release.

| Railway service | Start command | Purpose | Execution authority |
| --- | --- | --- | --- |
| `akitrade-api` | `pnpm start` | Mobile control plane, authentication, account-link preparation, paper-trading API, audit data | None for external brokers |
| `akitrade-worker` | `pnpm start:worker` | Continuous health/operational heartbeat | None; order dispatch is hard-disabled |

Railway can deploy a Node/Express service from a connected GitHub repository, supports a health-check path, and provides environment variables to build and deployment processes. [1] The `railway.json` file supplies those settings for the API service. Railway variables can be sealed so their values are not visible in the UI or returned through normal variable access. [2]

## Deployment Steps

Create a Railway project from the `expoxtechinc/AkiTrade` GitHub repository. Railway will use `railway.json` to build the API and start it with `pnpm start`. Set the health check to `/api/health` if it is not picked up automatically. Generate a public API domain only after configuring the production OAuth callback URLs for the chosen identity provider.

Create a second service from the same repository for the worker role and override its start command to `pnpm start:worker`. The worker is an operational placeholder, not an execution engine. Do not enable a broker dispatcher in Railway: MT4/MT5 require a terminal-side bridge running with the user-controlled terminal environment, as documented in `docs/live-integration-architecture.md`.

Copy only the **names** from `.env.railway.example` into Railway’s Variables panel. Set secret values there, then seal credentials such as `DATABASE_URL` and `JWT_SECRET`. Never commit `.env`, broker API tokens, terminal passwords, private keys, or OAuth client secrets. Railway’s variable changes are staged for review before deployment. [2]

## Required Production Prerequisites

| Requirement | Why it is required |
| --- | --- |
| Production database with TLS | Persists audited connection, consent, and paper-trading records safely |
| Production OAuth application and redirect URLs | The mobile client needs an approved sign-in endpoint; local development OAuth values are not deployment secrets |
| Sentry or equivalent error monitoring | Detects server/worker crashes and unhandled authentication errors |
| Separate secure secrets manager or per-user encrypted vault | Holds any future revocable broker authorization material, never the mobile app or database fields |
| Terminal-side MT4/MT5 bridge deployment | Maintains the actual MT terminal boundary; a generic Linux Node service is not an MT terminal |
| Independent security and compliance review | Required before adding any live order dispatcher or holding third-party broker tokens |

> **Live trading remains disabled.** A deployed API and worker do not make the product a live trading system. Any future activation must add the reviewed terminal/API adapter, explicit user authorization, an irreversible-action confirmation, validated risk controls, monitoring, incident response, and jurisdiction-specific legal/compliance work.

## References

[1] [Railway — Deploy a Node.js and Express API](https://docs.railway.com/guides/deploy-node-express-api-with-auto-scaling-secrets-and-zero-downtime)

[2] [Railway — Using Variables](https://docs.railway.com/variables)
