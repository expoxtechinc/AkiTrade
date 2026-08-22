# Vercel Runtime Diagnosis

## Verified production failure

The Vercel production deployment built successfully but every public route returned `FUNCTION_INVOCATION_FAILED`. A live runtime-log capture identified the startup exception:

> `Error [ERR_REQUIRE_ESM]: require() of ES Module .../jose/dist/webapi/index.js from .../server/_core/sdk.js not supported.`

The Vercel Node function is packaged as CommonJS while the installed `jose` package is ESM-only. The remedy is to load `jose` with an asynchronous dynamic `import("jose")` at the session-signing and session-verification call sites, rather than a static module import that Vercel transforms into `require()`.

## Deployment conventions confirmed

Vercel documents that a root `server.ts` Node server is detected when it calls `server.listen()` or its equivalent server startup pattern. The AkiTrade deployment uses a root Express entrypoint with `app.listen(...)`, not a static output directory.

## References

[1] [Vercel — Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js)

[2] [Vercel — Express on Vercel](https://vercel.com/docs/frameworks/backend/express)

[3] [Vercel — FUNCTION_INVOCATION_FAILED](https://vercel.com/docs/errors/function_invocation_failed)
