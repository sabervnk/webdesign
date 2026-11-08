# MissMahta security and loading review — 2026-11-08

Scope: repository source, production Next.js build and isolated integration tests. No production user records or secrets were read. This is not a complete penetration test or a claim that the application has no vulnerabilities.

## Changes

- Browser mutations now require trusted-origin evidence. Missing Origin/Referer/Fetch Metadata fails closed; cross-site metadata and opaque origins are rejected. Netlify no longer accepts the request URL's host as an alternative trusted origin. Non-browser clients must supply the configured site Origin. Sites uses its established production origin.
- The admin page checks the authenticated administrator on the server before rendering. Admin APIs already enforced the role; this adds a page-level guard rather than fixing a proven data leak.
- Invitation failures now consume the existing account attempt quota. This remains an email-based limiter, not comprehensive distributed bot protection.
- Private profile photos are no-store to avoid retaining another account's image in a shared browser cache.
- Netlify/Next responses include nosniff, framing restrictions, referrer and permissions policies. CSP restricts object embedding, base URI, form destinations and frame ancestors. It is deliberately not advertised as a full nonce-based script CSP.
- Framework, validation and build dependencies updated based on a fresh npm audit. No schema migration or production-data reset.
- Root loading boundary streams a responsive skeleton; workspace/studio/admin fetches and dynamically loaded studio modules use skeletons. Motion respects reduced-motion preferences. A retryable error boundary replaces an unhandled failed render.
- Studio/admin code is loaded on demand. The local WOFF2 font is preloaded with its existing swap behavior. Large teacher portrait loads eagerly; list portraits remain lazy with asynchronous decoding and dimensions. Compression is enabled explicitly (already supported by Next).

## Existing controls reviewed

Owner-bound parameterized SQL queries protect workspaces, drafts and article writes. Published listings exclude unpublished portfolios and posts. Uploaded images have size and signature checks. Request bodies are bounded while streaming. Signed sessions, secure HttpOnly SameSite cookies, optimistic versions and settled-fee immutability remain in place. React renders article content as text rather than raw HTML.

## Remaining priorities and limits

1. Authentication: add per-session revocation, MFA for administrators, verified-email recovery and per-source rate limits using a trusted platform client identifier. Current email-based limits can be evaded with changing addresses, and signed sessions remain valid until expiry. Do not trust arbitrary X-Forwarded-For input.
2. Contact form: current per-email limits/honeypot do not stop distributed spam. Add verified bot protection and an edge limiter before storage/CPU-intensive operations.
3. Storage: the small-site SQL.js adapter downloads whole SQLite snapshots. At higher traffic, migrate to a managed database with indexed queries, pagination, backups and a tested restore process. Do not add process-global private-data caching to hide this limit.
4. Uploads: add pixel/dimension limits and server-side image re-encoding for stronger protection against malformed or decompression-heavy files; current signature checks alone are not full image validation.
5. Dependencies: remaining audit findings are recorded in the release notes. No forced downgrade or untested major Vinext migration.
6. Hosting: verify actual headers, TLS, public access and cache behavior after deployment. Sites relies on its gateway to validate/strip authenticated-user headers; the Netlify adapter ignores those headers. The new Next response headers are not claimed for the older Sites publication.
7. Performance: no Lighthouse/mobile network timing or visual browser QA was run. Skeletons appear after the server starts responding; they cannot cover DNS/TLS delays. No numeric speedup is claimed.

## Validation

See release notes for final build, test and dependency-audit results. Streaming loading boundaries may return HTTP 200 followed by a redirect/not-found instruction; tests assert the actual rejection instruction as well as API 401/403 behavior.
