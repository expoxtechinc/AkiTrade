# AkiTrade Release Execution Handoff

## Verified Pre-Release State

The non-production validation suite passes with **19 tests**, TypeScript validation, Expo configuration validation, and production API/worker builds. The Android application is configured with package `com.app.akitrade`, version `1.0.0`, Android version code `1`, and managed EAS signing profiles. The public control-plane dashboard currently responds at [https://akitrade-pnwe78x4.manus.space](https://akitrade-pnwe78x4.manus.space).

> AkiTrade version one remains paper/demo only. Broker passwords are not stored in the mobile application, and live order dispatch remains technically disabled.

## Android Store Build

Use the project **Publish** control, rather than a sandbox command, to create Android release artifacts with managed signing.

| Objective | Publish selection | Result |
| --- | --- | --- |
| Google Play internal testing or production | `production` | Signed `.aab` with automatically increasing Android version code |
| Controlled tester distribution / alternative distributors | `preview` | Signed `.apk` |

After the signed artifact is generated, upload the `.aab` to Play Console’s Internal testing track first. Complete the Data Safety form, public privacy policy, content rating, app access, store listing assets, and financial-product disclosures using the actual paper-trading functionality. For Softonic or another distributor, use the preview `.apk` only after internal testing and follow that distributor’s current malware/security review policy.

## Vercel Web Control Plane

The previous Vercel production build failed because it expected a `public` directory. The repository now includes `vercel.json` with `outputDirectory: "dist"`, matching the validated API/worker build output.

Once the approved checkpoint is on GitHub `main`, open **Vercel → AkiTrade → Deployments** and select **Redeploy** for the latest `main` commit. Confirm Vercel uses the repository’s `vercel.json`, then verify:

1. `/` returns the AkiTrade Control Plane dashboard.
2. `/api/status` returns a healthy control-plane response.
3. The dashboard reports `PAPER-FIRST` and no broker adapter reports live dispatch enabled.

## Post-Release Safety Gate

Do not turn on a live broker adapter simply because the app or backend is deployed. First complete an independent security review, broker authorization and API entitlement setup, privacy/compliance review, operator monitoring, and explicit user-consent testing. No implementation should claim guaranteed profits or winning trades.
