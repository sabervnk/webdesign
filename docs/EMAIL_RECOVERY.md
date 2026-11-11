# Email password recovery for Classer on Sites

## User flow

1. Open /signin?mode=reset and enter the email already recorded on the Classer account.
2. Receive a six-digit code by email. No email address or account status is disclosed in the API response.
3. Enter the code within ten minutes. Five submissions are permitted per challenge; malformed submissions count.
4. A valid code is consumed atomically and replaced with a random, single-use reset grant valid for five minutes.
5. Set an 8–128-character password. Successful reset increments the account epoch, invalidating all old sessions and all existing recovery credentials. Sign in again normally.

The original administrator-issued long recovery codes remain available through the secondary "کد بازیابی مدیر را دارم" flow. Email recovery does not change the ChatGPT owner's sign-in credentials. Accounts without an email, disabled accounts, and accounts sharing the same normalized email cannot use automatic email recovery; the administrator must correct their account details first. Phone numbers and SMS delivery are not implemented.

## Production setup

Use Resend's HTTPS Email API, not SMTP. No new dependency is required.

Configure these server-only runtime values through Sites settings:
- RESEND_API_KEY: a sending key scoped to the appropriate verified domain.
- RECOVERY_EMAIL_FROM: the verified sender, for example Classer <auth@your-domain.example>.
- RECOVERY_CODE_SECRET: at least 32 characters generated with a cryptographic random source; store as a secret. Changing it invalidates pending email codes.

Never commit actual credentials, put them in browser settings, or expose them through NEXT_PUBLIC_ variables. Deploy the new saved Sites version after configuration so the runtime receives the values. The route returns 503 with a setup message if any required value is missing; it never claims mail was sent in this state.

Production provider setup requires verifying the sending domain and its DNS records in Resend. A provider acceptance response is not proof of inbox delivery; inspect the provider dashboard and test delivery to a real registered account before release.

API documentation: https://resend.com/docs/api-reference/emails/send-email
Recovery guidance: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

## Runtime and data

Apply the append-only migration drizzle/0004_email_recovery.sql through the normal Sites packaging/deployment workflow. It adds two tables and indexes; it does not modify or delete existing accounts, passwords, sessions, teacher data, or financial records. Keep the previous migrations unchanged.

The database stores a keyed HMAC of the code, bound to account ID, email, account epoch and challenge, and a SHA-256 hash of the random reset grant. Raw codes are transmitted only to the mail provider and are never returned from the public request API or logged.

Only messages marked as accepted by the provider can be verified. Delivery failure deletes that challenge and logs a generic, recipient-free message. Provider request bodies and errors are never logged. The request uses an idempotency key and a four-second timeout. Valid request responses are padded to at least 4.5 seconds regardless of account existence; this reduces enumeration through normal provider-response timing. Infrastructure delays can still exceed that floor.

Resending after 60 seconds replaces the previous code and grant. Request limits are 10 per IP per 15 minutes and 5 per normalized email per hour, including unknown emails. Verification allows 50 submissions per IP per 15 minutes plus 5 attempts per challenge; reset submission allows 20 per IP per 15 minutes. Limits are enforced in atomic SQL updates.

The email workflow uses the Sites local-account database. The separate Netlify authentication adapter continues to own its own authentication endpoints; this change does not implement recovery for Netlify's separate account store.

## Validation

Standalone tests (Node >=24 for node:sqlite and module.registerHooks):
node --test tests/email-recovery.test.mjs tests/recovery-http.test.mjs tests/passwords.test.mjs

The HTTP test executes the actual auth route against real in-memory SQLite with platform adapters and email delivery substituted. It covers origin rejection, missing configuration, generic account responses, incorrect code, successful verification, eight-character password reset, session-cookie clearing and replay rejection. It sends no external email.

The full application build, Cloudflare D1 deployment, browser UI and real inbox delivery must also be checked in an environment with the project dependencies and production source access. Standalone tests do not establish those results.

