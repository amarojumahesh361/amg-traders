# AMG Traders — independent deployment

React/Vite frontend on Vercel, Supabase Auth/PostgreSQL/Edge Functions backend. No ChatGPT sign-in, Sites runtime, Cloudflare D1 or hosting-owner access is used by this project.

## Current status

Supabase project `jkdczqofbhinlqlojydr` is active in the separate AMG organization. The initial database migration is applied and Edge Function `amg-business` version 1 is deployed. Security advisors reported no issues. Live checks confirmed 401 rejection for anonymous reads/writes and invalid tokens; preflight returns 204. Actual admin sign-in and real phone/laptop sync still need verification after frontend deployment. GitHub repository: https://github.com/amarojumahesh361/amg-traders. Vercel frontend is deployed at https://amg-traders.vercel.app. Login screen has been verified. Supabase Auth URL configuration and the admin email sign-in must be completed before authenticated business/phone sync verification. Existing Sites publication is a separate deployment.

## Accounts and access

- Sole business admin: `amarojumahesh361@gmail.com` (verified Supabase Auth email).
- `smmworks.gcs@gmail.com` has no permission in this app. The backend rejects it, and PostgreSQL read policies deny it.
- Login uses an emailed sign-in link fixed to the designated admin email. First login can create that account; email ownership must be verified before any data access. Other Supabase Auth identities do not receive business permissions.
- Database writes are available only to the server role inside the Edge Function. Browser clients cannot directly replace stock or khata records.
- No service-role/secret key belongs in frontend source, Vercel variables or Git. Edge Functions use Supabase's built-in backend environment.

## Deployment order

1. Create a separate Supabase organization for AMG Traders (the user chose not to use SVV Friends Circle). Select that organization explicitly before creating project `amg-traders`, preferably in Mumbai (`ap-south-1`). Confirm any nonzero provider cost before creating paid resources.
2. Apply `supabase/migrations/20261019113309_amg_business.sql` through Supabase migrations. Do not apply to the existing `svvfc` project.
3. Deploy Edge Function `amg-business`. Its entrypoint is `supabase/functions/amg-business/index.ts`; include `_shared/server.ts`, `_shared/business.ts` and `deno.json`. Gateway `verify_jwt` is false because the handler itself verifies each bearer token against Supabase Auth before checking the verified admin email. There is no unauthenticated business data path.
4. Create a private GitHub repository under the user's account, then push this project. Never include `.env.local`, `node_modules`, `dist`, exports or financial records.
5. Import that repository into Vercel. Framework: Vite. Build: `npm run build`. Output: `dist`.
6. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel, using the new project. These are public connection values; database permissions are enforced separately. Redeploy after changing build-time environment variables.
7. Set Supabase Auth Site URL to the final Vercel/custom-domain URL. Add exact production/local URLs to the redirect allowlist. The designated admin verifies the emailed sign-in link on first login. Configure production email delivery as needed.
8. Sign in on laptop and phone with that same admin email. Verify purchase → sale → stock → khata → receipt. Test offline billing, reconnect/reload, and duplicate retries. Sign in with a different email to confirm rejection.
9. Before moving real operations, reconcile balances, export any real old records and validate an explicit migration. This copy starts empty and does not silently import old Sites data or browser test data.

## Local development

Copy `.env.example` to `.env.local`, fill only public Supabase values, then run:

```
npm ci
npm test
npm run build
npm run dev
```

A build without environment values intentionally shows a setup-incomplete page; it cannot authenticate or sync.
`npm run build` refreshes the Edge Function's shared source copies from `lib/` before building the frontend.

## Data and offline behavior

The cloud business row uses a version check; command commits and an immutable command audit entry share one PostgreSQL transaction. The server reloads and retries conflicts, revalidates stock, and treats repeated command IDs as idempotent.
Offline commands and the last accepted state are cached in IndexedDB on the device. Cross-tab writers use Web Locks. A rejected sync pauses entry until resolved. Offline transactions remain provisional until accepted by the backend. Successful sign-out clears cached business records; pending transactions must be synced or explicitly backed up first.
Offline access requires a prior online login and cached application assets. A disconnected device cannot immediately learn that an admin's server access was revoked; server authorization is rechecked when it reconnects.

## Known business limits

- Non-GST bills only. Configure proper tax invoicing before using after GST registration.
- Cases only. Complete glass crates with all bottles are supported; partial crates/missing bottles require reconciliation.
- Product catalogue entries are suggestions, not confirmed local packs or stock. Confirm variants, packing, rates and availability with suppliers.
- Existing stock can be recorded as an opening purchase with a clear note. Customer/supplier opening balances must be real.
- Backups export JSON; restore/import remains disabled to avoid overwriting live accounts accidentally.
- Before any production use, perform real authenticated and phone/laptop offline tests against the new deployment. Mock tests do not replace those checks.




