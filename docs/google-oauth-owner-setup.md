# Google Sign-In Ownership Setup

## What AkiTrade Already Provides

The Android client already uses a secure browser-based managed OAuth flow and exchanges the returned authorization code on the backend. The client does not store a Google client secret, broker password, refresh token, or broker API secret. The existing authentication screen can continue to use this managed flow when its configured sign-in portal offers Google as an identity provider.

> Authentication and authorization must remain distinct: sign-in establishes the user identity, while any later access to a third-party account must be separately requested, scoped, revocable, and auditable. [1]

## Direct Google OAuth: One-Time Owner Tasks

Direct Google sign-in cannot be activated without a Google Cloud project owned by the application operator. Google requires OAuth client credentials, consent-screen branding, and authorized redirect URIs for the application. [2]

| Owner task | Required value or action |
| --- | --- |
| Create Google Cloud project | Establish an operator-owned Google Cloud project for AkiTrade. |
| Configure OAuth branding | Add the product name, logo, homepage, privacy-policy URL, and terms URL. |
| Create Android OAuth client | Use package `com.app.akitrade` and the SHA-1 fingerprint of the managed production signing certificate. |
| Create Web OAuth client | Register the secure production backend callback URL exactly; Google validates redirect URIs as exact matches. [2] |
| Store backend credentials | Add `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` only as server secrets. Never commit them or ship the secret in the Android binary. [2] |
| Choose minimal scopes | Use basic OpenID profile/email identity scopes for sign-in. Request any additional Google scopes only when the user invokes a feature that needs them. [1] |
| Complete verification when applicable | Follow Google’s consent-screen and scope-verification process before public use if requested by the platform. [2] |

## Secure Technical Boundary

When the owner creates the clients, the native app should obtain an authorization code through the system browser and send that short-lived code to the backend. The backend exchanges it and stores any long-lived token only in protected server storage. Google specifically advises against storing long-lived refresh tokens on a device. [1]

Broker/exchange connections remain separate from Google identity. Each connection must use the provider’s official authorization mechanism, request only the required scopes, keep authorization references server-side, support disconnect/revocation, and remain in paper mode unless an independently approved future release introduces an explicit user-confirmed order flow.

## References

[1] [Android Developers — Authorize access to Google user data](https://developer.android.com/identity/authorization)

[2] [Google Identity — OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
