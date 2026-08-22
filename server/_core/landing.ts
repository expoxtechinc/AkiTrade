export function getAkiTradeControlPlaneLandingPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#081a2a" />
    <title>AkiTrade Control Plane</title>
    <style>
      :root { color-scheme: dark; --ink:#081a2a; --line:#274760; --text:#f5f8fc; --muted:#a8b8c8; --teal:#2dd4bf; --amber:#fbbf24; --red:#fb7185; }
      * { box-sizing: border-box; } body { margin:0; min-height:100vh; background:radial-gradient(circle at 85% 0%, #174878 0%, transparent 30%), var(--ink); color:var(--text); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
      main { width:min(1040px, calc(100% - 40px)); margin:0 auto; padding:56px 0 72px; } .top { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; } .brand { display:flex; align-items:center; gap:14px; } .mark { display:grid; place-items:center; width:48px; height:48px; border-radius:15px; background:linear-gradient(145deg,#497df0,#285bb8); font-size:13px; font-weight:900; letter-spacing:.1em; } h1 { margin:0; font-size:clamp(26px,5vw,42px); line-height:1.05; letter-spacing:-.045em; } .subtitle { margin:12px 0 0; color:var(--muted); max-width:620px; line-height:1.55; } .badge { display:inline-flex; align-items:center; gap:8px; margin-top:6px; padding:10px 12px; border:1px solid var(--line); border-radius:999px; color:#d4e5f8; font-size:12px; font-weight:800; } .dot { width:8px; height:8px; border-radius:50%; background:var(--teal); box-shadow:0 0 18px var(--teal); } .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-top:36px; } .card { min-height:218px; padding:24px; border:1px solid var(--line); border-radius:22px; background:linear-gradient(145deg,rgba(20,55,85,.96),rgba(12,36,58,.96)); box-shadow:0 18px 38px rgba(0,0,0,.16); } .label { margin:0; color:var(--muted); font-size:12px; font-weight:800; letter-spacing:.08em; } .value { margin:16px 0 0; font-size:28px; line-height:1.08; font-weight:900; letter-spacing:-.03em; } .detail { margin:10px 0 0; color:var(--muted); font-size:14px; line-height:1.5; } .status { display:inline-flex; align-items:center; gap:8px; margin-top:20px; padding:8px 10px; border-radius:999px; background:rgba(45,212,191,.1); color:#7ff6e0; font-size:12px; font-weight:800; } .status.warning { background:rgba(251,191,36,.1); color:#fde68a; } .status.error { background:rgba(251,113,133,.12); color:#fda4af; } .foot { display:flex; justify-content:space-between; gap:16px; margin-top:20px; color:var(--muted); font-size:12px; } a { color:#a9caff; } @media(max-width:640px){ main { width:min(100% - 28px,1040px); padding-top:32px; } .top { display:block; } .badge { margin-top:20px; } .grid { grid-template-columns:1fr; margin-top:24px; } .foot { display:block; } .foot p+p { margin-top:10px; } }
    </style>
  </head>
  <body>
    <main>
      <section class="top">
        <div><div class="brand"><div class="mark">AKI</div><div><h1>AkiTrade Control Plane</h1><p class="subtitle">Exness Auto Trader is online. This public dashboard reports service and terminal-bridge readiness; it never exposes account information, credentials, or trading decisions.</p></div></div></div>
        <div class="badge"><span class="dot"></span>LIVE STATUS</div>
      </section>
      <section class="grid" aria-live="polite">
        <article class="card"><p class="label">CONTROL-PLANE HEALTH</p><p class="value" id="system-value">Checking…</p><p class="detail" id="system-detail">Fetching current service status.</p><span class="status" id="system-status">CONNECTING</span></article>
        <article class="card"><p class="label">MT5 BRIDGE CONNECTION</p><p class="value" id="mt5-value">Checking…</p><p class="detail" id="mt5-detail">Fetching terminal bridge capability.</p><span class="status warning" id="mt5-status">CONNECTING</span></article>
      </section>
      <div class="foot"><p id="updated">Last checked: —</p><p>Paper-first controls are active. <a href="/api/health">API health endpoint</a></p></div>
    </main>
    <script>
      const systemValue = document.getElementById('system-value'); const systemDetail = document.getElementById('system-detail'); const systemStatus = document.getElementById('system-status'); const mt5Value = document.getElementById('mt5-value'); const mt5Detail = document.getElementById('mt5-detail'); const mt5Status = document.getElementById('mt5-status'); const updated = document.getElementById('updated');
      function badge(element, label, tone) { element.textContent = label; element.className = 'status' + (tone ? ' ' + tone : ''); }
      async function refreshStatus() { try { const response = await fetch('/api/status', { cache:'no-store' }); if (!response.ok) throw new Error('Status request failed'); const data = await response.json(); const mt5 = data.mt5; systemValue.textContent = data.status === 'healthy' ? 'System healthy' : 'System degraded'; systemDetail.textContent = 'Uptime ' + data.uptimeSeconds + ' seconds · API is responding'; badge(systemStatus, data.status.toUpperCase(), data.status === 'healthy' ? '' : 'warning'); mt5Value.textContent = mt5.state.replaceAll('_',' '); mt5Detail.textContent = mt5.capabilities.readAccount ? 'Account read access available' : 'No terminal bridge has been configured'; badge(mt5Status, mt5.state.replaceAll('_',' ').toUpperCase(), mt5.state === 'healthy' ? '' : 'warning'); updated.textContent = 'Last checked: ' + new Date(data.serverTime).toLocaleString(); } catch (error) { systemValue.textContent = 'Status unavailable'; systemDetail.textContent = 'The status endpoint did not respond.'; badge(systemStatus, 'UNAVAILABLE', 'error'); mt5Value.textContent = 'Unknown'; mt5Detail.textContent = 'Retrying automatically.'; badge(mt5Status, 'UNKNOWN', 'error'); updated.textContent = 'Last checked: failed'; } }
      refreshStatus(); setInterval(refreshStatus, 30000);
    </script>
  </body>
</html>`;
}
