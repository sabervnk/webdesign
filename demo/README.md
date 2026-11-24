# Classer static demonstration

This independent demo preserves the Classer branding and original homepage image, font, public styles and sample catalogue. It provides public pages and browser-local demonstrations of teacher, student and admin dashboards. It is not the production application and does not provide real authentication, email, payments, uploads or shared storage.

All records are invented. Requests and changes stay in the visitor's browser. Use **Reset demo** to restore the initial records. There are no API calls, third-party scripts, dependencies, Cloudflare Workers, D1 or R2 bindings.

## Cloudflare Pages via GitHub

Create a **Pages** project, not a Worker, connected to this repository:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `demo` |
| Framework preset | `None` |
| Build command | `node build.mjs` |
| Build output directory | `dist` |
| Environment variables | None |

Do not use `npx wrangler deploy` for this demo. No deploy command is required in the Pages Git setup. The existing full application remains in the repository root; point the demo project at `demo`.

Both `demo/` and `public/` must be present in the checkout because the build copies existing public assets from `../public`. Cloudflare checks out the whole repository before running the build. GitHub updates to the connected production branch can rebuild the demo automatically. Production UI changes are not automatically converted into demo interactions; update the demo source when its relevant design or behavior changes.

## Local build and checks

From this directory:

```sh
node build.mjs
node --test demo.test.mjs render.test.mjs
```

Serve `dist/` over HTTP with a fallback to `index.html` for client-side routes. The included `_redirects` provides this on Pages. The deployable ZIP must contain the contents of `dist/` at its root.

## Scope

- Home, searchable/filterable teacher directory, teacher profiles, journal, article detail, contact form.
- Persian/English interface, dark/light themes, sticky navigation, back-to-top control and responsive layouts.
- Teacher dashboard: local student records, class calendar and duration-based fees, status updates, sample settlements, notes, sample conversations, profile settings and sample journal posts.
- Student and admin overviews, including requests saved in the same browser.
- No genuine login or permission isolation: role entry is intentionally a public demo switcher.
- Post editor uses plain text and `##` headings. Rich media uploads and recovery email are absent.

Requests do not reach a real administrator. A request created on one device is not visible on another. Do not enter personal details or real records.
