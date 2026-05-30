# Phase 1a — Foundation Layer Design

**Date:** 2026-04-17
**Status:** Approved for implementation planning
**Scope:** PWA shell, offline materials, low-bandwidth video mode, ad placement primitive

## Context

Kuppi is a free public-service learning platform for Sri Lankan students and teachers across O/L, A/L, University, and Masters levels. The site will remain free to use; Google AdSense (education category) is permitted solely to offset hosting costs and must never appear inside lessons, video calls, messaging, or timed-practice flows.

This spec is the first of two sub-phases in Phase 1 of a six-phase roadmap. P1a covers the architectural foundations that touch every page. Phase 1b (localization switcher UI, on-screen SI/TA keyboard, district/medium filters, holiday-aware calendar) follows in a separate spec.

## Goals

1. Make Kuppi installable as a PWA on Sri Lankan students' phones.
2. Let users save specific study materials for offline access, so patchy data plans don't block learning.
3. Let users complete video classes on slow connections without the call collapsing.
4. Introduce a single, disciplined ad-surface primitive that will govern every future ad placement on the site.

## Non-Goals

- Automatic background caching of every browsed material (quota and privacy concerns).
- A native iOS/Android app.
- Push notifications. Foundational SW infra is laid, but push wiring is deferred.
- Ad network integrations beyond Google AdSense.
- Payment, subscription, or premium tier UX. The site is free.

## Architecture Overview

Four independent-but-related additions to the existing Next.js 14 App Router + Firebase + WebRTC stack:

| Subsystem | Purpose | Blast radius |
|---|---|---|
| PWA shell | Installable app, offline fallback | Global (layout, manifest, SW) |
| Offline materials | Opt-in per-material caching + offline viewer | Course/material surfaces, new dashboard route |
| Low-bandwidth video | Quality tiers + auto-detect on slow networks | Video call flow only |
| Ad placement primitive | Single `<AdSlot>` component with a surface allowlist | Every public-facing page that opts in |

No Firestore schema changes are required in P1a. All offline state is device-local.

## PWA Shell

### Manifest

