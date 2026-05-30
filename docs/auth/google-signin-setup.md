# Google Sign-In Setup

Kuppi offers Google sign-in alongside email OTP. The implementation lives in `src/contexts/AuthContext.tsx` (`signInWithGoogle`) and uses the Firebase JS SDK's `GoogleAuthProvider`. This doc covers the bit that bites on mobile: making OAuth work when the app is served from `your-domain.com` but Firebase's auth handler lives on `your-project-id.firebaseapp.com`. Everything stays on Firebase Spark — no Firebase Hosting, no Identity Platform.

## The problem

The Firebase `authDomain` (`your-project-id.firebaseapp.com`) is a different eTLD+1 from the app domain (`your-domain.com`). The OAuth handshake — whether via `signInWithPopup` or `signInWithRedirect` — needs to write and read cookies / `sessionStorage` on the auth-handler origin to carry state between the OAuth round-trip and the page that started sign-in.

Mobile browsers in 2024+ block or partition that cross-site storage by default:

- **iOS Safari (and every browser on iOS, which is forced to use WKWebView)** — Intelligent Tracking Prevention (ITP) blocks third-party storage outright.
- **Mobile Chrome** — Storage Partitioning isolates storage per top-level site.
- **iOS PWA standalone** — even stricter; treats the auth-handler popup / redirect as an embedded third party.
- **Embedded webviews** (Instagram in-app browser, Facebook, etc.) — often disable popups entirely and partition storage aggressively.

Net effect: `signInWithPopup` may open, complete OAuth, then fail to deliver the result back to the opener; `signInWithRedirect` returns the user to the app but `getRedirectResult` resolves to `null`. The user is "signed in to Google" but Kuppi never finds out.

Email OTP doesn't hit this because it never leaves `your-domain.com` — the API mints a Firebase custom token and we call `signInWithCustomToken` directly.

## The fix (two parts)

### 1. Popup-first in code

`src/contexts/AuthContext.tsx` calls `signInWithPopup` on every device. It only falls back to `signInWithRedirect` when the popup itself cannot be opened — `auth/popup-blocked`, `auth/cancelled-popup-request`, or `auth/operation-not-supported-in-this-environment`. Popups communicate with their opener via `window.opener` / `postMessage`, which is **same-origin** at the JS level, so Storage Partitioning doesn't bite even when the popup is on a different domain.

Diagnostic `console.warn('[auth] Google sign-in failed:', code, message)` lines fire in the popup-catch, redirect-fallback-catch, and `getRedirectResult` catch branches. Open DevTools / Safari Web Inspector and look for `[auth]` if a user reports a failure.

### 2. First-party auth handler via Next.js rewrite

`next.config.js` proxies the Firebase auth handler through `your-domain.com`:

```js
async rewrites() {
  return [
    { source: '/__/auth/:path*',     destination: 'https://your-project-id.firebaseapp.com/__/auth/:path*' },
    { source: '/__/firebase/:path*', destination: 'https://your-project-id.firebaseapp.com/__/firebase/:path*' },
  ];
}
```

Combined with `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain.com`, the Firebase JS SDK then builds OAuth URLs against `https://your-domain.com/__/auth/handler` — first-party from the browser's perspective. Storage partitioning no longer matters because the storage is the app's own origin storage.

The service worker is configured (in `next.config.js` `runtimeCaching`) with a `NetworkOnly` rule for `/__/auth/*` and `/__/firebase/*` so a cached / stale auth response can never break the handshake. That rule sits at the top of the list so it matches before the generic same-origin pages rule.

## Required env change

In **production** `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain.com
```

Leave the rest of the `NEXT_PUBLIC_FIREBASE_*` values pointing at project `your-project-id`.

For **local dev**, you can leave `AUTH_DOMAIN=your-project-id.firebaseapp.com` and use desktop browsers — popup works fine there. If you want to test the rewrite locally, set `AUTH_DOMAIN=localhost` (and add `localhost` to Firebase authorized domains, which it is by default).

## Required Firebase Console step

1. Open [Firebase Console](https://console.firebase.google.com/) → project `your-project-id` → **Authentication** → **Settings** → **Authorized domains**.
2. Confirm `your-domain.com` is listed. If not, click **Add domain** and add it.
3. `localhost` and `your-project-id.firebaseapp.com` are listed by default — keep them.

## Required Google Cloud Console step (most likely culprit)

The Firebase auth-handler endpoint (`/__/auth/handler`) is registered with an underlying OAuth 2.0 client managed by Google. When you serve that handler from a new origin, you must whitelist the new origin and redirect URI on that OAuth client, otherwise Google returns `redirect_uri_mismatch` or refuses to issue the token.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select project `your-project-id`.
2. **APIs & Services** → **Credentials**.
3. Under **OAuth 2.0 Client IDs**, click the entry named **"Web client (auto created by Google Service)"** (Firebase creates this for you when you enable Google as a sign-in provider).
4. Under **Authorized JavaScript origins**, add both:
   - `https://your-domain.com`
   - `https://your-project-id.firebaseapp.com` (keep — needed for the proxy target)
5. Under **Authorized redirect URIs**, add both:
   - `https://your-domain.com/__/auth/handler`
   - `https://your-project-id.firebaseapp.com/__/auth/handler` (keep)
6. Save. Allow **~5 minutes for propagation** before testing — Google caches OAuth client config aggressively.

## Deployment step

```bash
cd /var/www/kuppi
npm run build
pm2 restart kuppi
```

`next-pwa` is configured with `skipWaiting: true`, so a new service worker activates as soon as it's installed. However, the **first** load after deploy is still served by the old SW, which means the rewrite may not be hit. Ask test users to **hard refresh (Ctrl+Shift+R / Cmd+Shift+R)** on desktop, or **clear site data** on mobile, so the old SW is dumped before they retry Google sign-in. After that, normal navigation will pick up the new SW automatically.

On iOS PWA standalone (app installed to home screen): the user must **remove and re-add the home-screen icon** to force a fresh SW install — iOS Safari doesn't expose a "clear site data" toggle for PWAs.

## Verifying

1. Open `https://your-domain.com/auth/login` in mobile Safari (or DevTools mobile emulation).
2. Open Web Inspector → Console.
3. Tap **Continue with Google**.
4. Expected: Google account picker → success → redirect to dashboard.
5. If it fails, look for a `[auth] Google sign-in failed: ...` or `[auth] getRedirectResult failed: ...` line in the console. The error code points at which step broke:
   - `auth/unauthorized-domain` → Firebase Console → Authorized domains is missing `your-domain.com`.
   - `auth/internal-error` with a `redirect_uri_mismatch` body → GCP OAuth client redirect URIs are missing `https://your-domain.com/__/auth/handler`.
   - `auth/popup-blocked` on mobile → expected on iOS PWA; the code falls back to redirect automatically.
   - `auth/network-request-failed` immediately after the popup opens → the `/__/auth/handler` rewrite isn't reaching Firebase (check `curl -I https://your-domain.com/__/auth/handler` returns a 200 / 302, not a Next.js 404).

## Free-tier audit

- Rewrites are served by Next.js itself (the PM2-managed Node process) — no Firebase Hosting, no Cloud Functions, no Spark→Blaze upgrade required.
- The proxied requests still go out to `*.firebaseapp.com`, which is part of the standard Firebase Auth free tier.
- Google sign-in itself is unmetered on Firebase Spark.
