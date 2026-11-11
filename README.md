# Fitness Buddy AI

Fitness Buddy AI generates educational fitness and meal plans for adults. It supports form-based and optional voice generation, unit preferences, workout logging, progress tracking, share links, and opt-in email reminders. Generated plans are not medical advice.

## Requirements

- Node.js 20 or later and npm
- A Convex development and production deployment
- A Clerk application
- A Google Gemini API key for plan generation
- A Vapi account only if voice generation is enabled
- A Resend account only if reminder emails are enabled
- A Sentry project only if error reporting is enabled

## Local setup

1. Install dependencies: `npm ci` (use `npm install` when updating dependencies).
2. Copy `.env.example` to `.env.local`.
3. Set the Clerk publishable key, Convex deployment URL, and site URL in `.env.local`. Set `NEXT_PUBLIC_CONVEX_SITE_URL` to the Convex HTTP-actions URL ending in `.convex.site`.
4. Configure the Clerk and Convex authentication integration below, then run `npx convex dev` to generate types and deploy schema/functions to the selected development deployment.
5. Start the app with `npm run dev`.

The development server uses `.next-dev` separately from the production build's `.next` directory, so both can run without overwriting each other's output.

`NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` are optional unless you want the voice generator. `NEXT_PUBLIC_SUPPORT_EMAIL` is optional. Leave optional Vapi, Sentry, and Resend variables blank to keep those features disabled.

### Environment variables

| Variable | Location | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Next.js `.env.local` | Clerk browser and server components |
| `CLERK_SECRET_KEY` | Next.js `.env.local` and Convex deployment | Server-side account deletion and CI app startup |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js `.env.local` | Convex deployment URL ending in `.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Next.js `.env.local` | Convex HTTP-actions URL ending in `.convex.site` |
| `NEXT_PUBLIC_SITE_URL` | Next.js `.env.local` | Public app origin for canonical metadata and sitemap |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex deployment | Production Clerk JWT issuer domain used by Convex authentication |
| `GEMINI_API_KEY` | Convex deployment | AI plan generation |
| `GEMINI_MODEL` | Convex deployment (optional) | Gemini model override; defaults to the documented stable `gemini-2.5-flash` |
| `CLERK_WEBHOOK_SECRET` | Convex deployment | Verifies Clerk webhook signatures |
| `VAPI_WEBHOOK_SECRET` | Convex deployment and Vapi tool header | Shared secret for the Vapi generation endpoint |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Next.js `.env.local` | Optional browser voice client |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | Next.js `.env.local` | Optional Vapi assistant |
| `RESEND_API_KEY` | Convex deployment | Optional reminder email delivery |
| `REMINDER_FROM_EMAIL` | Convex deployment | Verified Resend sender address |
| `APP_URL` | Convex deployment | Public app origin used to create reminder unsubscribe URLs |
| `NEXT_PUBLIC_SENTRY_DSN` | Next.js `.env.local` | Optional client-side Sentry reporting |
| `SENTRY_DSN` | Next.js server environment | Optional server and edge Sentry reporting |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Build environment (optional) | Optional Sentry source-map upload configuration |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Next.js `.env.local` | Optional public contact address |
| `CONVEX_DEPLOYMENT` | Local Convex CLI | Selects the local Convex deployment |
| `PLAYWRIGHT_PORT` | Playwright tests (optional) | Local browser-test server port; defaults to `3100` |
| `CONVEX_DEPLOY_KEY` | Vercel Production environment | Authenticates the Vercel build's Convex production deployment |

Set Convex-side secrets with `npx convex env set NAME VALUE` while targeting the intended deployment, or use that deployment's dashboard. Never commit populated `.env.local` files, API keys, signing secrets, or webhook secrets.

## Clerk and Convex authentication

1. In Clerk, create or select the application for this deployment and copy its publishable and secret keys into `.env.local`.
2. Set `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment to this production Clerk application's JWT issuer domain. `convex/auth.config.ts` reads it at deploy/runtime and keeps `applicationID: "convex"` aligned with the JWT template audience.
3. In Clerk, create a JWT template named exactly **`convex`** using Clerk's Convex integration template. The `sub` claim must identify the authenticated Clerk user.
4. Set the same `CLERK_SECRET_KEY` in the Next.js deployment and Convex deployment; Convex account deletion calls Clerk's server API.
5. Add a Clerk webhook targeting `https://<your-deployment>.convex.site/clerk-webhook`, subscribing to `user.created`. Set the webhook signing secret as Convex `CLERK_WEBHOOK_SECRET`.

