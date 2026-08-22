# AkiTrade Android Store Release Guide

## Release Identity

| Field | Prepared value |
| --- | --- |
| Product name | Exness Auto Trader |
| Project identity | AkiTrade |
| Android package | `com.app.akitrade` |
| Initial version | `1.0.0` |
| Initial Android version code | `1` |
| Distribution artifact | Signed Android App Bundle (`.aab`) for Google Play production builds |
| Internal/alternative artifact | Signed APK from the `preview` profile |

The Android package name should be treated as permanent once it has been used in Google Play. Future releases must increase the Android version code. The configured production profile automatically increments it.

## Signing Preparation

AkiTrade is configured for managed Android signing through the project publishing flow and EAS build profiles. No keystore, broker credential, Vercel token, or Expo token is committed to the repository. When you click **Publish** in the project interface, use the **production** profile to generate the Play Store `.aab`; use **preview** only when an APK is required for controlled testing or an alternative distributor.

> Do not generate Android artifacts manually in the sandbox. Use the project **Publish** control to create a managed, signed build and download the resulting artifact from the publishing workflow.

## Google Play Submission Checklist

| Submission item | AkiTrade requirement |
| --- | --- |
| App access | State that sign-in is required for the paper-trading workspace; provide a review account only if Play Console requests it. |
| Data safety | Declare account/profile information, trading configuration, notification token, and server-side workspace data according to the final backend implementation. |
| Privacy policy | Publish a public privacy policy before submission; it must state that broker passwords are not collected by the app and describe server-side secret handling. |
| Financial functionality | Describe the current release accurately as paper/demo trading and risk-monitoring software. Do not claim profitability, guaranteed returns, or personalized investment advice. |
| Content rating | Complete the Play Console questionnaire from the actual release functionality. |
| Store assets | Provide final screenshots, feature graphic, app description, support email, and privacy-policy URL. |
| Testing | Start with the Internal testing track, validate authentication, notifications, paper orders, emergency stop, and account-link disconnect, then progress through Play Console review. |

## Alternative Distribution

Softonic and other alternative distributors typically require a signed Android APK, product description, screenshots, version details, and a support/privacy-policy URL. Use the `preview` signing profile to obtain an APK only after completing internal testing. Follow each distributor’s current submission policy and malware/security scan requirements.

## Web Control Plane

The currently verified public AkiTrade control-plane link is [https://akitrade-pnwe78x4.manus.space](https://akitrade-pnwe78x4.manus.space). It hosts the root operational dashboard and `/api/status`. The Vercel control plane remains a separate delivery target and must be configured with its backend database and authentication environment variables before it is promoted. The mobile app does not contain the Vercel, Expo, broker, or signing credentials.

## Release Gate

Before making a store submission or enabling any future live order path, complete independent security testing, broker authorization checks, privacy-policy review, and a compliance assessment for all target distribution jurisdictions. Version one remains paper-first, and the existing hard live-dispatch lock must remain enabled.
