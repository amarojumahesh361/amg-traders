# Manual Vercel deployment

1. Open https://vercel.com/new and select GitHub account `amarojumahesh361`.
2. Import the `amg-traders` repository. If it is missing, configure the Vercel GitHub app to allow this repository, then return to Import.
3. Project name: `amg-traders`. Framework Preset: `Vite`. Root Directory: `./`.
4. Build command: `npm run build`. Output Directory: `dist`. Install command: default (`npm install` or `npm ci`).
5. Add these build-time environment variables to Production (and Preview if using previews):
   - `VITE_SUPABASE_URL`: `https://jkdczqofbhinlqlojydr.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: copy the enabled publishable key from Supabase Project Settings > API Keys, or from local `.env.local`.
6. Click Deploy. Open the final production URL and share it in this chat.
7. In Supabase Authentication > URL Configuration, set Site URL to that exact HTTPS production origin. Add that origin with `/` to Redirect URLs. Save before requesting a login link.
8. Sign in using the admin email link on the device where you requested it. After login, confirm the cloud status shows saved before entering business records.

Supabase backend and database are already deployed. The frontend uses only a publishable key. No database password or service-role secret is needed in Vercel.

If environment variables are changed after deployment, redeploy so Vite can include the new public values in its build.
If a build fails, share the error section of the build log; do not share secrets.

Official references:
- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/git
- https://supabase.com/docs/guides/auth/redirect-urls