The Convex HTTP-actions base is available in the Convex dashboard under deployment settings. It has the form `https://<your-deployment>.convex.site`.

## Vapi voice configuration

Voice is optional; the form generator does not depend on Vapi.

1. Set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` in `.env.local` (and the matching frontend deployment environment).
2. Configure the assistant's server tool to POST to `https://<your-deployment>.convex.site/vapi/generate-program`.
3. Generate a high-entropy secret and set it as Convex `VAPI_WEBHOOK_SECRET`.
4. Configure the Vapi tool's custom HTTP header as **`x-vapi-secret: <the same secret>`**. The endpoint rejects requests with a missing or incorrect header; it does not accept the secret in a URL.
5. Ensure the assistant returns the supported fitness profile fields and receives the authenticated user's `userId`, `requestId`, and unit preference from the app. Do not put the webhook secret in a client-side variable or the assistant prompt.

## Optional reminder email

Set `RESEND_API_KEY`, a Resend-verified `REMINDER_FROM_EMAIL`, and the public HTTPS `APP_URL` in Convex. Users must explicitly opt in to reminders. Times are entered as UTC, and each message includes an unsubscribe link and one-click unsubscribe header. A changed active plan, deleted plan, or deleted account invalidates its reminder schedule.

## Optional Sentry

Sentry is disabled when no DSN is configured. Set `NEXT_PUBLIC_SENTRY_DSN` for browser errors and `SENTRY_DSN` for server/edge errors. Default PII collection is disabled; user identity, request bodies, cookies, authorization headers, query strings, and event extras/contexts are scrubbed before sending. If source-map upload is desired, also configure the Sentry auth token, organization, and project in the build environment.

## Tests and checks

```powershell
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Vitest covers Convex input validators, unit conversion, safety guardrails, calorie floors, and generation rate limiting. Playwright checks the Clerk sign-in page and unauthenticated redirects for protected routes. Browser tests require a real Clerk test instance and a reachable Convex URL in the environment.

GitHub Actions runs lint, typecheck, unit tests, and build using non-secret placeholder environment values, so those checks do not require repository secrets. The Playwright E2E job is skipped unless the repository Actions variable `RUN_E2E` is set to `true`. To enable it, add Actions secrets `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CONVEX_URL`, and `NEXT_PUBLIC_CONVEX_SITE_URL` for the test Clerk application and Convex deployment.

## Deployment checklist

- [ ] **Clerk production instance:** create/select the production Clerk instance. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel; set `CLERK_SECRET_KEY` in Convex as well. Create a Clerk JWT template named exactly `convex`, and set Convex `CLERK_JWT_ISSUER_DOMAIN` to the production issuer domain.
- [ ] **Clerk webhook:** create a `user.created` webhook targeting `https://<production-deployment>.convex.site/clerk-webhook`, then set its signing secret as Convex `CLERK_WEBHOOK_SECRET`.
- [ ] **Convex production deployment:** set `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, and `GEMINI_API_KEY`. Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`), `VAPI_WEBHOOK_SECRET`, `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`, and `APP_URL`. Use the HTTPS public app URL for `APP_URL` in production.
- [ ] **Vercel:** set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, and `NEXT_PUBLIC_SITE_URL` for the Production environment. Set `CONVEX_DEPLOY_KEY` to the production deploy key so the build can deploy Convex. Configure the Vercel Build Command as `npx convex deploy --cmd 'npm run build'`. Set optional frontend voice variables `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`, `NEXT_PUBLIC_SUPPORT_EMAIL`, and Sentry variables only when those features are enabled.
- [ ] **Vapi (optional):** configure the assistant tool URL as `https://<production-deployment>.convex.site/vapi/generate-program` and send the Convex `VAPI_WEBHOOK_SECRET` as the `x-vapi-secret` header.
- [ ] **Domain and DNS:** add the production domain to Vercel, configure the DNS records Vercel specifies, and set `NEXT_PUBLIC_SITE_URL` and Convex `APP_URL` to the final HTTPS origin.
- [ ] **Post-deploy smoke test:** sign up using the production Clerk instance, generate a plan, confirm the user appears in the production Convex database, then test the reminder unsubscribe link if reminders are enabled.
- [ ] If Sentry is enabled, configure `NEXT_PUBLIC_SENTRY_DSN` and/or `SENTRY_DSN`; optionally configure `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` for source-map uploads.
- [ ] Deploy via the Vercel production build command above, then verify sitemap/robots output and the production Clerk webhook delivery.
- [ ] Confirm Terms and Privacy legal text has been reviewed by a lawyer before public launch.
- [ ] Verify account export/deletion and public contact address in the deployed environment.