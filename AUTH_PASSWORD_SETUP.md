# Email/password sign-in and password-reset links

The frontend supports:

1. Sign in with the designated admin email and password.
2. Forgot password → `resetPasswordForEmail` → email recovery link.
3. Open the link on the app; Supabase validates it and emits `PASSWORD_RECOVERY`.
4. Set and confirm a new password using `updateUser` after verification.
5. End the local recovery session and sign in with the new password.

Existing magic-link users can set their first password using the same Forgot password flow. The reset flow also accepts the default Supabase recovery link, so existing email templates remain usable. Passwords and OTPs stay in component memory and go only to Supabase Auth; they are not written to business records or browser storage. Browser session storage remembers only the current reset screen. Pending offline business entries are preserved when the recovery session is ended.

## Optional future recovery OTP configuration

Project: `jkdczqofbhinlqlojydr` (AMG Traders).

Open the Supabase dashboard → Authentication → Email Templates (or Emails → Templates) → **Reset password**.

- Subject: `AMG Traders password-reset code`
- Body: copy the full contents of `supabase/templates/recovery.html` in this repository.
- Save the template. The key content is `{{ .Token }}`, which inserts the numeric recovery code. `{{ .ConfirmationURL }}` is retained as a link fallback.

On October 31, 2026, the signed-in dashboard for this Free project showed template editing disabled unless custom SMTP is configured or the project is upgraded to Pro. The user explicitly chose **password login + reset links for now**. The hosted template remains unchanged. No paid upgrade or SMTP configuration was made. `supabase/templates/recovery.html` is a prepared template for a future OTP change; the deployed flow currently requests a reset link rather than an OTP.

The designated admin must perform the actual inbox verification and choose their own password. No password was set or changed on their behalf. Existing data, admin email restriction, RLS and Edge Function verification remain unchanged.

## Validation

`npm test` covers business/backend authorization scenarios and the isolated login UI test. The UI test uses a mocked Supabase client to check password errors, requesting a reset link, holding the verified recovery session outside the business app, password mismatch, updating the password, retaining business cache and restoring the reset screen after reload. It sends no email and changes no real credentials.

Real email delivery, link expiry and a real password update must be checked by the admin. No one else's password is chosen or entered during verification.

References: [Supabase recovery API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [OTP verification](https://supabase.com/docs/reference/javascript/auth-verifyotp), [email template variables](https://supabase.com/docs/guides/auth/auth-email-templates).
