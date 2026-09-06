# MahELA — Language teachers and learning

Persian / English website and private teacher workspace, extending the supplied MahELA prototype. The public experience includes a responsive homepage, teacher directory, portfolios, teacher-authored articles and contact / class-request forms. The existing student, IELTS assessment, scheduling, fee settlement and message-draft tools remain available at `/dashboard`.

## Teacher discovery and publishing

- Filter teachers by language, online or in-person classes, city, currency and maximum session fee. Compare prices within one currency; each card includes session duration.
- `/studio` lets each authenticated teacher manage their own public introduction, languages, formats, city, qualifications and pricing. Publishing is deliberate; private student, contact and financial records never enter the public catalogue.
- Teachers can create, preview, edit, publish, unpublish and delete their own blog posts. Articles appear in the journal and the author's portfolio. Drafts require ownership; unpublishing a portfolio hides its published articles too.
- Catalogue responses contain article summaries; full content is loaded only for the detail page or owner's editor. D1 indexes support listing and ownership queries.
- Until the first real portfolio is published, explicitly labelled fictional profiles and educational articles demonstrate the layout. Samples cannot receive class requests.

## Contact and administrator inbox

- Visitors can contact management or request a class from a published teacher's portfolio. The server validates language and format and captures the teacher, price, currency and duration at request time. Outdated profile versions require review of the current offer.
- Requests are stored in D1. `/admin` is restricted to the verified site owner's authenticated email, configured server-side in `lib/server/access.ts`.
- Management can mark requests new, in progress or closed and keep internal notes. Email replies open the administrator's email application; the site does not automatically send email or charge bank accounts.
- UUIDs prevent duplicate submissions on retry. Input limits, origin checks, a honeypot and an email-based submission limit provide lightweight abuse protection.

## Currency and historical data

- Teachers choose US dollars or toman for public pricing, private student fees and the default for new students. Dollars support two decimal places; toman amounts use whole numbers.
- Every private session retains its own fee and currency. Legacy records default to toman. Changing a teacher's or student's currency does not convert previous sessions.
- Financial totals and payment drafts display each currency separately. Settled real sessions remain immutable. Recording settlement acknowledges an already received payment; it does not transfer money.

## Data and access

- The currently hosted Site remains owner-private until its audience is explicitly changed through Sites. Public-facing routes are ready when the owner enables visitor access. Saved revisions require deployment to update the live Site.
- The platform supplies authenticated identities. Workspace and studio pages require sign-in; every private API scopes data to that identity. Do not expose the Worker through an ingress that permits untrusted authentication headers.
- D1 stores each workspace, public profile, article and inquiry with optimistic concurrency control. Schema changes use append-only Drizzle migrations; the original migration is preserved.
- R2 stores account photos under the authenticated owner's key. Public photos require a published portfolio and an active account photo and are not publicly cached.
- Initial workspace sample data can be removed after confirmation. Dates are stored canonically and displayed with the selected Persian or Gregorian calendar. Locale and theme are device-local preferences.

## Verification

Use the preserved Sites build scripts. After building, `node --test tests/*.test.mjs` checks scheduling, money precision, legacy records, ownership, draft visibility, admin restrictions, quote snapshots, concurrency, persistence and photo uploads against the built Worker. `npx tsc --noEmit` checks TypeScript. Browser and screenshot testing have not been performed for this revision.

Font: Vazirmatn, SIL Open Font License; see `public/fonts/OFL.txt`. The original generated homepage image shows a fictional teacher, not any listed teacher.
