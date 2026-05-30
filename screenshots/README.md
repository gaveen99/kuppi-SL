# Kuppi — Screenshots

Captured 2026-05-26 from `localhost:3000` (PM2 production build, same codebase as `your-domain.com`).

- **Desktop viewport:** 1440 × 900
- **Mobile viewport:** 390 × 844 (iPhone 14-ish)
- **Capture mode:** full-page (entire scrollable height)
- **Total:** 68 screenshots — 34 public + 34 teacher-authenticated

> Production URL `your-domain.com` was not reachable from the capture host (Cloudflare 403 + cert mismatch). Local PM2 build serves the identical bundle, so visuals match production; only DB content differs.

---

## LinkedIn carousel — suggested order

A 10-image carousel that tells the story:

1. `local/desktop/01-home.png` — landing/hero
2. `local/desktop/02-streams.png` — A/L stream guidance (SL-specific)
3. `local/desktop/03-courses.png` — free courses catalog
4. `local/desktop/05-z-score.png` — Z-score calculator (uniquely Sri Lankan)
5. `local/desktop/06-ugc-cutoffs.png` — UGC cut-off marks
6. `local/desktop/04-past-papers.png` — past papers download
7. `local/desktop/08-qa.png` — community Q&A
8. `local/desktop/teacher/01-dashboard-teacher.png` — teacher dashboard
9. `local/desktop/teacher/12-course-detail.png` — course inside view
10. `local/mobile/01-home.png` — mobile responsive proof

---

## Public pages (no auth)

| # | Route | Desktop | Mobile |
|---|---|---|---|
| 01 | `/` | [desktop](local/desktop/01-home.png) | [mobile](local/mobile/01-home.png) |
| 02 | `/streams` | [desktop](local/desktop/02-streams.png) | [mobile](local/mobile/02-streams.png) |
| 03 | `/courses` | [desktop](local/desktop/03-courses.png) | [mobile](local/mobile/03-courses.png) |
| 04 | `/past-papers` | [desktop](local/desktop/04-past-papers.png) | [mobile](local/mobile/04-past-papers.png) |
| 05 | `/z-score` | [desktop](local/desktop/05-z-score.png) | [mobile](local/mobile/05-z-score.png) |
| 06 | `/ugc-cutoffs` | [desktop](local/desktop/06-ugc-cutoffs.png) | [mobile](local/mobile/06-ugc-cutoffs.png) |
| 07 | `/scholarship` | [desktop](local/desktop/07-scholarship.png) | [mobile](local/mobile/07-scholarship.png) |
| 08 | `/qa` | [desktop](local/desktop/08-qa.png) | [mobile](local/mobile/08-qa.png) |
| 09 | `/about` | [desktop](local/desktop/09-about.png) | [mobile](local/mobile/09-about.png) |
| 10 | `/contact` | [desktop](local/desktop/10-contact.png) | [mobile](local/mobile/10-contact.png) |
| 11 | `/help` | [desktop](local/desktop/11-help.png) | [mobile](local/mobile/11-help.png) |
| 12 | `/guidelines` | [desktop](local/desktop/12-guidelines.png) | [mobile](local/mobile/12-guidelines.png) |
| 13 | `/privacy` | [desktop](local/desktop/13-privacy.png) | [mobile](local/mobile/13-privacy.png) |
| 14 | `/terms` | [desktop](local/desktop/14-terms.png) | [mobile](local/mobile/14-terms.png) |
| 15 | `/auth/login` | [desktop](local/desktop/15-auth-login.png) | [mobile](local/mobile/15-auth-login.png) |
| 16 | `/auth/register` | [desktop](local/desktop/16-auth-register.png) | [mobile](local/mobile/16-auth-register.png) |
| 17 | `/auth/register?email=…` (full form) | [desktop](local/desktop/17-auth-register-full.png) | [mobile](local/mobile/17-auth-register-full.png) |

