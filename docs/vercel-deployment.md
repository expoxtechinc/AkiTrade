# AkiTrade Vercel Deployment Runbook

## What Vercel Hosts

The repository now exposes the AkiTrade control plane through the root `server.ts` Vercel-compatible Express entrypoint. The root route serves the public system dashboard and `/api/status` reports a non-sensitive MT5 bridge summary. The browser dashboard is intentionally limited to control-plane and bridge readiness; it never returns credentials, account balances, open positions, or trade decisions.

| Route | Vercel behavior | Purpose |
| --- | --- | --- |
| `/` | Root Express entrypoint | AkiTrade system and MT5 bridge health dashboard |
| `/privacy` | Root Express entrypoint | Public Privacy Policy for product and Google OAuth configuration |
| `/terms` | Root Express entrypoint | Public Terms of Service for product and Google OAuth configuration |
| `/api/health` | Root Express entrypoint | Liveness probe |
| `/api/status` | Root Express entrypoint | Public, non-sensitive system and MT5 bridge status |
| `/api/trpc/*` | Root Express entrypoint | Authenticated mobile application API |

Vercel supports exporting an Express application as the default export of a serverless function. [1] The deployment uses that model through the documented root `server.ts` entrypoint, which exports AkiTrade's shared Express application. [2]

## Constraints

Vercel is appropriate for the public dashboard and request/response API. It is **not** the persistent MT4/MT5 terminal bridge: that bridge must remain in a separately controlled terminal environment. The included worker remains non-executing and must not be used as a broker dispatcher on Vercel.

The Expo credential is stored only as `EXPO_TOKEN` in the secure project environment and was validated against Expo without logging its value. For a production Android build, the Expo project must first be linked to EAS and have an `eas.json` profile. Expo documents that access tokens belong in `EXPO_TOKEN` for automated EAS commands and should be treated like passwords. [3]

## One-Time Deployment Setup

1. Open the [existing AkiTrade Vercel project](https://vercel.com/expoxtechincs-projects/akitrade) and confirm it is linked to `expoxtechinc/AkiTrade` with `main` as the production branch.
2. In **Settings → General**, keep the project root at the repository root, use Node.js **22.x**, and select the **Express** framework preset.
3. In **Settings → Build and Deployment**, use `pnpm install --frozen-lockfile` as the install command and `pnpm build` as the build command. Leave **Output Directory** unset/auto-detected. This project uses Vercel Functions from `api/`; `dist` contains build artifacts for the server and must not be published as a static site.
4. In **Settings → Environment Variables**, configure server-only values for protected application workflows. Never copy `EXPO_TOKEN`, `VERCEL_TOKEN`, broker secrets, or any secret into browser-prefixed variables.

| Variable | Use | Needed before a working authenticated production API? |
| --- | --- | --- |
| `DATABASE_URL` | Database-backed users, paper workspaces, audit records, and protected APIs | Yes |
| `JWT_SECRET` | Secure session signing and validation | Yes |
| `VITE_APP_ID` | OAuth application identity used by the backend | Yes |
| `OAUTH_SERVER_URL` | Managed OAuth exchange and user lookup | Yes |
| `VITE_OAUTH_PORTAL_URL` | OAuth authorization portal for the web client | Yes for managed sign-in |
| `EXPO_PUBLIC_APP_ID` | Public mobile/web OAuth application identifier | Yes for client sign-in |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Public mobile/web OAuth portal endpoint | Yes for client sign-in |
| `EXPO_PUBLIC_API_BASE_URL` | Public API origin used by the web/mobile client | Yes for Vercel-backed client calls |
| `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` | Optional server-side storage proxy | Only if storage proxy is enabled |

Set `EXPO_PUBLIC_API_BASE_URL` to the deployed Vercel HTTPS domain only after it is available. If the web client authenticates against Vercel, the OAuth callback URL must resolve to `https://<production-domain>/api/oauth/callback`. If direct Google sign-in is added later, configure the verified public `https://<production-domain>/privacy` and `https://<production-domain>/terms` addresses in the Google Cloud consent screen. Keep any future Google client secret server-side.

The Android binary is not hosted by Vercel. After the API domain has been verified, build the Android app through the managed project Publish flow.

## Production Deployment Procedure

1. Open **Deployments** in the existing Vercel AkiTrade project.
2. Locate the newest deployment sourced from the GitHub `main` branch. Confirm that the commit includes the Privacy Policy, Terms of Service, `vercel.json` route changes, and this runbook.
3. Open the deployment menu and select **Redeploy**. Keep every live broker-dispatch feature disabled; deployment must preserve the paper-first boundary.
4. Wait for the build result. If `/` shows bundled server source or any public route returns `FUNCTION_INVOCATION_FAILED`, remove any project-level static Output Directory override and confirm the committed `vercel.json` has no `outputDirectory` value. Vercel must invoke the root `server.ts` Express entrypoint, not serve the build artifacts in `dist` directly.
5. When the deployment is marked **Ready**, open the production domain and run the acceptance checks below. If any critical check fails, use Vercel’s rollback action to return to the previous successful deployment.

## Production Acceptance Checks

| Check | Expected result |
| --- | --- |
| Root dashboard | `/` loads without `Cannot GET /`. |
| Legal pages | `/privacy` and `/terms` each return their public HTML pages. |
| Health endpoint | `/api/health` returns a successful JSON response with `ok: true`. |
| Status endpoint | `/api/status` returns the control-plane status and paper-first adapter context. |
| Security boundary | The UI does not request broker passwords and no adapter reports live order dispatch enabled. |
| Authenticated flow | After all required production environment values are configured, sign-in creates a secure session without exposing secrets in source or browser logs. |

## After Deployment

Record the Vercel production URL in the Google OAuth consent-screen settings, Android store listing, and support materials. Complete the Google-owned OAuth client setup before enabling direct Google sign-in. Any live broker integration requires a separate official-API, security, compliance, monitoring, and explicit user-consent release.

## References

[1] [Vercel — Deploying Express](https://vercel.com/docs/frameworks/backend/express)

[2] [Vercel — Rewrites](https://vercel.com/docs/rewrites)

[3] [Expo — Programmatic Access](https://docs.expo.dev/accounts/programmatic-access/)
