export function getAkiTradeControlPlaneLandingPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Exness Auto Trader — AkiTrade</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f8fc; color: #081a2a; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(680px, calc(100% - 40px)); padding: 32px; border: 1px solid #d9e2ef; border-radius: 24px; background: #ffffff; box-shadow: 0 16px 44px rgba(8, 26, 42, 0.08); }
      .mark { display: inline-grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; background: #e8f0ff; color: #1d6fe8; font-weight: 900; letter-spacing: .08em; }
      .eyebrow { margin: 24px 0 8px; color: #148a7c; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
      h1 { margin: 0; font-size: clamp(28px, 5vw, 40px); letter-spacing: -.04em; }
      p { margin: 16px 0 0; color: #53657d; line-height: 1.55; }
      a { display: inline-block; margin-top: 24px; padding: 13px 18px; border-radius: 12px; background: #1d6fe8; color: #ffffff; text-decoration: none; font-weight: 800; }
      small { display: block; margin-top: 20px; color: #6b7a90; line-height: 1.45; }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">AKI</div>
      <p class="eyebrow">AKITRADE CONTROL PLANE</p>
      <h1>Exness Auto Trader is online.</h1>
      <p>This secure service supports the AkiTrade mobile app, paper-trading controls, and account-link preparation. Use the Android app to sign in and get started.</p>
      <a href="/api/health">Check service health</a>
      <small>Paper-first operation only. No broker password is accepted here, and live order dispatch is disabled.</small>
    </main>
  </body>
</html>`;
}
