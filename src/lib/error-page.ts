export function renderErrorPage(errorDetails?: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 32rem; width: 100%; text-align: center; padding: 2rem; background: #fff; border-radius: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
      h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; color: #17221B; }
      p { color: #66756A; margin: 0 0 1.5rem; font-size: 0.875rem; }
      pre { text-align: left; background: #fef2f2; border: 1px solid #fee2e2; padding: 1rem; border-radius: 0.5rem; font-size: 0.75rem; overflow: auto; max-height: 200px; color: #dc2626; margin-bottom: 1.5rem; white-space: pre-wrap; word-break: break-all; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1.25rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
      .primary { background: #123C2A; color: #fff; }
      .primary:hover { background: #1B4D36; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
      .secondary:hover { background: #f9fafb; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      ${errorDetails ? `<pre>${errorDetails}</pre>` : ""}
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
