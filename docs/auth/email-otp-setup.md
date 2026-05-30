# Email OTP Sign-In Setup

Kuppi signs users in with a 6-digit one-time code emailed on demand. The Next.js API routes (`/api/auth/request-otp`, `/api/auth/verify-otp`) use the Firebase Admin SDK to persist hashed tokens to Firestore and mint custom tokens, and Nodemailer over SMTP to deliver the code. Everything below stays on Firebase Spark — the only external dependency is an SMTP provider.

## Firebase Admin setup

The Admin SDK lets the server create users and mint custom tokens for OTP sign-in.

1. Open [Firebase Console](https://console.firebase.google.com/) → your project → **Project Settings** → **Service accounts**.
2. Click **Generate new private key**. Confirm and download the JSON file.
3. Open the JSON and copy three fields into `.env.local`:

   | JSON field    | Env var                       |
   | ------------- | ----------------------------- |
   | `project_id`  | `FIREBASE_ADMIN_PROJECT_ID`   |
   | `client_email`| `FIREBASE_ADMIN_CLIENT_EMAIL` |
   | `private_key` | `FIREBASE_ADMIN_PRIVATE_KEY`  |

4. The private key contains literal `\n` newline escapes. Keep them as `\n` in the env file (do not paste an actual multi-line value); wrap the value in double quotes:

   ```env
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```

   `src/lib/firebase-admin.ts` converts the `\n` sequences back to real newlines at runtime.

5. Delete the downloaded JSON once the values are in `.env.local`. The service account key is a credential — never commit it.

## SMTP setup

Pick any provider below. All are free and external, so they don't touch Firebase billing.

### Gmail (default — 500/day on personal accounts)

1. Enable 2-Step Verification on the Google account ([myaccount.google.com/security](https://myaccount.google.com/security)).
2. Visit [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), create an app password named "Kuppi", and copy the 16-character value.
3. Set in `.env.local`:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=<app-password>
   MAIL_FROM="Kuppi <you@gmail.com>"
   ```

### Brevo (formerly Sendinblue) — 300/day free

1. Sign up at [brevo.com](https://www.brevo.com/).
2. Settings → SMTP & API → SMTP. Note the host (`smtp-relay.brevo.com`), port `587`, and your SMTP key.
3. `SMTP_USER` is your Brevo login email; `SMTP_PASS` is the SMTP key.

### Resend — 100/day, 3000/month free

1. Sign up at [resend.com](https://resend.com/) and verify a sender domain (or use `onboarding@resend.dev` for testing).
2. Create an API key.
3. Use `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_USER=resend`, `SMTP_PASS=<api-key>`.

### Mailjet — 200/day free

1. Sign up at [mailjet.com](https://www.mailjet.com/).
2. Account Settings → SMTP and SEND API Settings.
3. `SMTP_HOST=in-v3.mailjet.com`, `SMTP_PORT=587`, `SMTP_USER=<api-key>`, `SMTP_PASS=<secret-key>`.

## Verifying

After filling in `.env.local`, run:

```bash
node scripts/test-smtp.js you@example.com
```

Success looks like:

```
✓ Sent test email to you@example.com
```

Failure prints the underlying error and a pointer back to this doc, then exits with status 1. Check your inbox (and spam) before moving on.

Once SMTP works, run `npm run dev` and try the sign-in flow at `/auth/login`. The full path is: request-otp → Firestore stores hashed code → email arrives → verify-otp → custom token → client signs in.

## Common errors

- **`Username and Password not accepted` (Gmail)** — you used your regular Google password. Generate an App Password instead (see Gmail section above). The account must have 2FA enabled first.
- **`Connection timeout` / `ETIMEDOUT`** — wrong port, or your ISP/host blocks outbound 587. Try `SMTP_PORT=465` (Nodemailer auto-enables TLS when port is 465).
- **`Invalid login: 535 ...`** — wrong username or password. Recheck `SMTP_USER` and `SMTP_PASS`. For Brevo/Mailjet, make sure you're using the SMTP key/secret rather than the dashboard password.
- **`self signed certificate in certificate chain`** — usually a corporate proxy or VPN intercepting TLS. Disconnect from it and retry; Gmail itself does not produce this.
- **`Firebase Admin credentials missing`** thrown from the API — `.env.local` doesn't have all three `FIREBASE_ADMIN_*` values, or the private key lost its `\n` escapes. Re-paste from the service account JSON, keeping the quotes and `\n`s.

## Free-tier audit

- Firebase Admin SDK calls (custom tokens, Firestore writes) stay within Spark quotas; OTP docs are tiny and short-lived.
- SMTP providers above are external services on their own free tiers — no Firebase Blaze upgrade required.
- No Cloud Functions, no Identity Platform, no paid Firebase Auth features are used.