## Authenticated — teacher role

Captured while signed in as `you@example.com` (teacher).

| # | Route | Desktop | Mobile |
|---|---|---|---|
| 01 | `/dashboard/teacher` | [desktop](local/desktop/teacher/01-dashboard-teacher.png) | [mobile](local/mobile/teacher/01-dashboard-teacher.png) |
| 02 | `/profile` | [desktop](local/desktop/teacher/02-profile.png) | [mobile](local/mobile/teacher/02-profile.png) |
| 03 | `/messages` | [desktop](local/desktop/teacher/03-messages.png) | [mobile](local/mobile/teacher/03-messages.png) |
| 04 | `/announcements` | [desktop](local/desktop/teacher/04-announcements.png) | [mobile](local/mobile/teacher/04-announcements.png) |
| 05 | `/announcements/create` | [desktop](local/desktop/teacher/05-announcements-create.png) | [mobile](local/mobile/teacher/05-announcements-create.png) |
| 06 | `/courses/create` | [desktop](local/desktop/teacher/06-courses-create.png) | [mobile](local/mobile/teacher/06-courses-create.png) |
| 07 | `/offers` | [desktop](local/desktop/teacher/07-offers.png) | [mobile](local/mobile/teacher/07-offers.png) |
| 08 | `/requests` | [desktop](local/desktop/teacher/08-requests.png) | [mobile](local/mobile/teacher/08-requests.png) |
| 09 | `/study-buddies` | [desktop](local/desktop/teacher/09-study-buddies.png) | [mobile](local/mobile/teacher/09-study-buddies.png) |
| 10 | `/qa/ask` | [desktop](local/desktop/teacher/10-qa-ask.png) | [mobile](local/mobile/teacher/10-qa-ask.png) |
| 11 | `/teach` | [desktop](local/desktop/teacher/11-teach.png) | [mobile](local/mobile/teacher/11-teach.png) |
| 12 | `/courses/[id]` | [desktop](local/desktop/teacher/12-course-detail.png) | [mobile](local/mobile/teacher/12-course-detail.png) |
| 13 | `/courses/[id]/modules` | [desktop](local/desktop/teacher/13-course-modules.png) | [mobile](local/mobile/teacher/13-course-modules.png) |
| 14 | `/courses/[id]/materials` | [desktop](local/desktop/teacher/14-course-materials.png) | [mobile](local/mobile/teacher/14-course-materials.png) |
| 15 | `/courses/[id]/sessions` | [desktop](local/desktop/teacher/15-course-sessions.png) | [mobile](local/mobile/teacher/15-course-sessions.png) |
| 16 | `/courses/[id]/edit` | [desktop](local/desktop/teacher/16-course-edit.png) | [mobile](local/mobile/teacher/16-course-edit.png) |
| 17 | `/call` | [desktop](local/desktop/teacher/17-call.png) | [mobile](local/mobile/teacher/17-call.png) |

## Not captured (need other roles)

These routes require non-teacher accounts and were skipped:

- `/dashboard/student` — student-only (redirects teachers to teacher dashboard)
- `/dashboard/student/offline` — student-only
- `/dashboard/admin` — admin-only
- `/dashboard/admin/teachers` — admin-only
- `/dashboard/parent` — parent-only
- `/learn` — student-only
- `/qa/[id]` — needs a question ID (no Q&A entries in current data)
- `/messages/[id]` — needs a thread ID (no message threads in current data)

To capture these, register accounts in each role and re-run the same flow.

## Recapture

The flow used:
1. `npm run build && pm2 reload kuppi` (or `npm run dev`) — bring up the app
2. Headless Playwright at 1440×900 → navigate each route → `fullPage` screenshot
3. Resize to 390×844 → repeat
4. For auth-gated: navigate to `/auth/login`, fill email, click "Send 6-digit code", paste OTP from inbox, then loop through auth routes
