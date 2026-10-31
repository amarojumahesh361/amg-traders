# Email/password sign-in and recovery OTP

The frontend supports:

1. Sign in with the designated admin email and password.
2. Forgot password → `resetPasswordForEmail` → email recovery code.
3. Verify the code using `verifyOtp({email, token, type: 'recovery'})`.
4. Set and confirm a new password using `updateUser` after verification.
5. End the local recovery session and sign in with the new password.

Existing magic-link users can set their first password using the same Forgot password flow. The reset flow also accepts the default Supabase recovery link, so existing email templates remain usable. Passwords and OTPs stay in component memory and go only to Supabase Auth; they are not written to business records or browser storage. Browser session storage remembers only the current reset screen. Pending offline business entries are preserved when the recovery session is ended.

## Required Supabase email template setting

Project: `jkdczqofbhinlqlojydr` (AMG Traders).

Open the Supabase dashboard → Authentication → Email Templates (or Emails → Templates) → **Reset password**.

- Subject: `AMG Traders password-reset code`
- Body: copy the full contents of `supabase/templates/recovery.html` in this repository.
- Save the template. The key content is `{{ .Token }}`, which inserts the numeric recovery code. `{{ .ConfirmationURL }}` is retained as a link fallback.

The MCP integration currently exposes no Auth configuration update tool, and the in-app browser was signed out of the Supabase dashboard. The code and template file are ready, but **the hosted recovery email template has not been changed by this implementation**. Until it is saved in Supabase, email may show a reset link rather than a numeric code.

The designated admin must perform the actual inbox verification and choose their own password. No password was set or changed on their behalf. Existing data, admin email restriction, RLS and Edge Function verification remain unchanged.

## Validation

`npm test` covers business/backend authorization scenarios and the isolated login UI test. The UI test uses a mocked Supabase client to check password errors, requesting recovery, invalid OTP rejection, holding the recovery session outside the business app, password mismatch, updating the password, retaining business cache and restoring the reset screen after reload. It sends no email and changes no real credentials.

Real email delivery, OTP expiry and a real password update must be checked by the admin after the recovery template is saved.

References: [Supabase recovery API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [OTP verification](https://supabase.com/docs/reference/javascript/auth-verifyotp), [email template variables](https://supabase.com/docs/guides/auth/auth-email-templates).
