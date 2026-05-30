# Moodle-Style Course Modules — Phase 1 Design

**Date**: 2026-04-30
**Project**: Kuppi (philanthropic Sri Lankan student platform on Firebase Spark free tier)
**Status**: Approved by user — ready for implementation planning
**Scope**: Phase 1 of a multi-phase Moodle-style learning module system

---

## 1. Background and goal

Kuppi already has a thin skeleton (`Course → CourseModule → Material(pdf|image|link)`) with `student / teacher / admin` roles, `Enrollment`, and Firebase Storage wired in. The goal is to evolve this into a Moodle-style course delivery experience — the way teachers actually expect to organise content, and the way students expect to consume it — while staying on Firebase's Spark (free) tier.

Moodle is decades of work and cannot be cloned in a single project. This document covers **Phase 1 only**: sections + the five "Resource"-type modules (File / Folder / URL / Page / Label), per-module visibility controls, self-enrolment, and full per-resource completion tracking. Activities (Assignment, Quiz, Forum, Lesson, etc.) are deferred to later phases.

### Roadmap context

| Phase | Feature set |
|---|---|
| **1 (this spec)** | Sections + 5 Resource types, per-item visibility, self-enrolment, completion tracking |
| 2 | Assignment activity (submission + grade + feedback) |
| 3 | Quiz activity (MCQ + short answer, attempts, auto-grade) |
| 4 | Forum / discussion activity |
| 5+ | Gradebook aggregation, completion dashboards, restriction conditions, Lesson, Book |

Each phase is its own design → plan → ship cycle.

---

## 2. Hard constraints

These are non-negotiable and shape every decision below.

- **Firebase Spark free tier** — no Cloud Functions, 5 GB Storage, 50K Firestore reads/day, 20K writes/day, 1 GB egress/day.
- **No backend** — all logic runs client-side or in security rules.
- **Sri Lankan student bandwidth** — keep download sizes minimal; respect mobile data costs.
- **Free-tier-first rule** — every new feature must be audited for billing-gated APIs before it ships.

---

## 3. Storage strategy (decision: external-link-first)

The 5 GB Storage cap will not absorb a real course library. The decision:

- **Primary**: external-link-first model. Teachers paste Google Drive / OneDrive / Dropbox / YouTube URLs. Kuppi stores only metadata (title, description, optional fetched thumbnail). This is what Moodle's "URL" resource type does and is the right shape for a free-tier project.
- **Secondary**: small first-party files in Firebase Storage with hard caps:
  - **Per-file cap**: 15 MB
  - **Per-course cap**: 200 MB — computed as the sum of `fileSize` across (a) all `materials` with `storage === 'firebase'`, plus (b) every entry in `folderItems` with `storage === 'firebase'`, plus (c) any inline images embedded in Page-type materials.
  - Caps enforced client-side before upload, with a clear "Course storage full — use external link instead" message.

YouTube-as-storage tricks (encoding files as video frames) were considered and rejected: ToS violation, data-corruption risk, worse student bandwidth, and a single channel termination wipes every course.

---

## 4. Access-control model

### Defaults

- **Course default**: enrolment required. Students must self-enrol before viewing.
- **Resource default**: `visibility: 'enrolled'` (only enrolled students + course teacher + admin).

### Per-section / per-resource visibility states

The teacher can override visibility on **each section** and **each resource** independently:

| State | Who can read |
|---|---|
| `public` | Any authenticated user (no enrolment needed). For free samples / promo material. |
| `enrolled` | Default. Enrolled students + course teacher + admin. |
| `restricted` | Specific user IDs listed in `allowedUserIds` + course teacher + admin. For 1-on-1 tuition / makeup work. |
| `hidden` | Course teacher + admin only. Drafts, archived items. |

### Self-enrolment

- Free, one click on the course preview page.
- Atomic batched write: creates `enrollments/{courseId}_{studentId}` AND adds `courseId` to `users/{uid}.enrolledCourseIds`.
- Only allowed when `course.isPublished == true`.

### Restricted user picker — scope

The teacher's user picker (used when setting `visibility: 'restricted'`) searches **all Kuppi users** by name/email — not just enrolled students. This lets a teacher grant access to a non-enrolled user (e.g. a 1-on-1 tutee or a parent reviewing material). The picker is debounced and capped at 10 results to keep reads bounded.

### Cost optimisation

