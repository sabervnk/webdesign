# Classer: original interface on Cloudflare Pages

The demo now imports the actual application components directly from `app/` and `components/`. It imports all the original layout styles from `app/layout.tsx`. The public site, sticky header, teacher workspace, administrator workspace, learner panel, login form, profile editors and Quill editor are the originals, not separately rebuilt imitations.

Only the server connection is adapted: a browser Service Worker handles the application's existing `/api/` contracts using a dedicated IndexedDB database. This is a browser feature; it does **not** deploy a Cloudflare Worker or require R2, D1, a subscription or a payment card.

All records are fictional and stay on the visitor's device. There is no real authentication, shared storage, payment, email or automatic external translation. Demo sign-in uses `teacher`, `admin`, or `student`, password `demo1234`, captcha `123456`. The original recovery form displays a demo code without sending email. Uploaded demonstration media is stored locally in the browser.

## Existing Pages settings

Keep either of these existing configurations:

| Setting | Repository root | Demo root |
| --- | --- | --- |
| Root directory | empty | `demo` |
| Build command | `node demo/build.mjs` | `node build.mjs` |
| Build output directory | `demo/dist` | `dist` |

Use Framework preset `None`. Do not run `wrangler deploy`. The normal dependency installation must run; the build uses Vite, React and Tailwind to compile the original source. No runtime server is required.

Future changes to the original imported components and CSS are used automatically by the demo build. New backend endpoints may need corresponding adapters in `src/runtime.ts`. Original production files are not modified by this demo.

## Validation

```sh
npm ci
node demo/build.mjs --test
node --test demo/exact-demo.test.mjs
```

`dist/demo-version.json` records hashes of original component and stylesheet inputs. The build rejects imports of server-only application modules. Tests cover original API contracts, local media, version conflicts and public/admin/student data shapes.

HTTPS and Service Worker/IndexedDB support are required. The browser worker only intercepts API routes; it does not cache HTML or static assets. Browsing directly to a nested path is supported by the Pages redirect configuration. Resetting the demo affects only its dedicated local state.
