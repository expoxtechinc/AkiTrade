# Vercel Deployment Preparation

## What Vercel Hosts

The repository now exposes the AkiTrade control plane as Vercel-compatible serverless Express functions. The root route serves the public system dashboard and `/api/status` reports a non-sensitive MT5 bridge summary. The browser dashboard is intentionally limited to control-plane and bridge readiness; it never returns credentials, account balances, open positions, or trade decisions.

| Route | Vercel behavior | Purpose |
| --- | --- | --- |
| `/` | Rewritten to the serverless Express root entry | AkiTrade system and MT5 bridge health dashboard |
| `/api/health` | Catch-all Express API function | Liveness probe |
| `/api/status` | Catch-all Express API function | Public, non-sensitive system and MT5 bridge status |
| `/api/trpc/*` | Catch-all Express API function | Authenticated mobile application API |

Vercel supports exporting an Express application as the default export of a serverless function. [1] The deployment uses that model through `api/index.ts` and `api/[...path].ts`; the root rewrite is defined in `vercel.json`. [2]

## Constraints

Vercel is appropriate for the public dashboard and request/response API. It is **not** the persistent MT4/MT5 terminal bridge: that bridge must remain in a separately controlled terminal environment. The included worker remains non-executing and must not be used as a broker dispatcher on Vercel.

The Expo credential is stored only as `EXPO_TOKEN` in the secure project environment and was validated against Expo without logging its value. For a production Android build, the Expo project must first be linked to EAS and have an `eas.json` profile. Expo documents that access tokens belong in `EXPO_TOKEN` for automated EAS commands and should be treated like passwords. [3]

## Deployment Setup

Link `expoxtechinc/AkiTrade` to the authorized Vercel team. Configure production environment variables for the API—at minimum `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `EXPO_PUBLIC_APP_ID`, `EXPO_PUBLIC_API_BASE_URL`, and `EXPO_PUBLIC_OAUTH_PORTAL_URL`. Never copy `EXPO_TOKEN` to public or browser-prefixed variables.

Set `EXPO_PUBLIC_API_BASE_URL` to the deployed Vercel HTTPS domain only after it is available, then build the Android app through the project’s Publish flow. The native Android binary is not hosted by Vercel.

## References

[1] [Vercel — Deploying Express](https://vercel.com/docs/frameworks/backend/express)

[2] [Vercel — Rewrites](https://vercel.com/docs/rewrites)

[3] [Expo — Programmatic Access](https://docs.expo.dev/accounts/programmatic-access/)