Naïve `isEnrolled()` would do an `exists()` per material rule check — ~30 reads per course-page view. We denormalise `enrolledCourseIds: string[]` onto the user doc; the rules engine caches `getUserData()` per request, so enrollment checks become effectively zero extra reads. Enrolment writes are 2-doc batches and are rare.

---

## 5. Data model

Architectural decision: **Approach 1 — flat top-level collections** (chosen over subcollections to avoid migrating existing data).

### Collections

| Collection | Doc ID | Notes |
|---|---|---|
| `users` | `{uid}` | Extended with `enrolledCourseIds: string[]` |
| `courses` | auto | Unchanged for Phase 1 |
| `sections` | auto | **Renamed from `courseModules`** |
| `materials` | auto | **Extended** — now polymorphic on `type` |
| `enrollments` | `{courseId}_{studentId}` | **Deterministic ID** for cheap rule checks |
| `userCourseProgress` | `{userId}_{courseId}` | **NEW** — one doc per student per course |

### `User` (extended)

```ts
interface User {
  // ...existing fields...
  enrolledCourseIds?: string[];   // NEW — denormalised for cheap rule lookups
}
```

### `Section`

```ts
interface Section {
  id: string;
  courseId: string;
  title: string;
  summary?: string;                                          // optional rich-text intro
  orderIndex: number;
  visibility: 'public' | 'enrolled' | 'restricted' | 'hidden';
  allowedUserIds?: string[];                                 // when visibility === 'restricted'
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `Material` (polymorphic on `type`)

```ts
type ResourceType = 'file' | 'folder' | 'url' | 'page' | 'label';
type Visibility   = 'public' | 'enrolled' | 'restricted' | 'hidden';
type CompletionMode = 'none' | 'manual' | 'auto-on-view';

interface Material {
  id: string;
  courseId: string;
  sectionId: string;
  orderIndex: number;
  type: ResourceType;
  title: string;                                             // hidden in UI for type === 'label'
  description?: string;
  visibility: Visibility;
  allowedUserIds?: string[];
  completionMode: CompletionMode;

  // type === 'file'
  storage?: 'firebase' | 'external';
  fileUrl?: string;
  filePath?: string;                                         // only when storage === 'firebase'
  fileName?: string;
  fileSize?: number;                                         // bytes — used for quota math
  mimeType?: string;

  // type === 'folder'
  folderItems?: Array<{
    fileName: string;
    fileUrl: string;
    storage: 'firebase' | 'external';
    filePath?: string;
    fileSize?: number;
    mimeType?: string;
  }>;

  // type === 'url'
  externalUrl?: string;
  externalUrlMeta?: {
    title?: string;
    thumbnailUrl?: string;
    siteName?: string;
  };

  // type === 'page'
  pageHtml?: string;                                         // sanitised rich-text HTML