- Created as `src/app/manifest.ts` (Next.js 14 dynamic metadata route) rather than static `public/manifest.json`, to keep the name/short_name localisable in Phase 1b.
- Fields:
  - `name`: "Kuppi — Learning Platform"
  - `short_name`: "Kuppi"
  - `theme_color`: `#6366f1` (matches existing Tailwind indigo brand)
  - `background_color`: `#ffffff`
  - `display`: `standalone`
  - `start_url`: `/`
  - `icons`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` under `public/icons/`

### Service Worker

- Implemented via the `next-pwa` package (Workbox wrapper). Custom SW was considered and rejected — `next-pwa` covers every use case in this spec with known-good defaults.
- Registered only in production builds (`next-pwa` default) so dev is unaffected.
- Caching strategies:
  - App shell and static assets → `StaleWhileRevalidate`
  - `/api/files/[filename]` → `CacheFirst`. Safe because files are already served with `Cache-Control: public, max-age=31536000, immutable` at [src/app/api/files/[filename]/route.ts:52](../../../src/app/api/files/[filename]/route.ts#L52) and filenames are content-addressed.
  - Firestore and Firebase Auth APIs → `NetworkOnly`. Real-time data must never be cached.
  - Google Fonts → `CacheFirst` with 1-year expiry.
  - Pages (`/`, `/courses`, `/dashboard/*`) → `NetworkFirst` with a 3-second timeout, falling back to cache.

### Update behaviour

- `next-pwa` is configured with `reloadOnOnline: true`.
- When a new SW takes over, show a non-blocking banner: "A new version is ready — tap to refresh." Implemented in `NetworkStatusBanner`.

## Offline Materials

### Model

Opt-in per material. A student taps a "Save for offline" button on a specific PDF or image, which:

1. Fetches the file via the existing API route, putting it into a named Cache Storage bucket.
2. Writes a metadata record to IndexedDB: `{ materialId, courseId, title, mimeType, sizeBytes, savedAt }`.
3. Updates an in-memory React context so the UI reflects the new state immediately.

External-link materials (`MaterialType === 'link'`) are not cacheable; the button is hidden for those.

### Storage buckets

- **Cache Storage**: one named cache `materials-v1`. Eviction managed by the browser; the app does not expire entries.
- **IndexedDB**: one database `kuppi-offline`, one object store `savedMaterials` keyed by `materialId`. Accessed through the `idb` library (~1KB, ergonomic wrapper).
- **Total quota warning**: if `navigator.storage.estimate()` reports >80% usage, show an inline warning on the "Save offline" button with a link to the offline-materials page where the user can remove items.

### New UI surfaces

- `<SaveOfflineButton material={m} />` — placed on each material row on the course detail page. States: `not-saved`, `saving`, `saved`, `failed`.
- `NetworkStatusBanner` — thin bar across the top of the app layout. Shown when `navigator.onLine === false`, or when a new SW is awaiting activation.
- `/dashboard/student/offline` — new route listing saved materials. Works with no network. Allows viewing the cached file and removing saved items.

### Error cases

- Quota exceeded (`QuotaExceededError`): surface a toast with a link to the offline page to free space. Do not silently discard.
- Fetch fails: mark the item as `failed` and allow retry. Do not write to IndexedDB.
- IndexedDB open fails (incognito in some browsers): the Save button renders disabled with a tooltip explanation. No crash.

## Low-Bandwidth Video Mode

### Quality tiers

Three presets, selectable before or during a call:

| Tier | Resolution | Frame rate | Target bitrate | Audio |
|---|---|---|---|---|
| HD | 1280×720 | 30 fps | 1500 kbps | Opus @ default |
| SD | 640×360 | 15 fps | 500 kbps | Opus @ default |
| Audio-only | video track disabled | n/a | 32 kbps audio only | Opus @ 32 kbps |

HD preserves the current default at [src/lib/antmedia-config.ts:19-28](../../../src/lib/antmedia-config.ts#L19-L28).

### Auto-detect

On call start, read `navigator.connection.effectiveType`:

- `'slow-2g'` or `'2g'` → default to Audio-only
- `'3g'` → default to SD
- `'4g'` or `undefined` → default to HD

The user's last explicit choice (stored in `localStorage.videoQualityPreference`) overrides auto-detect if present.

### Switching mid-call

- A quality-picker button is added to the in-call control bar at [src/app/call/page.tsx:354-431](../../../src/app/call/page.tsx#L354-L431).
- Switching re-negotiates the sender's track constraints via `RTCRtpSender.setParameters({ encodings: [{ maxBitrate }] })` and, for Audio-only, disables the video track with `track.enabled = false` (keeping the SDP m-line alive).
- Choice persists to `localStorage.videoQualityPreference` on every change.

### Browser compatibility

- `navigator.connection` is not supported in Safari/Firefox. When undefined, default to HD — do not guess.
- `RTCRtpSender.setParameters` works on all modern browsers for `maxBitrate`. Resolution change via `track.applyConstraints` is also required for a true tier switch.

## Ad Placement Primitive

### The component

- `<AdSlot placement="sidebar" | "inline" | "footer" />`.
- Single source of truth for every ad rendered on the site.
- Renders nothing if the current route is on the forbidden list (below), regardless of where the component is placed. Belt-and-braces.

### Forbidden surfaces

Hard-coded in `src/lib/adConfig.ts`:

- `/call` and any sub-route
- `/messages` and any sub-route
- `/practice/*` and `/exam/*` (pattern reserved for P2 timed exam mode)
- Inside modal dialogs (enforced by convention: do not place `<AdSlot>` inside modal children)

### Allowed surfaces (P1a launch set)

- Landing page `/`
- Course browse `/courses` (one sidebar unit; one inline unit after every fifth course card)
- Teacher offers browse `/offers` (inline every fifth card)
- Learn requests browse `/learn` (inline every fifth card)
- Student / teacher dashboard below-the-fold footer area
- Announcements list `/announcements`

### Config

- Publisher ID read from `NEXT_PUBLIC_ADSENSE_CLIENT` env var.
- If unset → `<AdSlot>` renders a dimmed 300×250 (or equivalent) placeholder labelled "Ad slot (dev)". Layout does not jump between environments.
- If set → real AdSense script loaded once via `next/script` with `strategy="afterInteractive"` in `layout.tsx`. Each `<AdSlot>` instance renders an `<ins class="adsbygoogle">` with the publisher ID and the appropriate slot-specific `data-ad-slot`.
- `data-ad-category="education"` on each slot as a relevance hint. AdSense's own classifier does most of the work based on surrounding content.

### Consent

- AdSense requires a regional consent notice in many jurisdictions.
- A minimal consent banner is part of P1a: one-time dismissible, stores the choice in `localStorage.adConsent`. If declined, `<AdSlot>` renders no ad (but may still render the dev placeholder).
- A more polished GDPR/PDPA-grade consent flow is out of scope; this is a deliberate P1a floor.

## Files Added or Modified

### New files

- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `src/app/manifest.ts`
- `src/app/dashboard/student/offline/page.tsx`
- `src/components/SaveOfflineButton.tsx`
- `src/components/NetworkStatusBanner.tsx`
- `src/components/AdSlot.tsx`
- `src/components/ConsentBanner.tsx`
- `src/hooks/useOnlineStatus.ts`
- `src/hooks/useOfflineMaterials.ts`
- `src/lib/offlineStorage.ts` (idb wrapper for `kuppi-offline` DB)
- `src/lib/videoQuality.ts` (presets + auto-detect helper)
- `src/lib/adConfig.ts` (forbidden routes, placement config)

### Modified files

- `next.config.js` — add `next-pwa` plugin configuration
- `package.json` — add `next-pwa` and `idb`
- `src/app/layout.tsx` — wrap with `NetworkStatusBanner`, `ConsentBanner`, load AdSense script once
- `src/app/call/page.tsx` — add quality picker to control bar, wire auto-detect
- `src/hooks/useSimpleVideoCall.ts` — accept quality preset, apply `getUserMedia` constraints and `setParameters` bitrate
- `src/app/courses/[id]/page.tsx` — add `<SaveOfflineButton>` to each material row
- `.env.local.example` — document `NEXT_PUBLIC_ADSENSE_CLIENT`

## Testing Strategy

### Automated

- Build + Lighthouse PWA audit in CI → target score ≥ 90.
- Unit tests for `offlineStorage.ts` (IndexedDB read/write round-trip), `videoQuality.ts` (preset selection given `effectiveType`), `adConfig.ts` (allow/deny routing logic).

### Manual QA

- Chrome DevTools → Application → Service Workers: confirm SW registers, cache entries populate on save.
- DevTools → Network → Offline: confirm saved materials viewable, `NetworkStatusBanner` shows, Firestore calls fail gracefully.
- DevTools → Network → Slow 3G throttle: confirm video call starts in SD; switch mid-call to HD and back; confirm Audio-only disables camera.
- Forbidden-route sweep: visit `/call/:id`, `/messages/:id`, confirm zero `<ins.adsbygoogle>` nodes in DOM and zero dev placeholders.
- Install test: Chrome "Install app" → launches standalone; icon/splash/theme colour correct.
- Consent banner: first-ever visit shows banner; dismissed state persists across reloads.

### Browsers

Test on Chromium (desktop + Android), Safari (desktop + iOS), Firefox (desktop). Known Safari/Firefox limitation: `navigator.connection` is undefined — defaults to HD, which is correct fallback behaviour.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| next-pwa SW caches stale HTML after deploy | `reloadOnOnline: true` + update banner prompts user to reload |
| Cache Storage fills up on devices with low quota | Opt-in-only caching + quota warning in Save button + clear-all UI on offline page |
| AdSense rejects site (new domain, thin content) | P1a ships with dev placeholder by default; real ID swapped in later with zero code change |
| AdSense shows non-education ads on allowed surfaces | `data-ad-category="education"` hint + AdSense blocked-categories controls in the publisher dashboard |
| Video-quality switch breaks active SFU session on Ant Media | Test against Ant Media dev server before merge; if `setParameters` is unsupported on a given codec, fall back to full renegotiation (reconnect) with a visible "Switching quality..." state |
| Service worker breaks dev workflow | next-pwa disabled in development by default |

## Rollout

1. Merge to `main` behind the dev-placeholder ad slot (AdSense env var unset in production until approved).
2. Announce the "Save for offline" feature and install-to-home-screen capability on the `/announcements` page.
3. Monitor Firebase Hosting logs for SW registration errors over the first 48 hours.
4. Once AdSense account is approved, set `NEXT_PUBLIC_ADSENSE_CLIENT` in production env and redeploy. No code change.

## Open Questions (deferred, not blocking P1a)

- Does AdSense's "auto ads" feature conflict with the allowlist? We will use **manual ad units only** to keep surface control strict. Auto ads is disabled in the publisher dashboard.
- Should saved-offline materials expire? Decision: no expiry. Users manage their own storage. Revisit if support complaints emerge.
- Should we cache live session recordings for offline playback? Deferred to Phase 5 (Recorded Class Library).