  // type === 'label'
  labelHtml?: string;                                        // inline divider/heading content

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Default `completionMode` per type:
- `file`, `url`, `page`, `folder` → `'auto-on-view'`
- `label` → `'none'`

### `Enrollment`

```ts
// Doc ID = `${courseId}_${studentId}`
interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: Timestamp;
}
```

### `UserCourseProgress` (new)

```ts
// Doc ID = `${userId}_${courseId}`
interface UserCourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedItemIds: string[];                                // all completions
  manuallyMarkedItemIds: string[];                           // subset that was hand-ticked (vs auto)
  lastUpdated: Timestamp;
}
```

### Composite indexes (firestore.indexes.json)

- `sections` on `(courseId ASC, orderIndex ASC)`
- `materials` on `(courseId ASC, sectionId ASC, orderIndex ASC)`
- `enrollments` on `(studentId ASC, enrolledAt DESC)` — for "my courses" listing
- `enrollments` on `(courseId ASC, enrolledAt DESC)` — for class roster

---

## 6. Security rules

Added helper functions on top of existing `isAuthenticated`, `isUser`, `isAdmin`, `isTeacher`, `isStudent`:

```js
function isEnrolled(courseId) {
  return isAuthenticated()
      && courseId in getUserData().get('enrolledCourseIds', []);
}

function isCourseTeacher(courseId) {
  return isAuthenticated()
      && get(/databases/$(database)/documents/courses/$(courseId)).data.teacherId
         == request.auth.uid;
}

function canViewItem(d) {
  return (d.visibility == 'public'     && isAuthenticated())
      || (d.visibility == 'enrolled'   && isEnrolled(d.courseId))
      || (d.visibility == 'restricted' && request.auth.uid in d.get('allowedUserIds', []))
      || isCourseTeacher(d.courseId)
      || isAdmin();
}
```

Rules per collection:

```js
match /sections/{sectionId} {
  allow read:   if canViewItem(resource.data);
  allow create: if isTeacher() && isCourseTeacher(request.resource.data.courseId);
  allow update,
        delete: if isCourseTeacher(resource.data.courseId) || isAdmin();
}

match /materials/{materialId} {
  allow read:   if canViewItem(resource.data);
  allow create: if isTeacher() && isCourseTeacher(request.resource.data.courseId);
  allow update,
        delete: if isCourseTeacher(resource.data.courseId) || isAdmin();
}

match /enrollments/{enrollmentId} {
  allow read:   if isUser(resource.data.studentId)
                || isCourseTeacher(resource.data.courseId)
                || isAdmin();
  allow create: if isStudent()
                && request.resource.data.studentId == request.auth.uid
                && enrollmentId == request.resource.data.courseId + '_' + request.auth.uid
                && get(/databases/$(database)/documents/courses/$(request.resource.data.courseId))
                   .data.isPublished == true;
  allow delete: if isUser(resource.data.studentId)
                || isCourseTeacher(resource.data.courseId)
                || isAdmin();
}

match /userCourseProgress/{progressId} {
  allow read:   if isUser(resource.data.userId)
                || isCourseTeacher(resource.data.courseId)
                || isAdmin();
  allow create: if isUser(request.resource.data.userId)
                && progressId == request.resource.data.userId + '_' + request.resource.data.courseId
                && isEnrolled(request.resource.data.courseId);
  allow update: if isUser(resource.data.userId);
  allow delete: if isAdmin();
}
```

### Firebase Storage rules

Storage paths used by Phase 1:

- `courses/{courseId}/materials/{materialId}/{fileName}` — File-type uploads
- `courses/{courseId}/folders/{materialId}/{fileName}` — items inside a Folder material
- `courses/{courseId}/page-images/{materialId}/{fileName}` — inline images in Page or Label materials

```
match /courses/{courseId}/{section=**} {
  allow read:  if request.auth != null;
  allow write: if request.auth != null
               && request.resource.size < 15 * 1024 * 1024;  // 15 MB hard cap
}
```

Per-course quota (200 MB) and per-teacher ownership cannot be checked inside Storage rules without metadata; both are enforced client-side before upload via `src/lib/storageQuota.ts`.

### Client-side responsibility (no Cloud Functions)

- **Enrol**: `writeBatch` updates `enrollments/{id}` + `users/{uid}.enrolledCourseIds` (`arrayUnion`).
- **Unenrol**: `writeBatch` deletes `enrollments/{id}` + `users/{uid}.enrolledCourseIds` (`arrayRemove`). `userCourseProgress` doc is kept so re-enrolling restores progress.
- **Storage quota**: client sums `fileSize` for the course before allowing upload.
- All this lives in `src/lib/enrollment.ts` and `src/lib/storageQuota.ts` so logic is not duplicated.

---

## 7. Teacher UX (Moodle-style edit mode)

### Page consolidation

Moodle uses a **single course page** that switches into edit mode for the teacher. Phase 1 will:

- Make `/courses/[id]/page.tsx` the unified course view for both roles.
- Teacher sees a **"Turn editing on"** button in the header (Moodle's exact phrasing).
- Old subroutes `/edit/modules`, `/edit/materials` get folded into the unified page.
- `/courses/[id]/edit` is kept *only* for course-level metadata (title, description, level, isPublished, isPremium).
- `/courses/[id]/sessions` remains untouched (live-session feature, separate concern).

### Edit-mode chrome

Each section and each resource gets four affordances on hover:

| Icon | Action |
|---|---|
| ☰ | Drag handle (reorder) |
| ✏️ | Edit (open modal) |
| 👁 | Visibility toggle (cycles state, opens user-picker for `restricted`) |
| ⋯ | Overflow menu: Duplicate / Delete |

Inline rename: double-click title → input → Enter / blur saves, Esc cancels.

### Section card layout

```
┌─ ☰  Section title (editable)              👁 ✏️ ⋯ ─┐
│   Optional summary (rich text)                       │
│   ┌─ 📄 File: Lecture Slides       👁 ✏️ ⋯ ─┐      │
│   │   3.2 MB · PDF                              │      │
│   ├─ 🔗 URL: Khan Academy video    👁 ✏️ ⋯ ─┤      │
│   ├─ 📁 Folder: Past papers        👁 ✏️ ⋯ ─┤      │
│   ├─ 📝 Page: Reading guide        👁 ✏️ ⋯ ─┤      │
│   └─ ▬ Important: deadline Friday  👁 ✏️ ⋯ ─┘      │
│   [+ Add an activity or resource]                     │
└────────────────────────────────────────────────────────┘
[+ Add section]
```

### "Add an activity or resource" picker

Modal triggered by per-section "+ Add" button. Five cards:

```
[📄 File]   [📁 Folder]   [🔗 URL]   [📝 Page]   [▬ Label]
```

Click → opens type-specific Add Resource form.

### Add / Edit Resource form

**Common fields** (every type, hidden for Label where noted):

- **Title** (required; hidden for Label)
- **Description** (optional, short text)
- **Visibility** radio: Public / Enrolled (default) / Restricted / Hidden
  - When `Restricted` → user-picker appears: search students by email/name, multi-select chips → writes `allowedUserIds`
- **Completion** radio: None / Manual ✓ / Auto-on-view (defaults vary per type)

**Type-specific fields**:

| Type | Fields |
|---|---|
| **File** | Storage source radio: "Upload to Kuppi" *or* "External link". Upload → file input (15 MB enforced). External → URL input + auto-detected `fileName` + `mimeType`. |
| **Folder** | Repeatable rows: each row is a mini-File entry. Add row, remove row, drag-reorder. |
| **URL** | External URL input. Auto-fetch oEmbed preview (YouTube/Vimeo/Drive) → thumbnail + title; teacher can override. Cached in `externalUrlMeta`. |
| **Page** | Rich-text editor (TipTap) producing sanitised HTML. Inline images uploaded to Firebase Storage (counted against course quota). |
| **Label** | Same TipTap editor, smaller. No title. Output rendered inline in section list. |

### Drag-reorder write strategy

- Optimistic UI update first.
- Single `writeBatch` of all affected `orderIndex` values (Firestore allows up to 500 ops per batch — ample headroom).
- Cross-section drag also updates `sectionId` on the moved item.

### Storage quota UI

- Sticky bar at top of edit mode: "127 / 200 MB used"
- Pre-upload check; reject with the storage-full message above.

---

## 8. Student UX (Moodle-style course view)

### Discovery → enrolment

1. **Browse** — `/courses` lists published courses (existing page).
2. **Course preview** — `/courses/[id]` for non-enrolled students:
   - Header: course title, teacher + badges, level/category/medium chips, description.
   - Section outline preview: section titles + resource titles (icon + name only). Hidden / restricted items don't appear. Items with `visibility: 'public'` are clickable here as free samples; everything else shows a small lock icon.
   - **"Enrol me"** primary CTA top-right. One click. Triggers batched write.
3. **Course (enrolled)** — same URL, full content renders.

### Enrolled course page layout

```
┌─ Course title                              [Unenrol]  ─┐
│  Teacher · Level · Medium                              │
│  ▓▓▓▓▓▓░░░░  12 / 20 completed (60%)                   │
├────────────────────────────────────────────────────────┤
│ ▼ Section 1: Introduction                              │
│   Optional summary text…                               │
│     📄 Lecture Slides           3.2 MB · PDF      [✓]  │
│     🔗 Khan Academy video        youtube.com      [☐]  │
│     ▬ Important: deadline Friday                       │
│ ▼ Section 2: Mechanics                                 │
│     📁 Past papers              5 files           [☐]  │
│     📝 Reading guide                              [☐]  │
│ ▷ Section 3: Thermodynamics (collapsed)                │
└────────────────────────────────────────────────────────┘
```

- Sticky header with progress bar.
- Sections collapsible; collapsed state persists in `localStorage` per course.
- Each material row: type icon · title (+ description as smaller line) · meta (size / domain / "5 files") · completion checkbox on the right.

### Per-type student rendering

| Type | Click behaviour | Auto-completes on |
|---|---|---|
| **File** | PDFs preview in a `<iframe>` modal first with a "Download" button; non-PDFs trigger direct download. | The click that opens the preview modal (PDF) or starts the download (non-PDF) |
| **Folder** | Expands inline to show contained files; each file behaves like a File row. | First expand of the folder; opening individual items inside does not double-tick |
| **URL** | Opens external link in new tab (`target="_blank" rel="noopener noreferrer"`). | The click that opens the new tab |
| **Page** | Modal renders the sanitised HTML (DOMPurify on display). | The click that opens the modal |
| **Label** | Inline render in section list. No click target, no checkbox. | Never |

### Completion checkbox

- **Manual** — student clicks; toggles in both `completedItemIds` and `manuallyMarkedItemIds`.
- **Auto-on-view** — first open writes via `arrayUnion` to `completedItemIds` only. Checkbox shows ✓ but is disabled (Moodle-style locked).
- **None** — no checkbox shown.
- **One read per page load**: fetch the single `userCourseProgress/{uid_cid}` doc; derive ✓ for every material from the array.
- **One write per tick**: `setDoc(..., { merge: true })` with `arrayUnion`. Atomic, idempotent.

### Course progress bar

- `completed = completedItemIds ∩ visible-and-completable materials`
- `total = materials with completionMode != 'none' that the student can see`
- Optimistic update on every tick; renders `"12 / 20 completed (60%)"`.

### Restricted / hidden items

- Items the student doesn't have read access to **simply don't appear** — no "locked" placeholder, no leak of the title. Cleaner than Moodle's restriction stub, and the security rules already prevent the read.

### My Courses dashboard

`/dashboard/student` gets a **My Courses** card listing enrolled courses with per-course progress bars — derived from each `userCourseProgress` doc (one read per enrolled course, ~5–20 per dashboard load).

### Unenrol

- Button in course header (with confirm dialog).
- Batched delete: `enrollments/{id}` removed + `users/{uid}.enrolledCourseIds` (`arrayRemove`).
- `userCourseProgress` doc is **kept** so re-enrolling restores progress. Admin can prune.

---

## 9. Library additions

| Package | Purpose | Approx size |
|---|---|---|
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-reorder for sections + materials | ~30 KB |
| `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-image` + `@tiptap/extension-link` | Rich-text editor for Page / Label / Section summary | ~50 KB core + extensions |
| `dompurify` + `@types/dompurify` | Sanitise stored HTML on render | ~22 KB |

oEmbed previews use a direct `fetch` to `https://noembed.com/embed?url=…` — free, no auth, CORS-friendly. Result cached in `externalUrlMeta`.

---

## 10. File organisation

```
src/
  app/
    courses/
      [id]/
        page.tsx                         ← REPLACED: unified Moodle-style course page
        edit/page.tsx                    ← KEPT: course-level metadata only
        modules/                         ← REMOVED (folded into [id]/page.tsx)
        materials/                       ← REMOVED (folded into [id]/page.tsx)
        sessions/                        ← UNCHANGED (out of scope)
  components/
    course/
      CourseHeader.tsx                   ← title, progress bar, enrol/unenrol button
      CoursePreview.tsx                  ← non-enrolled view
      SectionList.tsx                    ← orchestrates sections + dnd
      SectionCard.tsx                    ← single section render (view + edit modes)
      MaterialRow.tsx                    ← single material render (view + edit modes)
      MaterialIcon.tsx                   ← type → icon mapping
      AddResourcePicker.tsx              ← modal with the 5 type cards
      forms/
        FileResourceForm.tsx
        FolderResourceForm.tsx
        UrlResourceForm.tsx
        PageResourceForm.tsx
        LabelResourceForm.tsx
        VisibilityField.tsx              ← shared visibility radio + user-picker
        CompletionField.tsx              ← shared completion-mode radio
      RichTextEditor.tsx                 ← TipTap wrapper (used by Page, Label, Section summary)
      RichTextRender.tsx                 ← DOMPurify + render
      OEmbedPreview.tsx
      StorageQuotaBar.tsx
      UserPickerField.tsx                ← search students by name/email
  lib/
    enrollment.ts                        ← batched enrol / unenrol writes
    progress.ts                          ← read + write userCourseProgress
    storageQuota.ts                      ← compute used bytes for a course
    moodleTypes.ts                       ← shared TS types for the new schema
    oembed.ts                            ← noembed.com fetch + cache
  types/index.ts                         ← extend Material, Section, User, add UserCourseProgress
firestore.rules                          ← updated rules from §6
firestore.indexes.json                   ← new composite indexes
scripts/migrate-moodle-phase1.ts         ← one-time migration script
```

---

## 11. Migration

A single Node script in `scripts/migrate-moodle-phase1.ts`. Idempotent, gated behind `--confirm`:

1. **Rename `courseModules` → `sections`** — read all docs, write to new collection, delete old. Add `visibility: 'enrolled'`, `orderIndex` from existing field, `updatedAt = createdAt`.
2. **Backfill `materials`** — for every existing material, set `type: 'file'` (or `'url'` if `externalUrl` present), `sectionId = moduleId`, `visibility: 'enrolled'`, `completionMode: 'auto-on-view'`, `storage: filePath ? 'firebase' : 'external'`.
3. **Migrate `enrollments` to deterministic IDs** — read all, rewrite at `{courseId}_{studentId}`, delete originals.
4. **Backfill `users.enrolledCourseIds`** — for each user, query their enrollments, set the array.
5. **`userCourseProgress` docs** — created lazily on first write; no backfill.

---

## 12. Rollout sequence

1. Ship the migration script + extended types + new security rules behind a feature flag (`NEXT_PUBLIC_MOODLE_V1=false`).
2. Build and ship the new unified course page + components. With the flag off, old routes still work.
3. Run migration in staging, verify, then production.
4. Flip `NEXT_PUBLIC_MOODLE_V1=true` → old `/edit/modules/materials` subroutes redirect to the unified page.
5. After 1 week stable, delete the old subroute files.

---

## 13. Cascade on course deletion

When a teacher deletes a course (existing rule: `allow delete: if isUser(resource.data.teacherId) || isAdmin();`), the client must also clean up dependent docs in a single batched operation (no Cloud Functions available). The `src/lib/courseDelete.ts` helper handles this:

1. Delete all `materials` where `courseId == X` (paginated `writeBatch` if > 500).
2. Delete all `sections` where `courseId == X`.
3. Delete all `enrollments` where `courseId == X`, and for each, `arrayRemove` the courseId from the corresponding user's `enrolledCourseIds`.
4. Delete all `userCourseProgress` docs where `courseId == X`.
5. Delete all Storage objects under `courses/{courseId}/` via the Storage SDK list+delete loop.
6. Finally delete the `courses/{courseId}` doc itself.

Failures mid-cascade leave orphans — the admin tool surfaces orphan-detection so a manual cleanup is possible. This is an accepted risk for Phase 1 given Spark constraints.

---

## 14. Out of scope for Phase 1

- Assignment / Quiz / Forum activity types → Phase 2+
- Grade-based completion criteria → Phase 2 (when there's a grade to base it on)
- Bulk student import / CSV enrolment
- Course backup / restore
- Categories / cohorts / groups
- Email notifications
- Restrictions other than user list (date-based, completion-of-other-item, grade-based)
- Recycle bin (delete is permanent in Phase 1)
- Server-side cascade cleanup (handled client-side per §13)

---

## 15. Spark-tier read budget — sanity check

| Source | Estimate |
|---|---|
| 200 active students × 3 course-page loads/day × ~5 reads (course + sections + materials + progress + user) | ~3,000 reads/day |
| 50 teachers × 5 edit-mode opens × ~10 reads | ~2,500 reads/day |
| Misc (dashboards, browse) | ~2,000 reads/day |
| **Total** | **~7,500 reads/day** |

vs Spark cap of **50,000 reads/day**. ~6× growth headroom before optimisation pressure.

---

## 16. Success criteria

Phase 1 is "done" when:

- [ ] A teacher can create a course, add sections, add all 5 resource types within a section, drag-reorder, and toggle per-item visibility (including the user-picker for `restricted`).
- [ ] A teacher can upload a file (≤15 MB), see the storage-quota bar update, and be blocked at the 200 MB course cap.
- [ ] A student can browse a course preview, self-enrol with one click, and see all enrolled-or-public content.
- [ ] Manual completion checkboxes and auto-on-view ticks both persist in `userCourseProgress` and update the course progress bar in real time.
- [ ] Migration script ran on production data with zero data loss; old `courseModules` and non-deterministic `enrollments` are gone.
- [ ] Security rules deny: non-enrolled student reading enrolled material; non-allowed user reading restricted material; teacher A editing teacher B's course; student writing another student's progress doc.
- [ ] Total daily Firestore reads on production stay within ~30% of the Spark cap under realistic load.
