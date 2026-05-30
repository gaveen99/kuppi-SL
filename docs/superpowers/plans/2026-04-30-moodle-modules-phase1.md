# Moodle-Style Course Modules — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Moodle-style unified course experience for Kuppi: teachers can create sections and add five Resource types (File / Folder / URL / Page / Label) with per-item visibility, students can self-enrol and have full per-resource completion tracking — all on Firebase Spark free tier.

**Architecture:** Flat top-level Firestore collections (`courses`, `sections`, `materials`, `enrollments`, `userCourseProgress`) with deterministic doc IDs and a denormalised `enrolledCourseIds` array on `users` for cheap rule checks. External-link-first storage with a 200 MB-per-course Firebase Storage cap for first-party uploads. All cross-doc operations (enrol, course delete) batched client-side because Cloud Functions are unavailable on Spark. Single unified `/courses/[id]/page.tsx` switches into edit mode for the teacher (Moodle's "Turn editing on" pattern).

**Tech Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Firebase Auth + Firestore + Storage (web SDK v10) · Tailwind · `@dnd-kit` for drag-reorder · `@tiptap/react` for rich text · `dompurify` for sanitisation · Vitest + `@firebase/rules-unit-testing` for rule + lib tests · `noembed.com` for oEmbed previews.

**Spec:** `docs/superpowers/specs/2026-04-30-moodle-modules-phase1-design.md` (read first if you have not).

---

## Testing strategy

This codebase has no tests today. Adding heavyweight React component testing infrastructure is out of scope — it would double the project. Instead:

| Layer | Approach |
|---|---|
| **Firestore security rules** | Strict TDD with `@firebase/rules-unit-testing` against a local emulator. Mandatory — these are the only thing protecting student data. |
| **Pure-logic libs** (`lib/*.ts`) | Strict TDD with Vitest unit tests. Small files, easy. |
| **React components** | Manual browser verification via `npm run dev`. Each component task ends with explicit "verify in browser" steps. |
| **Critical user journeys** | Out of scope for Phase 1 (Playwright e2e suite is a Phase 2 concern). |

---

## Cross-cutting conventions

- **Imports**: existing code uses path aliases like `@/lib/firebase`. Follow the same.
- **Timestamps**: always `serverTimestamp()` from `firebase/firestore` for `createdAt` / `updatedAt` / `lastUpdated` / `enrolledAt`.
- **Error UX**: surface via small inline `<div className="text-red-600 text-sm">` banners; no global toast system exists.
- **Permission gating in UI**: read `useAuth()` from `@/contexts/AuthContext` (it returns `{ user, role }`).
- **Date format in commits**: imperative subject, scope-prefixed (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- **Commit cadence**: every task ends with one or more commits. Never amend; always new commits. Co-author trailer is added by the agent runtime.

---

## Task 0: Read the spec

**Files:** none

- [ ] **Step 1: Read the design spec end-to-end**

Open `docs/superpowers/specs/2026-04-30-moodle-modules-phase1-design.md`. Read all 16 sections. Pay special attention to §5 (data model), §6 (security rules), §7 (teacher UX), §8 (student UX). The plan below assumes you have absorbed it.

---

## Task 1: Set up Vitest + Firebase Rules testing

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `tests/rules/.gitkeep`
- Create: `tests/lib/.gitkeep`
- Modify: `package.json` (add devDependencies + scripts)
- Modify: `firebase.json` (add emulators block)
- Modify: `.gitignore` (add emulator data dir)

- [ ] **Step 1: Install dev dependencies**

```bash
npm install --save-dev vitest @vitest/ui @firebase/rules-unit-testing@^3.0.4
```

- [ ] **Step 2: Add scripts to package.json**

Open `package.json` and merge into the `scripts` block:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:rules": "vitest run tests/rules",
"test:lib": "vitest run tests/lib",
"emulators": "firebase emulators:start --only firestore,storage,auth"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
```

- [ ] **Step 4: Create `vitest.setup.ts` (no-op for now, hook later)**

```ts
// Placeholder for shared test setup. Currently empty.
export {};
```

- [ ] **Step 5: Create empty test directories**

```bash
mkdir -p tests/rules tests/lib && touch tests/rules/.gitkeep tests/lib/.gitkeep
```

- [ ] **Step 6: Update `firebase.json` with emulators**

Replace the file contents with:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth":      { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage":   { "port": 9199 },
    "ui":        { "enabled": true, "port": 4000 }
  }
}
```

- [ ] **Step 7: Add emulator data dir to `.gitignore`**

Append to `.gitignore`:

```
firebase-debug.log
firestore-debug.log
storage-debug.log
ui-debug.log
emulator-data/
```

- [ ] **Step 8: Verify Vitest can boot**

Run: `npx vitest run --reporter=verbose`
Expected: prints "No test files found" and exits 0. (We have `.gitkeep` files, no real tests yet.)

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts vitest.setup.ts tests/ package.json package-lock.json firebase.json .gitignore
git commit -m "chore: set up Vitest + Firebase rules testing infrastructure"
```

---

## Task 2: Install runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dnd-kit, TipTap, dompurify**

```bash
npm install @dnd-kit/core@^6 @dnd-kit/sortable@^8 @dnd-kit/utilities@^3 @tiptap/react@^2 @tiptap/starter-kit@^2 @tiptap/extension-image@^2 @tiptap/extension-link@^2 @tiptap/pm@^2 dompurify@^3
npm install --save-dev @types/dompurify@^3
```

- [ ] **Step 2: Verify they appear in package.json**

```bash
grep -E "(dnd-kit|tiptap|dompurify)" package.json
```

Expected: at least 6 lines printed.

- [ ] **Step 3: Verify Next build still works**

Run: `npm run build`
Expected: build succeeds (it builds the existing app, the new deps are not imported yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit, TipTap, and DOMPurify dependencies"
```

---

## Task 3: Add Firebase Storage to client + create Storage rules

**Files:**
- Modify: `src/lib/firebase.ts`
- Create: `storage.rules`

- [ ] **Step 1: Extend `src/lib/firebase.ts` to export `storage`**

At the top of the file, add to the firebase imports:

```ts
import { getStorage } from 'firebase/storage';
```

At the bottom, change the export line. Replace:

```ts
export { app, auth, db };
```

with:

```ts
const storage = getStorage(app);

export { app, auth, db, storage };
```

- [ ] **Step 2: Create `storage.rules` at repo root**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Course assets — anyone authenticated can read; writes capped at 15 MB.
    // Per-course quota and ownership are enforced client-side via storageQuota.ts.
    match /courses/{courseId}/{path=**} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 15 * 1024 * 1024;
    }

    // User avatars and other user-scoped paths (already in use elsewhere).
    match /users/{userId}/{path=**} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase.ts storage.rules
git commit -m "feat: wire Firebase Storage client + add storage rules with 15 MB cap"
```

---

## Task 4: Extend TypeScript types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new union types after the existing `MaterialType` line**

Find the line `export type MaterialType = 'pdf' | 'image' | 'link';` and add **immediately below** it (do not delete `MaterialType` — older code still uses it):

```ts
export type ResourceType   = 'file' | 'folder' | 'url' | 'page' | 'label';
export type Visibility     = 'public' | 'enrolled' | 'restricted' | 'hidden';
export type CompletionMode = 'none' | 'manual' | 'auto-on-view';
export type FileStorage    = 'firebase' | 'external';
```

- [ ] **Step 2: Extend the `User` interface**

Find `export interface User {` and add **before** the closing `}`:

```ts
  enrolledCourseIds?: string[];
```

- [ ] **Step 3: Replace the `CourseModule` interface with `Section`**

Find:

```ts
export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: Timestamp | Date;
}
```

Replace it with:

```ts
export interface Section {
  id: string;
  courseId: string;
  title: string;
  summary?: string;
  orderIndex: number;
  visibility: Visibility;
  allowedUserIds?: string[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/** @deprecated Use Section. Kept only until migration is rolled out. */
export type CourseModule = Section;
```

- [ ] **Step 4: Replace the `Material` interface with the polymorphic version**

Find the existing `export interface Material { ... }` block and replace it entirely with:

```ts
export interface FolderEntry {
  fileName: string;
  fileUrl: string;
  storage: FileStorage;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface OEmbedMeta {
  title?: string;
  thumbnailUrl?: string;
  siteName?: string;
}

export interface Material {
  id: string;
  courseId: string;
  sectionId: string;
  /** @deprecated Use sectionId. Kept for back-compat reads during migration. */
  moduleId?: string;
  orderIndex: number;
  type: ResourceType;
  title: string;
  description?: string;
  visibility: Visibility;
  allowedUserIds?: string[];
  completionMode: CompletionMode;

  // type === 'file'
  storage?: FileStorage;
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;

  // type === 'folder'
  folderItems?: FolderEntry[];

  // type === 'url'
  externalUrl?: string;
  externalUrlMeta?: OEmbedMeta;

  // type === 'page'
  pageHtml?: string;

  // type === 'label'
  labelHtml?: string;

  // Past-paper / model-paper / marking-scheme metadata (kept from prior schema)
  resourceCategory?: 'note' | 'past-paper' | 'model-paper' | 'marking-scheme';
  examYear?: number;
  subject?: string;
  level?: Level;
  medium?: Medium;

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
```

- [ ] **Step 5: Add `UserCourseProgress` to the bottom of the file**

```ts
export interface UserCourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedItemIds: string[];
  manuallyMarkedItemIds: string[];
  lastUpdated: Timestamp | Date;
}
```

- [ ] **Step 6: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: no new errors. (Pre-existing errors in unrelated files are ok.)

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add Section, polymorphic Material, UserCourseProgress, visibility types"
```

---

## Task 5: Add new Firestore composite indexes

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add four new indexes to the `indexes` array**

Open `firestore.indexes.json`. Inside the existing `"indexes": [ ... ]` array, add these four entries (anywhere; conventionally at the end):

```json
{
  "collectionGroup": "sections",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "courseId",   "order": "ASCENDING" },
    { "fieldPath": "orderIndex", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "materials",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "courseId",   "order": "ASCENDING" },
    { "fieldPath": "sectionId",  "order": "ASCENDING" },
    { "fieldPath": "orderIndex", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "enrollments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "studentId",  "order": "ASCENDING" },
    { "fieldPath": "enrolledAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "enrollments",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "courseId",   "order": "ASCENDING" },
    { "fieldPath": "enrolledAt", "order": "DESCENDING" }
  ]
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(firestore): add composite indexes for sections, materials, enrollments"
```

---

## Task 6: Write Firestore security rules with TDD

**Files:**
- Create: `tests/rules/sections.test.ts`
- Create: `tests/rules/materials.test.ts`
- Create: `tests/rules/enrollments.test.ts`
- Create: `tests/rules/progress.test.ts`
- Create: `tests/rules/_helpers.ts`
- Modify: `firestore.rules`

- [ ] **Step 1: Create the test helper file**

Create `tests/rules/_helpers.ts`:

```ts
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ID = 'kuppi-test-' + Date.now();

let envPromise: Promise<RulesTestEnvironment> | null = null;

export function getEnv(): Promise<RulesTestEnvironment> {
  if (!envPromise) {
    envPromise = initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve('firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  }
  return envPromise;
}

export async function seedUser(env: RulesTestEnvironment, uid: string, role: 'student' | 'teacher' | 'admin', enrolledCourseIds: string[] = []) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`users/${uid}`).set({
      uid, name: uid, email: `${uid}@test.com`, role,
      level: 'AL', fieldOfStudy: 't', createdAt: new Date(),
      enrolledCourseIds,
    });
  });
}

export async function seedCourse(env: RulesTestEnvironment, courseId: string, teacherId: string, isPublished = true) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`courses/${courseId}`).set({
      id: courseId, title: 't', description: 'd', level: 'AL', category: 'c',
      teacherId, isPublished, isPremium: false, createdAt: new Date(),
    });
  });
}

export async function seedSection(env: RulesTestEnvironment, sectionId: string, courseId: string, visibility = 'enrolled', allowedUserIds: string[] = []) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`sections/${sectionId}`).set({
      id: sectionId, courseId, title: 's', orderIndex: 0,
      visibility, allowedUserIds, createdAt: new Date(), updatedAt: new Date(),
    });
  });
}

export async function seedMaterial(env: RulesTestEnvironment, materialId: string, courseId: string, sectionId: string, visibility = 'enrolled', allowedUserIds: string[] = []) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc(`materials/${materialId}`).set({
      id: materialId, courseId, sectionId, orderIndex: 0,
      type: 'file', title: 'm', visibility, allowedUserIds,
      completionMode: 'auto-on-view', createdAt: new Date(), updatedAt: new Date(),
    });
  });
}
```

- [ ] **Step 2: Write failing tests for sections**

Create `tests/rules/sections.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv, seedCourse, seedSection, seedUser } from './_helpers';

describe('sections rules', () => {
  afterAll(async () => { await (await getEnv()).cleanup(); });

  beforeEach(async () => { await (await getEnv()).clearFirestore(); });

  it('enrolled student can read enrolled section', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1', 'enrolled');
    await seedUser(env, 'stu', 'student', ['c1']);
    const ctx = env.authenticatedContext('stu').firestore();
    await assertSucceeds(ctx.doc('sections/s1').get());
  });

  it('non-enrolled student cannot read enrolled section', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1', 'enrolled');
    await seedUser(env, 'stu', 'student', []);
    const ctx = env.authenticatedContext('stu').firestore();
    await assertFails(ctx.doc('sections/s1').get());
  });

  it('any authenticated user can read public section', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1', 'public');
    await seedUser(env, 'stu', 'student', []);
    const ctx = env.authenticatedContext('stu').firestore();
    await assertSucceeds(ctx.doc('sections/s1').get());
  });

  it('restricted section: only listed users can read', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1', 'restricted', ['allowed-stu']);
    await seedUser(env, 'allowed-stu', 'student', []);
    await seedUser(env, 'denied-stu', 'student', []);
    const ok = env.authenticatedContext('allowed-stu').firestore();
    const no = env.authenticatedContext('denied-stu').firestore();
    await assertSucceeds(ok.doc('sections/s1').get());
    await assertFails(no.doc('sections/s1').get());
  });

  it('hidden section: students cannot read, course teacher can', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1', 'hidden');
    await seedUser(env, 'stu', 'student', ['c1']);
    await seedUser(env, 'teacher-a', 'teacher');
    await assertFails(env.authenticatedContext('stu').firestore().doc('sections/s1').get());
    await assertSucceeds(env.authenticatedContext('teacher-a').firestore().doc('sections/s1').get());
  });

  it('only the course teacher can create a section', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedUser(env, 'teacher-a', 'teacher');
    await seedUser(env, 'teacher-b', 'teacher');
    const okWrite = { id: 'sNew', courseId: 'c1', title: 's', orderIndex: 0,
      visibility: 'enrolled', createdAt: new Date(), updatedAt: new Date() };
    await assertSucceeds(env.authenticatedContext('teacher-a').firestore().doc('sections/sNew').set(okWrite));
    await assertFails(env.authenticatedContext('teacher-b').firestore().doc('sections/sNew').set(okWrite));
  });
});
```

- [ ] **Step 3: Write failing tests for materials**

Create `tests/rules/materials.test.ts`:

```ts
import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv, seedCourse, seedMaterial, seedSection, seedUser } from './_helpers';

describe('materials rules', () => {
  afterAll(async () => { await (await getEnv()).cleanup(); });
  beforeEach(async () => { await (await getEnv()).clearFirestore(); });

  it('enrolled student reads enrolled material', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1');
    await seedMaterial(env, 'm1', 'c1', 's1', 'enrolled');
    await seedUser(env, 'stu', 'student', ['c1']);
    await assertSucceeds(env.authenticatedContext('stu').firestore().doc('materials/m1').get());
  });

  it('non-enrolled student cannot read enrolled material', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1');
    await seedMaterial(env, 'm1', 'c1', 's1', 'enrolled');
    await seedUser(env, 'stu', 'student', []);
    await assertFails(env.authenticatedContext('stu').firestore().doc('materials/m1').get());
  });

  it('teacher of another course cannot edit this material', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1');
    await seedMaterial(env, 'm1', 'c1', 's1', 'enrolled');
    await seedUser(env, 'teacher-b', 'teacher');
    await assertFails(env.authenticatedContext('teacher-b').firestore().doc('materials/m1').update({ title: 'evil' }));
  });

  it('restricted material visible only to allowed users', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedSection(env, 's1', 'c1');
    await seedMaterial(env, 'm1', 'c1', 's1', 'restricted', ['allowed']);
    await seedUser(env, 'allowed', 'student', []);
    await seedUser(env, 'denied',  'student', ['c1']);
    await assertSucceeds(env.authenticatedContext('allowed').firestore().doc('materials/m1').get());
    await assertFails(env.authenticatedContext('denied').firestore().doc('materials/m1').get());
  });
});
```

- [ ] **Step 4: Write failing tests for enrollments**

Create `tests/rules/enrollments.test.ts`:

```ts
import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv, seedCourse, seedUser } from './_helpers';

describe('enrollments rules', () => {
  afterAll(async () => { await (await getEnv()).cleanup(); });
  beforeEach(async () => { await (await getEnv()).clearFirestore(); });

  it('student self-enrols with deterministic ID into a published course', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a', true);
    await seedUser(env, 'stu', 'student');
    const ctx = env.authenticatedContext('stu').firestore();
    await assertSucceeds(ctx.doc('enrollments/c1_stu').set({
      id: 'c1_stu', courseId: 'c1', studentId: 'stu', enrolledAt: new Date(),
    }));
  });

  it('enrolment fails when courseId does not match the doc ID', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a', true);
    await seedUser(env, 'stu', 'student');
    const ctx = env.authenticatedContext('stu').firestore();
    await assertFails(ctx.doc('enrollments/wrong_id').set({
      id: 'wrong_id', courseId: 'c1', studentId: 'stu', enrolledAt: new Date(),
    }));
  });

  it('enrolment fails for unpublished course', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a', false);
    await seedUser(env, 'stu', 'student');
    const ctx = env.authenticatedContext('stu').firestore();
    await assertFails(ctx.doc('enrollments/c1_stu').set({
      id: 'c1_stu', courseId: 'c1', studentId: 'stu', enrolledAt: new Date(),
    }));
  });

  it('student cannot enrol someone else', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a', true);
    await seedUser(env, 'stu', 'student');
    const ctx = env.authenticatedContext('stu').firestore();
    await assertFails(ctx.doc('enrollments/c1_other').set({
      id: 'c1_other', courseId: 'c1', studentId: 'other', enrolledAt: new Date(),
    }));
  });
});
```

- [ ] **Step 5: Write failing tests for userCourseProgress**

Create `tests/rules/progress.test.ts`:

```ts
import { afterAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getEnv, seedCourse, seedUser } from './_helpers';

describe('userCourseProgress rules', () => {
  afterAll(async () => { await (await getEnv()).cleanup(); });
  beforeEach(async () => { await (await getEnv()).clearFirestore(); });

  it('enrolled student can create their own progress doc', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedUser(env, 'stu', 'student', ['c1']);
    const ctx = env.authenticatedContext('stu').firestore();
    await assertSucceeds(ctx.doc('userCourseProgress/stu_c1').set({
      id: 'stu_c1', userId: 'stu', courseId: 'c1',
      completedItemIds: [], manuallyMarkedItemIds: [], lastUpdated: new Date(),
    }));
  });

  it('non-enrolled student cannot create progress doc', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedUser(env, 'stu', 'student', []);
    const ctx = env.authenticatedContext('stu').firestore();
    await assertFails(ctx.doc('userCourseProgress/stu_c1').set({
      id: 'stu_c1', userId: 'stu', courseId: 'c1',
      completedItemIds: [], manuallyMarkedItemIds: [], lastUpdated: new Date(),
    }));
  });

  it('student cannot read another student\'s progress', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedUser(env, 'stu1', 'student', ['c1']);
    await seedUser(env, 'stu2', 'student', ['c1']);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('userCourseProgress/stu1_c1').set({
        id: 'stu1_c1', userId: 'stu1', courseId: 'c1',
        completedItemIds: [], manuallyMarkedItemIds: [], lastUpdated: new Date(),
      });
    });
    const ctx = env.authenticatedContext('stu2').firestore();
    await assertFails(ctx.doc('userCourseProgress/stu1_c1').get());
  });

  it('course teacher can read student progress', async () => {
    const env = await getEnv();
    await seedCourse(env, 'c1', 'teacher-a');
    await seedUser(env, 'stu', 'student', ['c1']);
    await seedUser(env, 'teacher-a', 'teacher');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('userCourseProgress/stu_c1').set({
        id: 'stu_c1', userId: 'stu', courseId: 'c1',
        completedItemIds: [], manuallyMarkedItemIds: [], lastUpdated: new Date(),
      });
    });
    await assertSucceeds(env.authenticatedContext('teacher-a').firestore().doc('userCourseProgress/stu_c1').get());
  });
});
```

- [ ] **Step 6: Run the tests against the OLD rules and confirm they fail**

Start the emulators in another terminal: `npm run emulators`
Then in this terminal:

Run: `npm run test:rules`
Expected: most tests FAIL (current rules use `match /courseModules/{moduleId}`, no `sections`, no visibility, no deterministic enrollment IDs).

- [ ] **Step 7: Update `firestore.rules` to make tests pass**

Replace the **entire body** of `firestore.rules` with:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helpers ─────────────────────────────────────────────────────────
    function isAuthenticated() { return request.auth != null; }
    function isUser(userId)    { return isAuthenticated() && request.auth.uid == userId; }
    function getUserData()     { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function isAdmin()         { return isAuthenticated() && getUserData().role == 'admin'; }
    function isTeacher()       { return isAuthenticated() && getUserData().role == 'teacher'; }
    function isStudent()       { return isAuthenticated() && getUserData().role == 'student'; }

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

    // ─── Users ───────────────────────────────────────────────────────────
    match /users/{userId} {
      allow read:   if isAuthenticated();
      allow create: if isUser(userId);
      allow update: if isUser(userId) || isAdmin();
      allow delete: if isAdmin();
    }

    // ─── Courses ─────────────────────────────────────────────────────────
    match /courses/{courseId} {
      allow read:   if resource.data.isPublished
                    || (isAuthenticated() && isUser(resource.data.teacherId))
                    || isAdmin();
      allow create: if isTeacher();
      allow update,
            delete: if isUser(resource.data.teacherId) || isAdmin();
    }

    // ─── Sections ────────────────────────────────────────────────────────
    match /sections/{sectionId} {
      allow read:   if canViewItem(resource.data);
      allow create: if isTeacher() && isCourseTeacher(request.resource.data.courseId);
      allow update,
            delete: if isCourseTeacher(resource.data.courseId) || isAdmin();
    }

    // ─── Materials ───────────────────────────────────────────────────────
    match /materials/{materialId} {
      allow read:   if canViewItem(resource.data);
      allow create: if isTeacher() && isCourseTeacher(request.resource.data.courseId);
      allow update,
            delete: if isCourseTeacher(resource.data.courseId) || isAdmin();
    }

    // ─── Enrollments (deterministic ID `${courseId}_${studentId}`) ──────
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

    // ─── User course progress (one doc per user per course) ─────────────
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

    // ─── Existing collections (kept verbatim) ───────────────────────────
    match /materials_legacy_courseModules/{moduleId} {
      // Placeholder for the old courseModules collection retained during
      // migration. The migration script renames docs out of `courseModules`
      // into `sections`. After migration completes, remove the old rule
      // block from this file. For now, leave the original block below.
    }

    match /courseModules/{moduleId} {
      allow read: if isAuthenticated();
      allow create: if isTeacher();
      allow update, delete: if isAdmin() ||
        (isTeacher() && isUser(get(/databases/$(database)/documents/courses/$(resource.data.courseId)).data.teacherId));
    }

    match /liveSessions/{sessionId} {
      allow read: if isAuthenticated();
      allow create: if isTeacher();
      allow update, delete: if isAdmin() ||
        (isTeacher() && isUser(get(/databases/$(database)/documents/courses/$(resource.data.courseId)).data.teacherId));
    }

    match /announcements/{announcementId} {
      allow read: if true;
      allow create: if isAdmin() || isTeacher();
      allow update, delete: if isAdmin();
    }

    match /teacherOffers/{offerId} {
      allow read: if resource.data.isActive || isUser(resource.data.teacherId) || isAdmin();
      allow create: if isTeacher() && isUser(request.resource.data.teacherId);
      allow update: if isUser(resource.data.teacherId) || isAdmin();
      allow delete: if isUser(resource.data.teacherId) || isAdmin();
    }

    match /learnRequests/{requestId} {
      allow read: if resource.data.isActive || isUser(resource.data.studentId) || isAdmin();
      allow create: if isStudent() && isUser(request.resource.data.studentId);
      allow update: if isUser(resource.data.studentId) || isAdmin();
      allow delete: if isUser(resource.data.studentId) || isAdmin();
    }

    // Conversations + messages + Q&A blocks: copy verbatim from the
    // existing firestore.rules file below this line. (DO NOT replace
    // them — preserve them as-is.)
  }
}
```

**IMPORTANT**: the rules file above is incomplete on purpose. Open the existing `firestore.rules`, find every block AFTER the `learnRequests` rule (conversations, messages, Q&A, etc.), and **paste them in verbatim** before the final two closing braces. The rules above only show the changed/new parts.

- [ ] **Step 8: Re-run rule tests**

Run: `npm run test:rules`
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add firestore.rules tests/rules/
git commit -m "feat(rules): add Moodle-style visibility + enrollment + progress rules with tests"
```

---

## Task 7: Implement `lib/enrollment.ts` with tests

**Files:**
- Create: `tests/lib/enrollment.test.ts`
- Create: `src/lib/enrollment.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/enrollment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { enrollmentDocId } from '@/lib/enrollment';

describe('enrollmentDocId', () => {
  it('produces deterministic id from courseId and studentId', () => {
    expect(enrollmentDocId('course-abc', 'user-xyz')).toBe('course-abc_user-xyz');
  });

  it('throws on empty courseId', () => {
    expect(() => enrollmentDocId('', 'u')).toThrow();
  });

  it('throws on empty studentId', () => {
    expect(() => enrollmentDocId('c', '')).toThrow();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:lib -- enrollment`
Expected: FAIL — `Cannot find module '@/lib/enrollment'`.

- [ ] **Step 3: Create `src/lib/enrollment.ts`**

```ts
import {
  arrayRemove, arrayUnion, doc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/** Build the deterministic enrollment doc ID. */
export function enrollmentDocId(courseId: string, studentId: string): string {
  if (!courseId) throw new Error('courseId is required');
  if (!studentId) throw new Error('studentId is required');
  return `${courseId}_${studentId}`;
}

/**
 * Self-enrol the current student in a course. Atomic — writes both the
 * enrollment doc and the user's enrolledCourseIds array in one batch.
 */
export async function enrolStudent(courseId: string, studentId: string): Promise<void> {
  const batch = writeBatch(db);
  const id = enrollmentDocId(courseId, studentId);

  batch.set(doc(db, 'enrollments', id), {
    id, courseId, studentId, enrolledAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', studentId), {
    enrolledCourseIds: arrayUnion(courseId),
  });

  await batch.commit();
}

/** Reverse of enrolStudent. */
export async function unenrolStudent(courseId: string, studentId: string): Promise<void> {
  const batch = writeBatch(db);
  const id = enrollmentDocId(courseId, studentId);

  batch.delete(doc(db, 'enrollments', id));
  batch.update(doc(db, 'users', studentId), {
    enrolledCourseIds: arrayRemove(courseId),
  });

  await batch.commit();
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:lib -- enrollment`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/enrollment.ts tests/lib/enrollment.test.ts
git commit -m "feat(lib): batched enrol/unenrol with deterministic doc IDs"
```

---

## Task 8: Implement `lib/progress.ts` with tests

**Files:**
- Create: `tests/lib/progress.test.ts`
- Create: `src/lib/progress.ts`

- [ ] **Step 1: Write failing tests for the pure helpers**

Create `tests/lib/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { progressDocId, computeProgress } from '@/lib/progress';
import type { Material } from '@/types';

describe('progressDocId', () => {
  it('builds deterministic id', () => {
    expect(progressDocId('u1', 'c1')).toBe('u1_c1');
  });
  it('throws on empty inputs', () => {
    expect(() => progressDocId('', 'c1')).toThrow();
    expect(() => progressDocId('u1', '')).toThrow();
  });
});

describe('computeProgress', () => {
  const m = (id: string, completionMode: Material['completionMode']): Material => ({
    id, courseId: 'c', sectionId: 's', orderIndex: 0,
    type: 'file', title: id, visibility: 'enrolled', completionMode,
    createdAt: new Date(), updatedAt: new Date(),
  });

  it('counts only materials with completionMode != none', () => {
    const items = [m('a', 'auto-on-view'), m('b', 'manual'), m('c', 'none')];
    expect(computeProgress(items, ['a'])).toEqual({ completed: 1, total: 2, percent: 50 });
  });

  it('ignores completed items that are not in the visible list', () => {
    const items = [m('a', 'auto-on-view')];
    expect(computeProgress(items, ['a', 'orphan'])).toEqual({ completed: 1, total: 1, percent: 100 });
  });

  it('returns zero when total is zero', () => {
    expect(computeProgress([], [])).toEqual({ completed: 0, total: 0, percent: 0 });
  });
});
```

- [ ] **Step 2: Run, verify failing**

Run: `npm run test:lib -- progress`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/progress.ts`**

```ts
import {
  arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Material, UserCourseProgress } from '@/types';

export function progressDocId(userId: string, courseId: string): string {
  if (!userId) throw new Error('userId required');
  if (!courseId) throw new Error('courseId required');
  return `${userId}_${courseId}`;
}

export interface ProgressSummary { completed: number; total: number; percent: number; }

/** Compute completion summary against the visible-and-completable items only. */
export function computeProgress(visibleMaterials: Material[], completedItemIds: string[]): ProgressSummary {
  const completable = visibleMaterials.filter((m) => m.completionMode !== 'none');
  const set = new Set(completedItemIds);
  const completed = completable.filter((m) => set.has(m.id)).length;
  const total = completable.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

export async function getProgress(userId: string, courseId: string): Promise<UserCourseProgress | null> {
  const snap = await getDoc(doc(db, 'userCourseProgress', progressDocId(userId, courseId)));
  return snap.exists() ? (snap.data() as UserCourseProgress) : null;
}

/** Mark an item complete. `manual=true` also tracks it in the manuallyMarked array. */
export async function markComplete(
  userId: string, courseId: string, materialId: string, manual: boolean,
): Promise<void> {
  const id = progressDocId(userId, courseId);
  const data: Partial<UserCourseProgress> & Record<string, unknown> = {
    id, userId, courseId,
    completedItemIds: arrayUnion(materialId),
    lastUpdated: serverTimestamp(),
  };
  if (manual) data.manuallyMarkedItemIds = arrayUnion(materialId);
  await setDoc(doc(db, 'userCourseProgress', id), data, { merge: true });
}

/** Manual-only: untick a completion. */
export async function unmarkComplete(userId: string, courseId: string, materialId: string): Promise<void> {
  const id = progressDocId(userId, courseId);
  await setDoc(doc(db, 'userCourseProgress', id), {
    id, userId, courseId,
    completedItemIds: arrayRemove(materialId),
    manuallyMarkedItemIds: arrayRemove(materialId),
    lastUpdated: serverTimestamp(),
  }, { merge: true });
}
```

- [ ] **Step 4: Run, verify passing**

Run: `npm run test:lib -- progress`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress.ts tests/lib/progress.test.ts
git commit -m "feat(lib): completion-tracking helpers with progress computation"
```

---

## Task 9: Implement `lib/oembed.ts` with tests

**Files:**
- Create: `tests/lib/oembed.test.ts`
- Create: `src/lib/oembed.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/oembed.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { extractDomain } from '@/lib/oembed';

describe('extractDomain', () => {
  it('strips protocol and path', () => {
    expect(extractDomain('https://www.youtube.com/watch?v=abc')).toBe('youtube.com');
  });
  it('strips leading www.', () => {
    expect(extractDomain('https://www.khanacademy.org/x')).toBe('khanacademy.org');
  });
  it('returns null on invalid url', () => {
    expect(extractDomain('not a url')).toBeNull();
  });
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run test:lib -- oembed`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/oembed.ts`**

```ts
import type { OEmbedMeta } from '@/types';

const NOEMBED_BASE = 'https://noembed.com/embed';

export function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

interface NoembedResponse {
  title?: string;
  thumbnail_url?: string;
  provider_name?: string;
  error?: string;
}

/**
 * Fetch oEmbed-style metadata for a URL via noembed.com (free, no auth).
 * Returns null on any failure (network, unsupported provider, etc.).
 */
export async function fetchOEmbedMeta(url: string): Promise<OEmbedMeta | null> {
  if (!extractDomain(url)) return null;
  try {
    const res = await fetch(`${NOEMBED_BASE}?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as NoembedResponse;
    if (data.error) return null;
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      siteName: data.provider_name,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Verify passing**

Run: `npm run test:lib -- oembed`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/oembed.ts tests/lib/oembed.test.ts
git commit -m "feat(lib): oEmbed preview fetcher via noembed.com"
```

---

## Task 10: Implement `lib/storageQuota.ts` with tests

**Files:**
- Create: `tests/lib/storageQuota.test.ts`
- Create: `src/lib/storageQuota.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/storageQuota.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sumMaterialBytes, COURSE_BYTES_CAP, FILE_BYTES_CAP, formatBytes } from '@/lib/storageQuota';
import type { Material } from '@/types';

const m = (over: Partial<Material>): Material => ({
  id: 'x', courseId: 'c', sectionId: 's', orderIndex: 0,
  type: 'file', title: 't', visibility: 'enrolled', completionMode: 'none',
  createdAt: new Date(), updatedAt: new Date(), ...over,
});

describe('sumMaterialBytes', () => {
  it('sums File materials with storage=firebase only', () => {
    const items = [
      m({ type: 'file', storage: 'firebase', fileSize: 1000 }),
      m({ type: 'file', storage: 'external', fileSize: 9999 }),
      m({ type: 'url', externalUrl: 'https://x' }),
    ];
    expect(sumMaterialBytes(items)).toBe(1000);
  });

  it('sums Folder items with storage=firebase only', () => {
    const items = [m({
      type: 'folder',
      folderItems: [
        { fileName: 'a', fileUrl: 'u', storage: 'firebase', fileSize: 200 },
        { fileName: 'b', fileUrl: 'u', storage: 'external', fileSize: 9999 },
      ],
    })];
    expect(sumMaterialBytes(items)).toBe(200);
  });

  it('treats undefined fileSize as 0', () => {
    const items = [m({ type: 'file', storage: 'firebase' })];
    expect(sumMaterialBytes(items)).toBe(0);
  });
});

describe('formatBytes', () => {
  it('renders MB with one decimal', () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
  it('renders KB for small files', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
});

describe('caps', () => {
  it('FILE_BYTES_CAP is 15 MB', () => {
    expect(FILE_BYTES_CAP).toBe(15 * 1024 * 1024);
  });
  it('COURSE_BYTES_CAP is 200 MB', () => {
    expect(COURSE_BYTES_CAP).toBe(200 * 1024 * 1024);
  });
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run test:lib -- storageQuota`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/storageQuota.ts`**

```ts
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Material } from '@/types';

export const FILE_BYTES_CAP   = 15  * 1024 * 1024;
export const COURSE_BYTES_CAP = 200 * 1024 * 1024;

/** Sum first-party (Firebase Storage) bytes across the materials given. */
export function sumMaterialBytes(materials: Material[]): number {
  let total = 0;
  for (const mat of materials) {
    if (mat.type === 'file' && mat.storage === 'firebase') {
      total += mat.fileSize ?? 0;
    } else if (mat.type === 'folder' && mat.folderItems) {
      for (const f of mat.folderItems) {
        if (f.storage === 'firebase') total += f.fileSize ?? 0;
      }
    }
  }
  return total;
}

/** Fetch all materials in a course and sum their first-party storage bytes. */
export async function getCourseUsedBytes(courseId: string): Promise<number> {
  const snap = await getDocs(query(collection(db, 'materials'), where('courseId', '==', courseId)));
  const items = snap.docs.map((d) => d.data() as Material);
  return sumMaterialBytes(items);
}

/** Pretty-print a byte count for the storage quota bar. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024)        return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
```

- [ ] **Step 4: Verify passing**

Run: `npm run test:lib -- storageQuota`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storageQuota.ts tests/lib/storageQuota.test.ts
git commit -m "feat(lib): storage quota helpers (15 MB per file, 200 MB per course)"
```

---

## Task 11: Implement `lib/courseDelete.ts` (cascade cleanup)

**Files:**
- Create: `src/lib/courseDelete.ts`

This is plumbing-heavy and integration-flavoured; no unit tests (would require deep Firebase mocking with low ROI). Manual verification when wired into the UI.

- [ ] **Step 1: Create `src/lib/courseDelete.ts`**

```ts
import {
  collection, deleteDoc, doc, getDocs, query, where, writeBatch,
  arrayRemove,
} from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { Enrollment } from '@/types';

const BATCH_LIMIT = 450;

async function deleteByQuery(coll: string, courseId: string): Promise<void> {
  const snap = await getDocs(query(collection(db, coll), where('courseId', '==', courseId)));
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function deleteEnrollmentsAndUnindex(courseId: string): Promise<void> {
  const snap = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId)));
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => {
      const e = d.data() as Enrollment;
      batch.delete(d.ref);
      batch.update(doc(db, 'users', e.studentId), {
        enrolledCourseIds: arrayRemove(courseId),
      });
    });
    await batch.commit();
  }
}

async function deleteStorageFolder(courseId: string): Promise<void> {
  const folderRef = ref(storage, `courses/${courseId}`);
  const list = await listAll(folderRef);
  await Promise.all(list.items.map((item) => deleteObject(item)));
  for (const sub of list.prefixes) {
    const subList = await listAll(sub);
    await Promise.all(subList.items.map((item) => deleteObject(item)));
    for (const sub2 of subList.prefixes) {
      const sub2List = await listAll(sub2);
      await Promise.all(sub2List.items.map((item) => deleteObject(item)));
    }
  }
}

/**
 * Cascade-delete a course and every dependent doc + storage object.
 * Failures mid-cascade leave orphans — admin tools must surface those.
 */
export async function deleteCourseCascade(courseId: string): Promise<void> {
  await deleteByQuery('materials', courseId);
  await deleteByQuery('sections', courseId);
  await deleteEnrollmentsAndUnindex(courseId);
  await deleteByQuery('userCourseProgress', courseId);
  await deleteStorageFolder(courseId);
  await deleteDoc(doc(db, 'courses', courseId));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/courseDelete.ts
git commit -m "feat(lib): cascade-delete course + dependents + storage objects"
```

---

## Task 12: Migration script

**Files:**
- Create: `scripts/migrate-moodle-phase1.js`

Use plain JS (other scripts in `scripts/` are JS). Script uses firebase-admin (already a dep).

- [ ] **Step 1: Create the script**

```js
// Idempotent migration to Moodle Phase 1 schema.
// Usage:
//   node scripts/migrate-moodle-phase1.js --dry-run
//   node scripts/migrate-moodle-phase1.js --confirm
//
// Requires GOOGLE_APPLICATION_CREDENTIALS to point at a service-account JSON.

const admin = require('firebase-admin');

const DRY = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');
if (!DRY && !CONFIRM) {
  console.error('Pass --dry-run or --confirm explicitly.');
  process.exit(2);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function migrateCourseModulesToSections() {
  const snap = await db.collection('courseModules').get();
  console.log(`courseModules → sections: ${snap.size} docs`);
  for (const d of snap.docs) {
    const data = d.data();
    const next = {
      id: d.id,
      courseId: data.courseId,
      title: data.title,
      orderIndex: data.orderIndex ?? 0,
      visibility: 'enrolled',
      createdAt: data.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: data.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
    };
    if (DRY) { console.log('  would write sections/' + d.id, next); continue; }
    await db.collection('sections').doc(d.id).set(next, { merge: true });
    await d.ref.delete();
  }
}

async function backfillMaterials() {
  const snap = await db.collection('materials').get();
  console.log(`materials backfill: ${snap.size} docs`);
  for (const d of snap.docs) {
    const data = d.data();
    if (data.type && data.visibility && data.completionMode) continue; // already migrated
    const inferredType = data.externalUrl ? 'url' : 'file';
    const patch = {
      type: data.type ?? inferredType,
      sectionId: data.sectionId ?? data.moduleId,
      visibility: data.visibility ?? 'enrolled',
      completionMode: data.completionMode ?? 'auto-on-view',
      storage: data.storage ?? (data.filePath ? 'firebase' : 'external'),
      orderIndex: data.orderIndex ?? 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (DRY) { console.log('  would patch materials/' + d.id, patch); continue; }
    await d.ref.set(patch, { merge: true });
  }
}

async function migrateEnrollmentsToDeterministicId() {
  const snap = await db.collection('enrollments').get();
  console.log(`enrollments → deterministic IDs: ${snap.size} docs`);
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.courseId || !data.studentId) continue;
    const newId = `${data.courseId}_${data.studentId}`;
    if (d.id === newId) continue;
    const next = {
      id: newId, courseId: data.courseId, studentId: data.studentId,
      enrolledAt: data.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
    };
    if (DRY) { console.log('  would move enrollments/' + d.id + ' → ' + newId); continue; }
    await db.collection('enrollments').doc(newId).set(next);
    await d.ref.delete();
  }
}

async function backfillUserEnrolledCourseIds() {
  const usersSnap = await db.collection('users').get();
  console.log(`users.enrolledCourseIds backfill: ${usersSnap.size} users`);
  for (const u of usersSnap.docs) {
    const enrolSnap = await db.collection('enrollments').where('studentId', '==', u.id).get();
    const ids = enrolSnap.docs.map((e) => e.data().courseId);
    if (DRY) { console.log('  user ' + u.id + ' → enrolledCourseIds:', ids); continue; }
    await u.ref.set({ enrolledCourseIds: ids }, { merge: true });
  }
}

(async () => {
  console.log(DRY ? '*** DRY RUN ***' : '*** APPLYING ***');
  await migrateCourseModulesToSections();
  await backfillMaterials();
  await migrateEnrollmentsToDeterministicId();
  await backfillUserEnrolledCourseIds();
  console.log('Done.');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add an entry to `package.json` scripts**

Add to the `scripts` block:

```json
"migrate:moodle:dry": "node scripts/migrate-moodle-phase1.js --dry-run",
"migrate:moodle":     "node scripts/migrate-moodle-phase1.js --confirm"
```

- [ ] **Step 3: Smoke-test the script syntax**

Run: `node -c scripts/migrate-moodle-phase1.js`
Expected: no output (syntactically valid).

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-moodle-phase1.js package.json
git commit -m "feat(scripts): idempotent migration to Moodle Phase 1 schema"
```

---

## Task 13: `MaterialIcon` component

**Files:**
- Create: `src/components/course/MaterialIcon.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { ResourceType } from '@/types';

const MAP: Record<ResourceType, string> = {
  file:   '📄',
  folder: '📁',
  url:    '🔗',
  page:   '📝',
  label:  '▬',
};

export function MaterialIcon({ type, className = '' }: { type: ResourceType; className?: string }) {
  return <span aria-hidden className={`inline-block ${className}`}>{MAP[type]}</span>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/MaterialIcon.tsx
git commit -m "feat(ui): MaterialIcon mapping for the 5 resource types"
```

---

## Task 14: `RichTextEditor` component (TipTap wrapper)

**Files:**
- Create: `src/components/course/RichTextEditor.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minimal?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder, minimal }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value);
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border rounded">
      {!minimal && (
        <div className="flex gap-1 border-b px-2 py-1 text-sm">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className="px-2">B</button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className="px-2 italic">I</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="px-2">H2</button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className="px-2">•</button>
          <button type="button" onClick={() => {
            const url = prompt('URL:'); if (url) editor.chain().focus().setLink({ href: url }).run();
          }} className="px-2">🔗</button>
          <button type="button" onClick={() => {
            const url = prompt('Image URL:'); if (url) editor.chain().focus().setImage({ src: url }).run();
          }} className="px-2">🖼</button>
        </div>
      )}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/RichTextEditor.tsx
git commit -m "feat(ui): TipTap rich-text editor wrapper"
```

---

## Task 15: `RichTextRender` component (DOMPurify display)

**Files:**
- Create: `src/components/course/RichTextRender.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

export function RichTextRender({ html, className = '' }: { html: string; className?: string }) {
  const safe = useMemo(() => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','strong','em','u','h1','h2','h3','h4','ul','ol','li','a','img','blockquote','code','pre','hr','span','div'],
    ALLOWED_ATTR: ['href','src','alt','title','target','rel','class'],
  }), [html]);
  return <div className={`prose prose-sm max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: safe }} />;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/RichTextRender.tsx
git commit -m "feat(ui): RichTextRender with DOMPurify sanitisation"
```

---

## Task 16: `UserPickerField` component

**Files:**
- Create: `src/components/course/UserPickerField.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import type { User } from '@/types';

interface Props {
  value: string[];                       // selected user IDs
  onChange: (ids: string[]) => void;
}

export function UserPickerField({ value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<Record<string, User>>({});

  // Hydrate selected users on mount.
  useEffect(() => {
    (async () => {
      const next: Record<string, User> = {};
      for (const uid of value) {
        if (selected[uid]) { next[uid] = selected[uid]; continue; }
        const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid), limit(1)));
        snap.docs.forEach((d) => { next[d.id] = d.data() as User; });
      }
      setSelected(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join(',')]);

  // Debounced search by email prefix; capped at 10.
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const q = search.toLowerCase();
      const snap = await getDocs(query(
        collection(db, 'users'),
        orderBy('email'),
        where('email', '>=', q),
        where('email', '<=', q + ''),
        limit(10),
      ));
      setResults(snap.docs.map((d) => d.data() as User));
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const add = (u: User) => { onChange(Array.from(new Set([...value, u.uid]))); setSearch(''); setResults([]); };
  const remove = (uid: string) => onChange(value.filter((v) => v !== uid));

  return (
    <div className="space-y-2">
      <input value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder="Search by email"
             className="w-full border rounded px-2 py-1 text-sm" />
      {results.length > 0 && (
        <ul className="border rounded text-sm max-h-40 overflow-auto">
          {results.map((u) => (
            <li key={u.uid}>
              <button type="button" onClick={() => add(u)} className="w-full text-left px-2 py-1 hover:bg-gray-50">
                {u.name} <span className="text-gray-500">({u.email})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-1">
        {value.map((uid) => (
          <span key={uid} className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-xs">
            {selected[uid]?.name ?? uid}
            <button type="button" onClick={() => remove(uid)} aria-label="Remove">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/UserPickerField.tsx
git commit -m "feat(ui): UserPickerField with debounced email search"
```

---

## Task 17: `VisibilityField` and `CompletionField`

**Files:**
- Create: `src/components/course/forms/VisibilityField.tsx`
- Create: `src/components/course/forms/CompletionField.tsx`

- [ ] **Step 1: Create `VisibilityField.tsx`**

```tsx
'use client';
import type { Visibility } from '@/types';
import { UserPickerField } from '@/components/course/UserPickerField';

interface Props {
  value: Visibility;
  onChange: (v: Visibility) => void;
  allowedUserIds: string[];
  onAllowedUsersChange: (ids: string[]) => void;
}

const OPTIONS: { value: Visibility; label: string; help: string }[] = [
  { value: 'public',     label: 'Public',     help: 'Any logged-in user can view (no enrolment needed).' },
  { value: 'enrolled',   label: 'Enrolled',   help: 'Default. Only enrolled students.' },
  { value: 'restricted', label: 'Restricted', help: 'Only specific people you list.' },
  { value: 'hidden',     label: 'Hidden',     help: 'Draft. Only you can see this.' },
];

export function VisibilityField({ value, onChange, allowedUserIds, onAllowedUsersChange }: Props) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Visibility</legend>
      {OPTIONS.map((o) => (
        <label key={o.value} className="flex items-start gap-2 text-sm">
          <input type="radio" name="visibility" value={o.value} checked={value === o.value}
                 onChange={() => onChange(o.value)} className="mt-1" />
          <span>
            <span className="font-medium">{o.label}</span>
            <span className="block text-xs text-gray-600">{o.help}</span>
          </span>
        </label>
      ))}
      {value === 'restricted' && (
        <div className="ml-6">
          <UserPickerField value={allowedUserIds} onChange={onAllowedUsersChange} />
        </div>
      )}
    </fieldset>
  );
}
```

- [ ] **Step 2: Create `CompletionField.tsx`**

```tsx
'use client';
import type { CompletionMode } from '@/types';

interface Props { value: CompletionMode; onChange: (v: CompletionMode) => void; allowAuto?: boolean; }

const ALL: { value: CompletionMode; label: string; help: string }[] = [
  { value: 'none',         label: 'None',          help: 'No checkbox.' },
  { value: 'manual',       label: 'Manual ✓',      help: 'Student ticks it themselves.' },
  { value: 'auto-on-view', label: 'Auto on view',  help: 'Auto-ticks when the student opens the resource.' },
];

export function CompletionField({ value, onChange, allowAuto = true }: Props) {
  const opts = allowAuto ? ALL : ALL.filter((o) => o.value !== 'auto-on-view');
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Completion</legend>
      {opts.map((o) => (
        <label key={o.value} className="flex items-start gap-2 text-sm">
          <input type="radio" name="completion" value={o.value} checked={value === o.value}
                 onChange={() => onChange(o.value)} className="mt-1" />
          <span>
            <span className="font-medium">{o.label}</span>
            <span className="block text-xs text-gray-600">{o.help}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/course/forms/VisibilityField.tsx src/components/course/forms/CompletionField.tsx
git commit -m "feat(ui): shared VisibilityField + CompletionField form controls"
```

---

## Task 18: `OEmbedPreview` component

**Files:**
- Create: `src/components/course/OEmbedPreview.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchOEmbedMeta } from '@/lib/oembed';
import type { OEmbedMeta } from '@/types';

export function OEmbedPreview({ url, onResolved }: { url: string; onResolved?: (m: OEmbedMeta | null) => void }) {
  const [meta, setMeta] = useState<OEmbedMeta | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) { setMeta(null); onResolved?.(null); return; }
    setLoading(true);
    fetchOEmbedMeta(url).then((m) => { setMeta(m); onResolved?.(m); }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!url) return null;
  if (loading) return <div className="text-xs text-gray-500">Fetching preview…</div>;
  if (!meta) return <div className="text-xs text-gray-500">No preview available.</div>;

  return (
    <div className="flex gap-3 border rounded p-2 text-sm">
      {meta.thumbnailUrl && <img src={meta.thumbnailUrl} alt="" className="w-24 h-16 object-cover rounded" />}
      <div>
        <div className="font-medium">{meta.title}</div>
        <div className="text-xs text-gray-600">{meta.siteName}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/OEmbedPreview.tsx
git commit -m "feat(ui): OEmbedPreview for URL-type resources"
```

---

## Task 19: `StorageQuotaBar` component

**Files:**
- Create: `src/components/course/StorageQuotaBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { COURSE_BYTES_CAP, formatBytes, getCourseUsedBytes } from '@/lib/storageQuota';

export function StorageQuotaBar({ courseId, refreshKey }: { courseId: string; refreshKey?: number }) {
  const [used, setUsed] = useState(0);
  useEffect(() => { getCourseUsedBytes(courseId).then(setUsed); }, [courseId, refreshKey]);
  const pct = Math.min(100, Math.round((used / COURSE_BYTES_CAP) * 100));
  const danger = pct >= 90;
  return (
    <div className="text-xs">
      <div className={`mb-0.5 ${danger ? 'text-red-700' : 'text-gray-600'}`}>
        Storage: {formatBytes(used)} / {formatBytes(COURSE_BYTES_CAP)} ({pct}%)
      </div>
      <div className="h-1.5 bg-gray-200 rounded">
        <div className={`h-1.5 rounded ${danger ? 'bg-red-600' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/StorageQuotaBar.tsx
git commit -m "feat(ui): StorageQuotaBar showing per-course usage"
```

---

## Task 20: `FileResourceForm`

**Files:**
- Create: `src/components/course/forms/FileResourceForm.tsx`

- [ ] **Step 1: Create the form**

```tsx
'use client';
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { COURSE_BYTES_CAP, FILE_BYTES_CAP, getCourseUsedBytes } from '@/lib/storageQuota';
import { VisibilityField } from './VisibilityField';
import { CompletionField } from './CompletionField';
import type { FileStorage, Material, Visibility, CompletionMode } from '@/types';

export interface FileFormValue {
  title: string; description?: string;
  visibility: Visibility; allowedUserIds: string[];
  completionMode: CompletionMode;
  storage: FileStorage;
  fileUrl?: string; filePath?: string; fileName?: string; fileSize?: number; mimeType?: string;
}

interface Props {
  courseId: string;
  materialId: string;                            // pre-allocated id used in storage path
  initial?: Partial<FileFormValue>;
  onSave: (v: FileFormValue) => Promise<void> | void;
  onCancel: () => void;
}

export function FileResourceForm({ courseId, materialId, initial, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'enrolled');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(initial?.allowedUserIds ?? []);
  const [completionMode, setCompletionMode] = useState<CompletionMode>(initial?.completionMode ?? 'auto-on-view');
  const [src, setSrc] = useState<FileStorage>(initial?.storage ?? 'firebase');
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? '');
  const [filePath, setFilePath] = useState(initial?.filePath ?? '');
  const [fileName, setFileName] = useState(initial?.fileName ?? '');
  const [fileSize, setFileSize] = useState(initial?.fileSize ?? 0);
  const [mimeType, setMimeType] = useState(initial?.mimeType ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload(file: File) {
    setError(null);
    if (file.size > FILE_BYTES_CAP) { setError('File exceeds 15 MB cap.'); return; }
    const used = await getCourseUsedBytes(courseId);
    if (used + file.size > COURSE_BYTES_CAP) {
      setError('Course storage full — use external link instead.'); return;
    }
    setBusy(true);
    const path = `courses/${courseId}/materials/${materialId}/${file.name}`;
    const r = ref(storage, path);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    setFileUrl(url); setFilePath(path); setFileName(file.name); setFileSize(file.size); setMimeType(file.type);
    setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title required.'); return; }
    if (!fileUrl) { setError('File or link required.'); return; }
    await onSave({
      title, description, visibility, allowedUserIds, completionMode,
      storage: src, fileUrl, filePath, fileName, fileSize, mimeType,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <label className="block">
        <span className="font-medium">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-2 py-1" required />
      </label>
      <label className="block">
        <span className="font-medium">Description</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-2 py-1" />
      </label>

      <fieldset className="space-y-2">
        <legend className="font-medium">Source</legend>
        <label className="flex gap-2">
          <input type="radio" name="src" checked={src === 'firebase'} onChange={() => setSrc('firebase')} />
          Upload to Kuppi (≤15 MB)
        </label>
        <label className="flex gap-2">
          <input type="radio" name="src" checked={src === 'external'} onChange={() => setSrc('external')} />
          External link (Drive / Dropbox / etc.)
        </label>
      </fieldset>

      {src === 'firebase' ? (
        <input type="file" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={busy} />
      ) : (
        <label className="block">
          <span className="font-medium">External URL</span>
          <input value={fileUrl} onChange={(e) => {
            setFileUrl(e.target.value);
            try { setFileName(new URL(e.target.value).pathname.split('/').pop() ?? 'file'); } catch { /* ignore */ }
          }} className="w-full border rounded px-2 py-1" />
        </label>
      )}
      {fileName && <div className="text-xs text-gray-600">Selected: {fileName} ({fileSize ? Math.round(fileSize/1024) + ' KB' : 'unknown size'})</div>}

      <VisibilityField value={visibility} onChange={setVisibility} allowedUserIds={allowedUserIds} onAllowedUsersChange={setAllowedUserIds} />
      <CompletionField value={completionMode} onChange={setCompletionMode} />

      {error && <div className="text-red-600">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 rounded border">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/forms/FileResourceForm.tsx
git commit -m "feat(ui): FileResourceForm with upload + external link + quota check"
```

---

## Task 21: `FolderResourceForm`

**Files:**
- Create: `src/components/course/forms/FolderResourceForm.tsx`

- [ ] **Step 1: Create the form**

```tsx
'use client';
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { COURSE_BYTES_CAP, FILE_BYTES_CAP, getCourseUsedBytes } from '@/lib/storageQuota';
import { VisibilityField } from './VisibilityField';
import { CompletionField } from './CompletionField';
import type { FolderEntry, Visibility, CompletionMode } from '@/types';

export interface FolderFormValue {
  title: string; description?: string;
  visibility: Visibility; allowedUserIds: string[];
  completionMode: CompletionMode;
  folderItems: FolderEntry[];
}

interface Props {
  courseId: string; materialId: string;
  initial?: Partial<FolderFormValue>;
  onSave: (v: FolderFormValue) => Promise<void> | void;
  onCancel: () => void;
}

export function FolderResourceForm({ courseId, materialId, initial, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'enrolled');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(initial?.allowedUserIds ?? []);
  const [completionMode, setCompletionMode] = useState<CompletionMode>(initial?.completionMode ?? 'auto-on-view');
  const [items, setItems] = useState<FolderEntry[]>(initial?.folderItems ?? []);
  const [error, setError] = useState<string | null>(null);

  async function addUpload(file: File) {
    setError(null);
    if (file.size > FILE_BYTES_CAP) { setError('File exceeds 15 MB.'); return; }
    const used = await getCourseUsedBytes(courseId);
    if (used + file.size > COURSE_BYTES_CAP) { setError('Course storage full.'); return; }
    const path = `courses/${courseId}/folders/${materialId}/${file.name}`;
    const r = ref(storage, path);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    setItems((prev) => [...prev, { fileName: file.name, fileUrl: url, storage: 'firebase', filePath: path, fileSize: file.size, mimeType: file.type }]);
  }

  function addLink() {
    const url = prompt('External URL:'); if (!url) return;
    let name = 'file'; try { name = new URL(url).pathname.split('/').pop() ?? 'file'; } catch { /* ignore */ }
    setItems((prev) => [...prev, { fileName: name, fileUrl: url, storage: 'external' }]);
  }

  function remove(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title required.'); return; }
    if (items.length === 0) { setError('Add at least one file.'); return; }
    await onSave({ title, description, visibility, allowedUserIds, completionMode, folderItems: items });
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <label className="block">
        <span className="font-medium">Folder title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-2 py-1" required />
      </label>
      <label className="block">
        <span className="font-medium">Description</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-2 py-1" />
      </label>

      <div className="border rounded p-2">
        <div className="font-medium mb-2">Files in folder</div>
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between items-center">
              <span>{it.fileName} <span className="text-xs text-gray-500">({it.storage})</span></span>
              <button type="button" onClick={() => remove(i)} className="text-red-600 text-xs">Remove</button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <label className="text-xs cursor-pointer underline">
            + Upload file
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && addUpload(e.target.files[0])} />
          </label>
          <button type="button" onClick={addLink} className="text-xs underline">+ Add external link</button>
        </div>
      </div>

      <VisibilityField value={visibility} onChange={setVisibility} allowedUserIds={allowedUserIds} onAllowedUsersChange={setAllowedUserIds} />
      <CompletionField value={completionMode} onChange={setCompletionMode} />

      {error && <div className="text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 rounded border">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/forms/FolderResourceForm.tsx
git commit -m "feat(ui): FolderResourceForm with mixed upload/link items"
```

---

## Task 22: `UrlResourceForm`

**Files:**
- Create: `src/components/course/forms/UrlResourceForm.tsx`

- [ ] **Step 1: Create the form**

```tsx
'use client';
import { useState } from 'react';
import { OEmbedPreview } from '@/components/course/OEmbedPreview';
import { VisibilityField } from './VisibilityField';
import { CompletionField } from './CompletionField';
import type { OEmbedMeta, Visibility, CompletionMode } from '@/types';

export interface UrlFormValue {
  title: string; description?: string;
  visibility: Visibility; allowedUserIds: string[];
  completionMode: CompletionMode;
  externalUrl: string; externalUrlMeta?: OEmbedMeta;
}

interface Props {
  initial?: Partial<UrlFormValue>;
  onSave: (v: UrlFormValue) => Promise<void> | void;
  onCancel: () => void;
}

export function UrlResourceForm({ initial, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [externalUrl, setExternalUrl] = useState(initial?.externalUrl ?? '');
  const [meta, setMeta] = useState<OEmbedMeta | null>(initial?.externalUrlMeta ?? null);
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'enrolled');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(initial?.allowedUserIds ?? []);
  const [completionMode, setCompletionMode] = useState<CompletionMode>(initial?.completionMode ?? 'auto-on-view');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title required.'); return; }
    if (!externalUrl.trim()) { setError('URL required.'); return; }
    await onSave({ title, description, visibility, allowedUserIds, completionMode, externalUrl, externalUrlMeta: meta ?? undefined });
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <label className="block">
        <span className="font-medium">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-2 py-1" required />
      </label>
      <label className="block">
        <span className="font-medium">URL</span>
        <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} className="w-full border rounded px-2 py-1" />
      </label>
      <OEmbedPreview url={externalUrl} onResolved={setMeta} />
      <label className="block">
        <span className="font-medium">Description</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-2 py-1" />
      </label>
      <VisibilityField value={visibility} onChange={setVisibility} allowedUserIds={allowedUserIds} onAllowedUsersChange={setAllowedUserIds} />
      <CompletionField value={completionMode} onChange={setCompletionMode} />
      {error && <div className="text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 rounded border">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/forms/UrlResourceForm.tsx
git commit -m "feat(ui): UrlResourceForm with oEmbed preview"
```

---

## Task 23: `PageResourceForm`

**Files:**
- Create: `src/components/course/forms/PageResourceForm.tsx`

- [ ] **Step 1: Create the form**

```tsx
'use client';
import { useState } from 'react';
import { RichTextEditor } from '@/components/course/RichTextEditor';
import { VisibilityField } from './VisibilityField';
import { CompletionField } from './CompletionField';
import type { Visibility, CompletionMode } from '@/types';

export interface PageFormValue {
  title: string; description?: string;
  visibility: Visibility; allowedUserIds: string[];
  completionMode: CompletionMode;
  pageHtml: string;
}

interface Props {
  initial?: Partial<PageFormValue>;
  onSave: (v: PageFormValue) => Promise<void> | void;
  onCancel: () => void;
}

export function PageResourceForm({ initial, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [pageHtml, setPageHtml] = useState(initial?.pageHtml ?? '');
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'enrolled');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(initial?.allowedUserIds ?? []);
  const [completionMode, setCompletionMode] = useState<CompletionMode>(initial?.completionMode ?? 'auto-on-view');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title required.'); return; }
    if (!pageHtml.trim()) { setError('Page content required.'); return; }
    await onSave({ title, description, visibility, allowedUserIds, completionMode, pageHtml });
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <label className="block">
        <span className="font-medium">Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-2 py-1" required />
      </label>
      <label className="block">
        <span className="font-medium">Description</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-2 py-1" />
      </label>
      <div>
        <span className="font-medium block mb-1">Content</span>
        <RichTextEditor value={pageHtml} onChange={setPageHtml} />
      </div>
      <VisibilityField value={visibility} onChange={setVisibility} allowedUserIds={allowedUserIds} onAllowedUsersChange={setAllowedUserIds} />
      <CompletionField value={completionMode} onChange={setCompletionMode} />
      {error && <div className="text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 rounded border">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/forms/PageResourceForm.tsx
git commit -m "feat(ui): PageResourceForm with TipTap editor"
```

---

## Task 24: `LabelResourceForm`

**Files:**
- Create: `src/components/course/forms/LabelResourceForm.tsx`

- [ ] **Step 1: Create the form**

```tsx
'use client';
import { useState } from 'react';
import { RichTextEditor } from '@/components/course/RichTextEditor';
import { VisibilityField } from './VisibilityField';
import type { Visibility } from '@/types';

export interface LabelFormValue {
  title: string;                              // hidden in UI but stored for admin views
  visibility: Visibility; allowedUserIds: string[];
  labelHtml: string;
}

interface Props {
  initial?: Partial<LabelFormValue>;
  onSave: (v: LabelFormValue) => Promise<void> | void;
  onCancel: () => void;
}

export function LabelResourceForm({ initial, onSave, onCancel }: Props) {
  const [labelHtml, setLabelHtml] = useState(initial?.labelHtml ?? '');
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'enrolled');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(initial?.allowedUserIds ?? []);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!labelHtml.trim()) { setError('Content required.'); return; }
    await onSave({ title: 'Label', visibility, allowedUserIds, labelHtml });
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <div>
        <span className="font-medium block mb-1">Inline content</span>
        <RichTextEditor value={labelHtml} onChange={setLabelHtml} minimal />
      </div>
      <VisibilityField value={visibility} onChange={setVisibility} allowedUserIds={allowedUserIds} onAllowedUsersChange={setAllowedUserIds} />
      {error && <div className="text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 rounded border">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/forms/LabelResourceForm.tsx
git commit -m "feat(ui): LabelResourceForm (inline divider/heading)"
```

---

## Task 25: `AddResourcePicker` modal

**Files:**
- Create: `src/components/course/AddResourcePicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import type { ResourceType } from '@/types';
import { MaterialIcon } from './MaterialIcon';

interface Props { open: boolean; onPick: (t: ResourceType) => void; onClose: () => void; }

const CARDS: { type: ResourceType; label: string; help: string }[] = [
  { type: 'file',   label: 'File',   help: 'Upload or link to a single file.' },
  { type: 'folder', label: 'Folder', help: 'Group several files together.' },
  { type: 'url',    label: 'URL',    help: 'Link to a website or video.' },
  { type: 'page',   label: 'Page',   help: 'Write a rich-text page in Kuppi.' },
  { type: 'label',  label: 'Label',  help: 'Inline note or section divider.' },
];

export function AddResourcePicker({ open, onPick, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add an activity or resource</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-500">×</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CARDS.map((c) => (
            <button key={c.type} onClick={() => onPick(c.type)}
                    className="border rounded p-3 text-left hover:bg-gray-50">
              <div className="text-2xl mb-1"><MaterialIcon type={c.type} /></div>
              <div className="font-medium text-sm">{c.label}</div>
              <div className="text-xs text-gray-600">{c.help}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/AddResourcePicker.tsx
git commit -m "feat(ui): AddResourcePicker modal with 5 type cards"
```

---

## Task 26: `MaterialRow` component

**Files:**
- Create: `src/components/course/MaterialRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import { useState } from 'react';
import { MaterialIcon } from './MaterialIcon';
import { RichTextRender } from './RichTextRender';
import { markComplete } from '@/lib/progress';
import type { Material } from '@/types';

interface Props {
  material: Material;
  isTeacherEdit: boolean;
  isCompleted: boolean;
  isManual: boolean;                              // checkbox togglable when true
  userId: string | null;
  courseId: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onOpenViewer: (m: Material) => void;            // parent shows modal/preview
}

export function MaterialRow({
  material, isTeacherEdit, isCompleted, isManual, userId, courseId,
  onEdit, onDelete, onToggleVisibility, onOpenViewer,
}: Props) {
  const [completed, setCompleted] = useState(isCompleted);

  async function handleClick() {
    if (material.type === 'label') return;
    onOpenViewer(material);
    if (userId && material.completionMode === 'auto-on-view' && !completed) {
      setCompleted(true);
      try { await markComplete(userId, courseId, material.id, false); } catch { setCompleted(false); }
    }
  }

  async function handleManualToggle() {
    if (!userId || material.completionMode !== 'manual') return;
    const next = !completed;
    setCompleted(next);
    try {
      const { markComplete: mc, unmarkComplete } = await import('@/lib/progress');
      if (next) await mc(userId, courseId, material.id, true);
      else      await unmarkComplete(userId, courseId, material.id);
    } catch { setCompleted(!next); }
  }

  if (material.type === 'label') {
    return (
      <div className="py-1">
        <RichTextRender html={material.labelHtml ?? ''} />
        {isTeacherEdit && (
          <div className="text-xs text-gray-500">
            <button onClick={onEdit} className="underline mr-2">Edit</button>
            <button onClick={onToggleVisibility} className="underline mr-2">👁 {material.visibility}</button>
            <button onClick={onDelete} className="underline text-red-600">Delete</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <MaterialIcon type={material.type} />
      <button onClick={handleClick} className="flex-1 text-left hover:underline">
        <span className="font-medium">{material.title}</span>
        {material.description && <span className="block text-xs text-gray-600">{material.description}</span>}
      </button>
      {material.completionMode !== 'none' && (
        <input type="checkbox" checked={completed}
               disabled={material.completionMode === 'auto-on-view'}
               onChange={handleManualToggle}
               aria-label={completed ? 'Completed' : 'Mark complete'} />
      )}
      {isTeacherEdit && (
        <span className="opacity-0 group-hover:opacity-100 flex gap-1 text-xs text-gray-600">
          <button onClick={onToggleVisibility} title={material.visibility}>👁</button>
          <button onClick={onEdit} title="Edit">✏️</button>
          <button onClick={onDelete} title="Delete" className="text-red-600">🗑</button>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/MaterialRow.tsx
git commit -m "feat(ui): MaterialRow with completion ticks + edit chrome"
```

---

## Task 27: `SectionCard` component

**Files:**
- Create: `src/components/course/SectionCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MaterialRow } from './MaterialRow';
import { RichTextRender } from './RichTextRender';
import type { Material, Section } from '@/types';

interface Props {
  section: Section;
  materials: Material[];                 // already filtered by visibility for current user
  isTeacherEdit: boolean;
  userId: string | null;
  courseId: string;
  completedItemIds: Set<string>;
  manuallyMarkedItemIds: Set<string>;
  onSectionRename: (id: string, newTitle: string) => void;
  onSectionDelete: (id: string) => void;
  onSectionToggleVisibility: (id: string) => void;
  onAddResource: (sectionId: string) => void;
  onMaterialEdit: (m: Material) => void;
  onMaterialDelete: (id: string) => void;
  onMaterialToggleVisibility: (id: string) => void;
  onOpenViewer: (m: Material) => void;
}

export function SectionCard(p: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: p.section.id });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`sec-collapsed:${p.courseId}:${p.section.id}`) === '1';
  });
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(p.section.title);

  function commitTitle() {
    setEditing(false);
    if (draftTitle.trim() && draftTitle !== p.section.title) {
      p.onSectionRename(p.section.id, draftTitle.trim());
    }
  }
  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(`sec-collapsed:${p.courseId}:${p.section.id}`, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
         className="border rounded mb-3 bg-white">
      <div className="flex items-center px-3 py-2 border-b group">
        {p.isTeacherEdit && (
          <button {...listeners} {...attributes} className="cursor-grab text-gray-400 mr-2" aria-label="Drag section">☰</button>
        )}
        <button onClick={toggleCollapse} className="mr-2">{collapsed ? '▷' : '▼'}</button>
        {editing ? (
          <input autoFocus value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)}
                 onBlur={commitTitle} onKeyDown={(e) => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setDraftTitle(p.section.title); setEditing(false); } }}
                 className="flex-1 border rounded px-2 py-0.5" />
        ) : (
          <button onDoubleClick={() => p.isTeacherEdit && setEditing(true)} className="flex-1 text-left font-semibold">
            {p.section.title}
            {p.section.visibility === 'hidden' && <span className="ml-2 text-xs text-orange-600">(hidden)</span>}
          </button>
        )}
        {p.isTeacherEdit && (
          <span className="opacity-0 group-hover:opacity-100 flex gap-1 text-xs text-gray-600">
            <button onClick={() => p.onSectionToggleVisibility(p.section.id)} title={p.section.visibility}>👁</button>
            <button onClick={() => setEditing(true)} title="Rename">✏️</button>
            <button onClick={() => p.onSectionDelete(p.section.id)} title="Delete" className="text-red-600">🗑</button>
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="px-3 py-2 space-y-1">
          {p.section.summary && <RichTextRender html={p.section.summary} className="mb-2" />}
          {p.materials.map((m) => (
            <MaterialRow
              key={m.id} material={m}
              isTeacherEdit={p.isTeacherEdit}
              isCompleted={p.completedItemIds.has(m.id)}
              isManual={p.manuallyMarkedItemIds.has(m.id)}
              userId={p.userId} courseId={p.courseId}
              onEdit={() => p.onMaterialEdit(m)}
              onDelete={() => p.onMaterialDelete(m.id)}
              onToggleVisibility={() => p.onMaterialToggleVisibility(m.id)}
              onOpenViewer={p.onOpenViewer}
            />
          ))}
          {p.isTeacherEdit && (
            <button onClick={() => p.onAddResource(p.section.id)} className="text-sm text-blue-600 mt-2">
              + Add an activity or resource
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/SectionCard.tsx
git commit -m "feat(ui): SectionCard with inline rename, drag handle, collapse"
```

---

## Task 28: `SectionList` orchestrator (with dnd reordering)

**Files:**
- Create: `src/components/course/SectionList.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { doc, writeBatch } from 'firebase/firestore';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { SectionCard } from './SectionCard';
import type { Material, Section } from '@/types';

interface Props {
  courseId: string;
  sections: Section[];
  materialsBySection: Record<string, Material[]>;
  isTeacherEdit: boolean;
  userId: string | null;
  completedItemIds: Set<string>;
  manuallyMarkedItemIds: Set<string>;
  onSectionRename: (id: string, t: string) => void;
  onSectionDelete: (id: string) => void;
  onSectionToggleVisibility: (id: string) => void;
  onAddResource: (sectionId: string) => void;
  onMaterialEdit: (m: Material) => void;
  onMaterialDelete: (id: string) => void;
  onMaterialToggleVisibility: (id: string) => void;
  onOpenViewer: (m: Material) => void;
  onSectionsReordered: (next: Section[]) => void;
}

export function SectionList(p: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [order, setOrder] = useState(p.sections);

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.findIndex((s) => s.id === active.id);
    const newIdx = order.findIndex((s) => s.id === over.id);
    const next = arrayMove(order, oldIdx, newIdx);
    setOrder(next);
    p.onSectionsReordered(next);
    const batch = writeBatch(db);
    next.forEach((s, i) => batch.update(doc(db, 'sections', s.id), { orderIndex: i }));
    await batch.commit();
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={order.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {order.map((s) => (
          <SectionCard key={s.id} section={s}
            materials={p.materialsBySection[s.id] ?? []}
            isTeacherEdit={p.isTeacherEdit}
            userId={p.userId} courseId={p.courseId}
            completedItemIds={p.completedItemIds}
            manuallyMarkedItemIds={p.manuallyMarkedItemIds}
            onSectionRename={p.onSectionRename}
            onSectionDelete={p.onSectionDelete}
            onSectionToggleVisibility={p.onSectionToggleVisibility}
            onAddResource={p.onAddResource}
            onMaterialEdit={p.onMaterialEdit}
            onMaterialDelete={p.onMaterialDelete}
            onMaterialToggleVisibility={p.onMaterialToggleVisibility}
            onOpenViewer={p.onOpenViewer}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/course/SectionList.tsx
git commit -m "feat(ui): SectionList orchestrator with dnd-kit reorder + batch write"
```

---

## Task 28b: Material drag-reorder (within and across sections)

**Files:**
- Modify: `src/components/course/SectionList.tsx`
- Modify: `src/components/course/SectionCard.tsx`
- Modify: `src/components/course/MaterialRow.tsx`

The current `SectionList` does section-level dnd only. Moodle also reorders materials inside a section and across sections via drag. Same `DndContext` will host both — `@dnd-kit` distinguishes targets by ID.

- [ ] **Step 1: Replace `SectionList.tsx` with a version that handles both layers**

```tsx
'use client';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { doc, writeBatch } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { SectionCard } from './SectionCard';
import type { Material, Section } from '@/types';

interface Props {
  courseId: string;
  sections: Section[];
  materialsBySection: Record<string, Material[]>;
  isTeacherEdit: boolean;
  userId: string | null;
  completedItemIds: Set<string>;
  manuallyMarkedItemIds: Set<string>;
  onSectionRename: (id: string, t: string) => void;
  onSectionDelete: (id: string) => void;
  onSectionToggleVisibility: (id: string) => void;
  onAddResource: (sectionId: string) => void;
  onMaterialEdit: (m: Material) => void;
  onMaterialDelete: (id: string) => void;
  onMaterialToggleVisibility: (id: string) => void;
  onOpenViewer: (m: Material) => void;
  onSectionsReordered: (next: Section[]) => void;
}

const SECTION_PREFIX = 'sec:';
const MATERIAL_PREFIX = 'mat:';

export function SectionList(p: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [secOrder, setSecOrder] = useState(p.sections);

  // Live snapshot of materials grouped by section, keyed by section id.
  const grouped = useMemo(() => {
    const out: Record<string, Material[]> = {};
    for (const s of p.sections) out[s.id] = [...(p.materialsBySection[s.id] ?? [])];
    return out;
  }, [p.sections, p.materialsBySection]);

  async function handleDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;

    // Section drag.
    if (activeId.startsWith(SECTION_PREFIX) && overId.startsWith(SECTION_PREFIX)) {
      const oldIdx = secOrder.findIndex((s) => SECTION_PREFIX + s.id === activeId);
      const newIdx = secOrder.findIndex((s) => SECTION_PREFIX + s.id === overId);
      if (oldIdx < 0 || newIdx < 0) return;
      const next = arrayMove(secOrder, oldIdx, newIdx);
      setSecOrder(next);
      p.onSectionsReordered(next);
      const batch = writeBatch(db);
      next.forEach((s, i) => batch.update(doc(db, 'sections', s.id), { orderIndex: i }));
      await batch.commit();
      return;
    }

    // Material drag — find source/target sections.
    if (activeId.startsWith(MATERIAL_PREFIX)) {
      const matId = activeId.slice(MATERIAL_PREFIX.length);
      const sourceSecId = Object.keys(grouped).find((sid) => grouped[sid].some((m) => m.id === matId));
      if (!sourceSecId) return;

      let targetSecId: string;
      let targetIdx: number;
      if (overId.startsWith(MATERIAL_PREFIX)) {
        const overMatId = overId.slice(MATERIAL_PREFIX.length);
        targetSecId = Object.keys(grouped).find((sid) => grouped[sid].some((m) => m.id === overMatId)) ?? sourceSecId;
        targetIdx = grouped[targetSecId].findIndex((m) => m.id === overMatId);
      } else if (overId.startsWith(SECTION_PREFIX)) {
        targetSecId = overId.slice(SECTION_PREFIX.length);
        targetIdx = grouped[targetSecId]?.length ?? 0;
      } else { return; }

      const sourceList = [...grouped[sourceSecId]];
      const movedIdx = sourceList.findIndex((m) => m.id === matId);
      const [moved] = sourceList.splice(movedIdx, 1);

      const targetList = sourceSecId === targetSecId ? sourceList : [...grouped[targetSecId]];
      targetList.splice(targetIdx, 0, { ...moved, sectionId: targetSecId });

      const batch = writeBatch(db);
      sourceList.forEach((m, i) => batch.update(doc(db, 'materials', m.id), { orderIndex: i }));
      if (sourceSecId !== targetSecId) {
        targetList.forEach((m, i) => batch.update(doc(db, 'materials', m.id), { orderIndex: i, sectionId: targetSecId }));
      } else {
        targetList.forEach((m, i) => batch.update(doc(db, 'materials', m.id), { orderIndex: i }));
      }
      await batch.commit();
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={secOrder.map((s) => SECTION_PREFIX + s.id)} strategy={verticalListSortingStrategy}>
        {secOrder.map((s) => (
          <SectionCard key={s.id}
            section={s}
            sortableId={SECTION_PREFIX + s.id}
            materialSortableIds={(grouped[s.id] ?? []).map((m) => MATERIAL_PREFIX + m.id)}
            materials={grouped[s.id] ?? []}
            isTeacherEdit={p.isTeacherEdit}
            userId={p.userId} courseId={p.courseId}
            completedItemIds={p.completedItemIds}
            manuallyMarkedItemIds={p.manuallyMarkedItemIds}
            onSectionRename={p.onSectionRename}
            onSectionDelete={p.onSectionDelete}
            onSectionToggleVisibility={p.onSectionToggleVisibility}
            onAddResource={p.onAddResource}
            onMaterialEdit={p.onMaterialEdit}
            onMaterialDelete={p.onMaterialDelete}
            onMaterialToggleVisibility={p.onMaterialToggleVisibility}
            onOpenViewer={p.onOpenViewer}
            materialIdPrefix={MATERIAL_PREFIX}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 2: Update `SectionCard.tsx` to wrap materials in a SortableContext**

Replace the body of `SectionCard.tsx` with this version (only structural changes — adds `sortableId`, `materialSortableIds`, `materialIdPrefix` props; wraps materials in inner `SortableContext`):

```tsx
'use client';
import { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MaterialRow } from './MaterialRow';
import { RichTextRender } from './RichTextRender';
import type { Material, Section } from '@/types';

interface Props {
  section: Section;
  sortableId: string;
  materialSortableIds: string[];
  materialIdPrefix: string;
  materials: Material[];
  isTeacherEdit: boolean;
  userId: string | null;
  courseId: string;
  completedItemIds: Set<string>;
  manuallyMarkedItemIds: Set<string>;
  onSectionRename: (id: string, newTitle: string) => void;
  onSectionDelete: (id: string) => void;
  onSectionToggleVisibility: (id: string) => void;
  onAddResource: (sectionId: string) => void;
  onMaterialEdit: (m: Material) => void;
  onMaterialDelete: (id: string) => void;
  onMaterialToggleVisibility: (id: string) => void;
  onOpenViewer: (m: Material) => void;
}

export function SectionCard(p: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: p.sortableId });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`sec-collapsed:${p.courseId}:${p.section.id}`) === '1';
  });
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(p.section.title);

  function commitTitle() {
    setEditing(false);
    if (draftTitle.trim() && draftTitle !== p.section.title) p.onSectionRename(p.section.id, draftTitle.trim());
  }
  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(`sec-collapsed:${p.courseId}:${p.section.id}`, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
         className="border rounded mb-3 bg-white">
      <div className="flex items-center px-3 py-2 border-b group">
        {p.isTeacherEdit && (
          <button {...listeners} {...attributes} className="cursor-grab text-gray-400 mr-2" aria-label="Drag section">☰</button>
        )}
        <button onClick={toggleCollapse} className="mr-2">{collapsed ? '▷' : '▼'}</button>
        {editing ? (
          <input autoFocus value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)}
                 onBlur={commitTitle}
                 onKeyDown={(e) => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setDraftTitle(p.section.title); setEditing(false); } }}
                 className="flex-1 border rounded px-2 py-0.5" />
        ) : (
          <button onDoubleClick={() => p.isTeacherEdit && setEditing(true)} className="flex-1 text-left font-semibold">
            {p.section.title}
            {p.section.visibility === 'hidden' && <span className="ml-2 text-xs text-orange-600">(hidden)</span>}
          </button>
        )}
        {p.isTeacherEdit && (
          <span className="opacity-0 group-hover:opacity-100 flex gap-1 text-xs text-gray-600">
            <button onClick={() => p.onSectionToggleVisibility(p.section.id)} title={p.section.visibility}>👁</button>
            <button onClick={() => setEditing(true)} title="Rename">✏️</button>
            <button onClick={() => p.onSectionDelete(p.section.id)} title="Delete" className="text-red-600">🗑</button>
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="px-3 py-2 space-y-1">
          {p.section.summary && <RichTextRender html={p.section.summary} className="mb-2" />}
          <SortableContext items={p.materialSortableIds} strategy={verticalListSortingStrategy}>
            {p.materials.map((m) => (
              <MaterialRow
                key={m.id}
                sortableId={p.materialIdPrefix + m.id}
                material={m}
                isTeacherEdit={p.isTeacherEdit}
                isCompleted={p.completedItemIds.has(m.id)}
                isManual={p.manuallyMarkedItemIds.has(m.id)}
                userId={p.userId} courseId={p.courseId}
                onEdit={() => p.onMaterialEdit(m)}
                onDelete={() => p.onMaterialDelete(m.id)}
                onToggleVisibility={() => p.onMaterialToggleVisibility(m.id)}
                onOpenViewer={p.onOpenViewer}
              />
            ))}
          </SortableContext>
          {p.isTeacherEdit && (
            <button onClick={() => p.onAddResource(p.section.id)} className="text-sm text-blue-600 mt-2">
              + Add an activity or resource
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `MaterialRow.tsx` to be sortable**

Add to the imports at top of `MaterialRow.tsx`:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

Add `sortableId: string;` to the `Props` interface.

Wrap the existing rendered output. Find the `return (` statement and update the outer element. For both the label-type branch and the regular branch, use:

```tsx
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sortableId });
const dragStyle = { transform: CSS.Transform.toString(transform), transition };
```

In the regular branch's outer `<div>`, change:

```tsx
<div className="flex items-center gap-2 py-1.5 group">
```

to:

```tsx
<div ref={setNodeRef} style={dragStyle} className="flex items-center gap-2 py-1.5 group">
  {isTeacherEdit && (
    <button {...listeners} {...attributes} className="cursor-grab text-gray-400" aria-label="Drag material">☰</button>
  )}
```

Apply the same `ref={setNodeRef} style={dragStyle}` to the label-branch's outer `<div>` (no drag handle in label, drag from anywhere via attributes if you want — or skip drag for labels).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Browser verify**

`npm run dev` → in edit mode, drag a material within its section, drag across sections. Refresh and confirm order persists.

- [ ] **Step 6: Commit**

```bash
git add src/components/course/SectionList.tsx src/components/course/SectionCard.tsx src/components/course/MaterialRow.tsx
git commit -m "feat(ui): drag-reorder materials within and across sections"
```

---

## Task 29: `CourseHeader` and `CoursePreview` components

**Files:**
- Create: `src/components/course/CourseHeader.tsx`
- Create: `src/components/course/CoursePreview.tsx`

- [ ] **Step 1: Create `CourseHeader.tsx`**

```tsx
'use client';
import { StorageQuotaBar } from './StorageQuotaBar';
import type { Course } from '@/types';

interface Props {
  course: Course;
  isTeacher: boolean;
  isEnrolled: boolean;
  editingOn: boolean;
  onToggleEditing: () => void;
  onEnrol: () => void;
  onUnenrol: () => void;
  progressPercent: number;
  progressCompleted: number;
  progressTotal: number;
  storageRefreshKey: number;
}

export function CourseHeader(p: Props) {
  return (
    <header className="bg-white border-b py-4 px-4 sticky top-0 z-10">
      <div className="flex justify-between items-start gap-4 max-w-5xl mx-auto">
        <div>
          <h1 className="text-xl font-bold">{p.course.title}</h1>
          <p className="text-sm text-gray-600">{p.course.teacherName ?? 'Teacher'} · {p.course.level} · {p.course.medium ?? ''}</p>
          {p.isEnrolled && p.progressTotal > 0 && (
            <div className="mt-2 max-w-xs">
              <div className="text-xs text-gray-600 mb-0.5">{p.progressCompleted} / {p.progressTotal} completed ({p.progressPercent}%)</div>
              <div className="h-2 bg-gray-200 rounded">
                <div className="h-2 bg-green-600 rounded" style={{ width: `${p.progressPercent}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {p.isTeacher ? (
            <>
              <button onClick={p.onToggleEditing}
                      className={`text-sm px-3 py-1 rounded ${p.editingOn ? 'bg-orange-100 text-orange-800' : 'bg-blue-600 text-white'}`}>
                {p.editingOn ? 'Turn editing off' : 'Turn editing on'}
              </button>
              {p.editingOn && <StorageQuotaBar courseId={p.course.id} refreshKey={p.storageRefreshKey} />}
            </>
          ) : p.isEnrolled ? (
            <button onClick={p.onUnenrol} className="text-sm border px-3 py-1 rounded">Unenrol</button>
          ) : (
            <button onClick={p.onEnrol} className="text-sm bg-blue-600 text-white px-3 py-1 rounded">Enrol me</button>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `CoursePreview.tsx`**

```tsx
'use client';
import { MaterialIcon } from './MaterialIcon';
import type { Material, Section } from '@/types';

interface Props {
  sections: Section[];                       // already filtered to public/enrolled-preview
  materialsBySection: Record<string, Material[]>;
}

export function CoursePreview({ sections, materialsBySection }: Props) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
      <div className="text-sm text-gray-600 italic">
        Enrol to access full content. Items marked 🌐 are free samples.
      </div>
      {sections.map((s) => (
        <div key={s.id} className="border rounded p-3 bg-white">
          <div className="font-semibold mb-2">{s.title}</div>
          <ul className="text-sm space-y-1">
            {(materialsBySection[s.id] ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <MaterialIcon type={m.type} />
                <span>{m.title}</span>
                {m.visibility === 'public' ? <span title="Free sample">🌐</span> : <span className="text-gray-400">🔒</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/course/CourseHeader.tsx src/components/course/CoursePreview.tsx
git commit -m "feat(ui): CourseHeader (with editing toggle) + CoursePreview"
```

---

## Task 30: New unified `/courses/[id]/page.tsx`

**Files:**
- Modify: `src/app/courses/[id]/page.tsx`

- [ ] **Step 1: Read the existing page to understand its current responsibility**

Run: `cat src/app/courses/[id]/page.tsx | head -80`

If it does anything that should be preserved (e.g. SEO metadata, server-side rendering of public course info), keep that logic in the new page's outer shell.

- [ ] **Step 2: Replace the file with the new unified page**

```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  collection, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, deleteDoc, updateDoc, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { enrolStudent, unenrolStudent } from '@/lib/enrollment';
import { computeProgress, getProgress } from '@/lib/progress';
import { CourseHeader } from '@/components/course/CourseHeader';
import { CoursePreview } from '@/components/course/CoursePreview';
import { SectionList } from '@/components/course/SectionList';
import { AddResourcePicker } from '@/components/course/AddResourcePicker';
import { FileResourceForm } from '@/components/course/forms/FileResourceForm';
import { FolderResourceForm } from '@/components/course/forms/FolderResourceForm';
import { UrlResourceForm } from '@/components/course/forms/UrlResourceForm';
import { PageResourceForm } from '@/components/course/forms/PageResourceForm';
import { LabelResourceForm } from '@/components/course/forms/LabelResourceForm';
import { RichTextRender } from '@/components/course/RichTextRender';
import type { Course, Material, ResourceType, Section, UserCourseProgress, Visibility } from '@/types';

type EditingMaterial = { sectionId: string; type: ResourceType; existing?: Material };

const VIS_CYCLE: Visibility[] = ['enrolled', 'public', 'restricted', 'hidden'];

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const { user, role } = useAuth() as { user: { uid: string; enrolledCourseIds?: string[] } | null; role: string | null };

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [progress, setProgress] = useState<UserCourseProgress | null>(null);
  const [editingOn, setEditingOn] = useState(false);
  const [picker, setPicker] = useState<{ open: boolean; sectionId: string | null }>({ open: false, sectionId: null });
  const [editingMaterial, setEditingMaterial] = useState<EditingMaterial | null>(null);
  const [storageRefreshKey, setStorageRefreshKey] = useState(0);
  const [viewer, setViewer] = useState<Material | null>(null);

  const isTeacher = !!user && course?.teacherId === user.uid;
  const isEnrolled = !!user && (user.enrolledCourseIds ?? []).includes(courseId);

  // Load course, sections, materials.
  useEffect(() => {
    (async () => {
      const cSnap = await getDoc(doc(db, 'courses', courseId));
      setCourse(cSnap.exists() ? (cSnap.data() as Course) : null);
    })();
    const unsubSections = onSnapshot(query(collection(db, 'sections'), where('courseId', '==', courseId), orderBy('orderIndex')),
      (snap) => setSections(snap.docs.map((d) => d.data() as Section)));
    const unsubMaterials = onSnapshot(query(collection(db, 'materials'), where('courseId', '==', courseId), orderBy('orderIndex')),
      (snap) => setMaterials(snap.docs.map((d) => d.data() as Material)));
    return () => { unsubSections(); unsubMaterials(); };
  }, [courseId]);

  // Load progress for the current user.
  useEffect(() => {
    if (!user) { setProgress(null); return; }
    getProgress(user.uid, courseId).then(setProgress);
  }, [user, courseId]);

  const materialsBySection = useMemo(() => {
    const out: Record<string, Material[]> = {};
    for (const m of materials) (out[m.sectionId] ??= []).push(m);
    return out;
  }, [materials]);

  const visibleMaterials = useMemo(() => materials, [materials]);    // rules already filter
  const completedSet = useMemo(() => new Set(progress?.completedItemIds ?? []), [progress]);
  const manualSet    = useMemo(() => new Set(progress?.manuallyMarkedItemIds ?? []), [progress]);
  const summary = computeProgress(visibleMaterials, [...completedSet]);

  async function nextOrderIndex(sectionId: string) {
    const list = materialsBySection[sectionId] ?? [];
    return list.length === 0 ? 0 : Math.max(...list.map((m) => m.orderIndex)) + 1;
  }

  async function saveNewMaterial(sectionId: string, type: ResourceType, value: Record<string, unknown>) {
    const id = doc(collection(db, 'materials')).id;
    const orderIndex = await nextOrderIndex(sectionId);
    await setDoc(doc(db, 'materials', id), {
      id, courseId, sectionId, orderIndex, type,
      visibility: 'enrolled', completionMode: type === 'label' ? 'none' : 'auto-on-view',
      ...value, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    setStorageRefreshKey((k) => k + 1);
  }

  async function updateMaterial(id: string, patch: Record<string, unknown>) {
    await updateDoc(doc(db, 'materials', id), { ...patch, updatedAt: serverTimestamp() });
    setStorageRefreshKey((k) => k + 1);
  }

  async function deleteMaterial(id: string) {
    if (!confirm('Delete this resource?')) return;
    await deleteDoc(doc(db, 'materials', id));
    setStorageRefreshKey((k) => k + 1);
  }

  async function cycleMaterialVisibility(id: string) {
    const m = materials.find((x) => x.id === id); if (!m) return;
    const next = VIS_CYCLE[(VIS_CYCLE.indexOf(m.visibility) + 1) % VIS_CYCLE.length];
    await updateDoc(doc(db, 'materials', id), { visibility: next, updatedAt: serverTimestamp() });
  }

  async function addSection() {
    const id = doc(collection(db, 'sections')).id;
    const orderIndex = sections.length;
    await setDoc(doc(db, 'sections', id), {
      id, courseId, title: `Section ${orderIndex + 1}`, orderIndex,
      visibility: 'enrolled', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }

  async function renameSection(id: string, title: string) {
    await updateDoc(doc(db, 'sections', id), { title, updatedAt: serverTimestamp() });
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete section AND all its resources?')) return;
    const matSnap = await getDocs(query(collection(db, 'materials'), where('sectionId', '==', id)));
    await Promise.all(matSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'sections', id));
  }

  async function cycleSectionVisibility(id: string) {
    const s = sections.find((x) => x.id === id); if (!s) return;
    const next = VIS_CYCLE[(VIS_CYCLE.indexOf(s.visibility) + 1) % VIS_CYCLE.length];
    await updateDoc(doc(db, 'sections', id), { visibility: next, updatedAt: serverTimestamp() });
  }

  if (!course) return <div className="p-8 text-center text-gray-600">Loading…</div>;

  // Non-enrolled, non-teacher students see the preview.
  const showPreview = !isTeacher && !isEnrolled && role !== 'admin';

  return (
    <div>
      <CourseHeader
        course={course}
        isTeacher={isTeacher}
        isEnrolled={isEnrolled}
        editingOn={editingOn}
        onToggleEditing={() => setEditingOn((v) => !v)}
        onEnrol={async () => { if (user) { await enrolStudent(courseId, user.uid); window.location.reload(); } }}
        onUnenrol={async () => { if (user && confirm('Unenrol from this course?')) { await unenrolStudent(courseId, user.uid); window.location.reload(); } }}
        progressPercent={summary.percent}
        progressCompleted={summary.completed}
        progressTotal={summary.total}
        storageRefreshKey={storageRefreshKey}
      />

      {showPreview ? (
        <CoursePreview sections={sections} materialsBySection={materialsBySection} />
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-4">
          <SectionList
            courseId={courseId}
            sections={sections}
            materialsBySection={materialsBySection}
            isTeacherEdit={isTeacher && editingOn}
            userId={user?.uid ?? null}
            completedItemIds={completedSet}
            manuallyMarkedItemIds={manualSet}
            onSectionRename={renameSection}
            onSectionDelete={deleteSection}
            onSectionToggleVisibility={cycleSectionVisibility}
            onAddResource={(sectionId) => setPicker({ open: true, sectionId })}
            onMaterialEdit={(m) => setEditingMaterial({ sectionId: m.sectionId, type: m.type, existing: m })}
            onMaterialDelete={deleteMaterial}
            onMaterialToggleVisibility={cycleMaterialVisibility}
            onOpenViewer={setViewer}
            onSectionsReordered={setSections}
          />
          {isTeacher && editingOn && (
            <button onClick={addSection} className="text-sm text-blue-600">+ Add section</button>
          )}
        </div>
      )}

      <AddResourcePicker
        open={picker.open}
        onPick={(t) => { setEditingMaterial({ sectionId: picker.sectionId!, type: t }); setPicker({ open: false, sectionId: null }); }}
        onClose={() => setPicker({ open: false, sectionId: null })}
      />

      {editingMaterial && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingMaterial(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editingMaterial.existing ? 'Edit' : 'Add'} {editingMaterial.type}</h2>
            {renderForm(editingMaterial, async (value) => {
              if (editingMaterial.existing) await updateMaterial(editingMaterial.existing.id, value);
              else await saveNewMaterial(editingMaterial.sectionId, editingMaterial.type, value);
              setEditingMaterial(null);
            }, () => setEditingMaterial(null), courseId)}
          </div>
        </div>
      )}

      {viewer && viewer.type === 'page' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setViewer(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{viewer.title}</h2>
            <RichTextRender html={viewer.pageHtml ?? ''} />
            <div className="mt-4 text-right"><button onClick={() => setViewer(null)} className="border px-3 py-1 rounded">Close</button></div>
          </div>
        </div>
      )}
      {viewer && viewer.type === 'file' && viewer.mimeType?.includes('pdf') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setViewer(null)}>
          <div className="bg-white rounded-lg p-2 w-full max-w-4xl h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <iframe src={viewer.fileUrl} className="w-full h-[80vh]" title={viewer.title} />
            <div className="mt-2 flex justify-between">
              <a href={viewer.fileUrl} download={viewer.fileName} className="text-blue-600 underline">Download</a>
              <button onClick={() => setViewer(null)} className="border px-3 py-1 rounded">Close</button>
            </div>
          </div>
        </div>
      )}
      {viewer && viewer.type === 'file' && !viewer.mimeType?.includes('pdf') && (() => {
        const a = document.createElement('a'); a.href = viewer.fileUrl ?? ''; a.download = viewer.fileName ?? ''; a.click(); setViewer(null); return null;
      })()}
      {viewer && viewer.type === 'url' && (() => {
        window.open(viewer.externalUrl, '_blank', 'noopener,noreferrer'); setViewer(null); return null;
      })()}
    </div>
  );
}

function renderForm(em: EditingMaterial, onSave: (v: Record<string, unknown>) => void, onCancel: () => void, courseId: string) {
  const tempId = em.existing?.id ?? Math.random().toString(36).slice(2, 12);
  switch (em.type) {
    case 'file':
      return <FileResourceForm courseId={courseId} materialId={tempId} initial={em.existing} onSave={(v) => onSave(v)} onCancel={onCancel} />;
    case 'folder':
      return <FolderResourceForm courseId={courseId} materialId={tempId} initial={em.existing} onSave={(v) => onSave(v)} onCancel={onCancel} />;
    case 'url':
      return <UrlResourceForm initial={em.existing} onSave={(v) => onSave(v)} onCancel={onCancel} />;
    case 'page':
      return <PageResourceForm initial={em.existing} onSave={(v) => onSave(v)} onCancel={onCancel} />;
    case 'label':
      return <LabelResourceForm initial={em.existing} onSave={(v) => onSave(v)} onCancel={onCancel} />;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors. Resolve any (e.g. AuthContext typing) by inspecting `src/contexts/AuthContext.tsx` and adjusting the cast at the top of the page.

- [ ] **Step 4: Browser smoke-test**

Run: `npm run dev` and open http://localhost:3000/courses/<existing-course-id> as a teacher.
Verify:
- "Turn editing on" appears, clicking flips it.
- "+ Add section" creates a section.
- Picker opens, all 5 resource type cards work.
- File upload works for ≤15 MB files.
- Storage quota bar updates after upload.
- Visibility eye cycles through 4 states.
- Section drag-reorder persists after refresh.

- [ ] **Step 5: Commit**

```bash
git add src/app/courses/[id]/page.tsx
git commit -m "feat(course): unified Moodle-style course page with edit mode"
```

---

## Task 30b: Wire course delete UI (cascade)

**Files:**
- Modify: `src/app/courses/[id]/page.tsx`

The unified course page currently doesn't expose a delete button. The cascade lib from Task 11 needs a UI hookup. Place the button inside an "owner zone" only visible to the course teacher in edit mode, with double confirmation.

- [ ] **Step 1: Import `deleteCourseCascade` at the top of `src/app/courses/[id]/page.tsx`**

Add to the existing import block:

```tsx
import { deleteCourseCascade } from '@/lib/courseDelete';
import { useRouter } from 'next/navigation';
```

- [ ] **Step 2: Add the delete handler inside the page component**

Inside `CoursePage()`, just below the existing handler functions, add:

```tsx
const router = useRouter();
const [deleting, setDeleting] = useState(false);

async function handleDeleteCourse() {
  if (!confirm(`This will permanently delete "${course?.title}", every section, every resource, every uploaded file, all enrolments, and all student progress for this course. Continue?`)) return;
  if (!confirm('This is final. There is no undo. Type-check the course title in your head and click OK to proceed.')) return;
  setDeleting(true);
  try {
    await deleteCourseCascade(courseId);
    router.push('/courses');
  } catch (e) {
    setDeleting(false);
    alert('Delete failed: ' + (e as Error).message);
  }
}
```

- [ ] **Step 3: Render the danger-zone block at the bottom of edit mode**

Find the closing `</div>` of the main `max-w-5xl mx-auto px-4 py-4` block (the one that contains `<SectionList>` and `+ Add section`). Just **before** that closing `</div>`, add:

```tsx
{isTeacher && editingOn && (
  <div className="mt-12 border-t pt-6">
    <div className="border border-red-300 bg-red-50 rounded p-4 max-w-md">
      <h3 className="font-semibold text-red-800">Danger zone</h3>
      <p className="text-sm text-red-700 mt-1">
        Deleting a course removes everything: sections, resources, uploaded files, enrolments, and student progress.
      </p>
      <button onClick={handleDeleteCourse} disabled={deleting}
              className="mt-3 bg-red-600 text-white text-sm px-3 py-1 rounded disabled:opacity-50">
        {deleting ? 'Deleting…' : 'Delete this course'}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Browser verify (use a throwaway test course!)**

`npm run dev` → log in as the teacher of a test course → turn editing on → scroll to bottom → click Delete → confirm twice → page redirects to `/courses` → refresh and confirm the course is gone, sections/materials gone, student dashboards no longer show it.

- [ ] **Step 6: Commit**

```bash
git add src/app/courses/[id]/page.tsx
git commit -m "feat(course): danger-zone delete button calling cascade lib"
```

---

## Task 30c: Inline image upload in `RichTextEditor`

**Files:**
- Modify: `src/components/course/RichTextEditor.tsx`

Spec §3 requires Page inline images to live in Firebase Storage and count against quota. The current editor only accepts an image URL via `prompt()`. Add a real upload path.

- [ ] **Step 1: Replace the editor with the upload-aware version**

Replace `src/components/course/RichTextEditor.tsx`:

```tsx
'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect, useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { COURSE_BYTES_CAP, FILE_BYTES_CAP, getCourseUsedBytes } from '@/lib/storageQuota';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minimal?: boolean;
  /** When provided, the image button uploads to Firebase Storage under courses/<courseId>/page-images/. */
  courseId?: string;
  /** Pre-allocated material id used in the upload path. */
  materialId?: string;
}

export function RichTextEditor({ value, onChange, placeholder, minimal, courseId, materialId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), Image],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2' } },
  });

  useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(value); }, [value, editor]);

  async function handleImageFile(file: File) {
    setError(null);
    if (!courseId || !materialId) {
      const url = prompt('Image URL:'); if (url && editor) editor.chain().focus().setImage({ src: url }).run();
      return;
    }
    if (file.size > FILE_BYTES_CAP) { setError('Image exceeds 15 MB.'); return; }
    const used = await getCourseUsedBytes(courseId);
    if (used + file.size > COURSE_BYTES_CAP) { setError('Course storage full.'); return; }
    const path = `courses/${courseId}/page-images/${materialId}/${Date.now()}-${file.name}`;
    const r = ref(storage, path);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
  }

  if (!editor) return null;
  return (
    <div className="border rounded">
      {!minimal && (
        <div className="flex gap-1 border-b px-2 py-1 text-sm items-center">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className="px-2">B</button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className="px-2 italic">I</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="px-2">H2</button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className="px-2">•</button>
          <button type="button" onClick={() => { const url = prompt('URL:'); if (url) editor.chain().focus().setLink({ href: url }).run(); }} className="px-2">🔗</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="px-2">🖼</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
                 onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
          {error && <span className="text-xs text-red-600 ml-auto">{error}</span>}
        </div>
      )}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
```

- [ ] **Step 2: Update `PageResourceForm.tsx` to pass `courseId` and `materialId` through**

Open `src/components/course/forms/PageResourceForm.tsx`. Update the `Props` interface and the `<RichTextEditor>` invocation:

```tsx
interface Props {
  courseId: string;
  materialId: string;
  initial?: Partial<PageFormValue>;
  onSave: (v: PageFormValue) => Promise<void> | void;
  onCancel: () => void;
}

export function PageResourceForm({ courseId, materialId, initial, onSave, onCancel }: Props) {
  // ...existing state...
  // change the editor invocation to:
  // <RichTextEditor value={pageHtml} onChange={setPageHtml} courseId={courseId} materialId={materialId} />
```

- [ ] **Step 3: Update the page component (`src/app/courses/[id]/page.tsx`) `renderForm` helper**

Find the `case 'page':` line in `renderForm()` and change it to:

```tsx
case 'page':
  return <PageResourceForm courseId={courseId} materialId={tempId} initial={em.existing} onSave={(v) => onSave(v)} onCancel={onCancel} />;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Browser verify**

`npm run dev` → in edit mode → add a Page resource → click 🖼 in the toolbar → upload a small PNG → confirm it embeds in the editor and the storage quota bar bumps.

- [ ] **Step 6: Commit**

```bash
git add src/components/course/RichTextEditor.tsx src/components/course/forms/PageResourceForm.tsx src/app/courses/[id]/page.tsx
git commit -m "feat(ui): inline image upload in Page editor counts against course quota"
```

---

## Task 31: Add `My Courses` card to student dashboard

**Files:**
- Modify: `src/app/dashboard/student/page.tsx` (or wherever the student dashboard lives — discover via `find src/app/dashboard -name 'page.tsx'`)
- Create: `src/components/course/MyCoursesCard.tsx`

- [ ] **Step 1: Discover the student dashboard file**

Run: `find src/app/dashboard -name 'page.tsx' | head -5`

Use the file that renders for `role === 'student'`.

- [ ] **Step 2: Create `MyCoursesCard.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Course, UserCourseProgress } from '@/types';

interface Row { course: Course; percent: number; completed: number; total: number; }

export function MyCoursesCard({ userId, enrolledCourseIds }: { userId: string; enrolledCourseIds: string[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    (async () => {
      const out: Row[] = [];
      for (const cid of enrolledCourseIds) {
        const cSnap = await getDoc(doc(db, 'courses', cid));
        if (!cSnap.exists()) continue;
        const course = cSnap.data() as Course;
        const pSnap = await getDoc(doc(db, 'userCourseProgress', `${userId}_${cid}`));
        const progress = pSnap.exists() ? (pSnap.data() as UserCourseProgress) : null;
        const completed = progress?.completedItemIds.length ?? 0;
        const matSnap = await getDocs(query(collection(db, 'materials'), where('courseId', '==', cid)));
        const total = matSnap.docs.filter((d) => d.data().completionMode !== 'none').length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        out.push({ course, percent, completed, total });
      }
      setRows(out);
    })();
  }, [userId, enrolledCourseIds.join(',')]);

  if (enrolledCourseIds.length === 0) return null;
  return (
    <section className="bg-white rounded p-4">
      <h2 className="font-semibold mb-3">My Courses</h2>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.course.id}>
            <Link href={`/courses/${r.course.id}`} className="block hover:bg-gray-50 p-2 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium">{r.course.title}</span>
                <span className="text-xs text-gray-600">{r.completed}/{r.total} ({r.percent}%)</span>
              </div>
              <div className="h-1 bg-gray-200 rounded mt-1"><div className="h-1 bg-green-600 rounded" style={{ width: `${r.percent}%` }} /></div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Mount the card on the student dashboard page**

Open the discovered dashboard file and add an import + render. Example (adjust to whatever the file already does):

```tsx
import { MyCoursesCard } from '@/components/course/MyCoursesCard';
// ...inside the component, where other dashboard sections render:
{user && <MyCoursesCard userId={user.uid} enrolledCourseIds={user.enrolledCourseIds ?? []} />}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Browser smoke-test**

`npm run dev` → log in as a student with enrolments → dashboard shows the card with progress bars.

- [ ] **Step 6: Commit**

```bash
git add src/components/course/MyCoursesCard.tsx src/app/dashboard/student/page.tsx
git commit -m "feat(dashboard): My Courses card with per-course progress bars"
```

---

## Task 32: Run migration in dev + add feature flag

**Files:**
- Create: `.env.example` entry (manual step, no code)
- Modify: `next.config.js` (export the env var if not already passed through)
- Modify: `src/app/courses/[id]/page.tsx` (gate on flag — soft, since we're moving forward anyway)

- [ ] **Step 1: Add the feature flag entry**

Append to `.env.example` (create the file if missing):

```
NEXT_PUBLIC_MOODLE_V1=true
```

- [ ] **Step 2: Set the flag in your local `.env.local`**

Append to `.env.local`:

```
NEXT_PUBLIC_MOODLE_V1=true
```

- [ ] **Step 3: Run the migration in dry-run mode against the dev project**

Set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON for the **dev** project, then:

Run: `npm run migrate:moodle:dry`
Expected: prints the planned writes for each step. Verify nothing looks wrong.

- [ ] **Step 4: Apply the migration in dev**

Run: `npm run migrate:moodle`
Expected: completes; prints "Done.".

- [ ] **Step 5: Open the dev site and re-test the unified course page**

`npm run dev` → confirm existing courses still render, materials all show, no missing fields blow up.

- [ ] **Step 6: Commit**

```bash
git add .env.example
git commit -m "chore: add NEXT_PUBLIC_MOODLE_V1 feature flag"
```

---

## Task 33: Redirect old subroutes + delete unused legacy files

**Files:**
- Delete (after verifying nothing imports them):
  - `src/app/courses/[id]/modules/` (whole directory)
  - `src/app/courses/[id]/materials/` (whole directory)
- Modify: `firestore.rules` (remove the legacy `match /courseModules/{moduleId}` block — the collection is empty after migration)

- [ ] **Step 1: Verify no other code imports the legacy pages**

Run: `grep -r "courses/\\[id\\]/modules\\|courses/\\[id\\]/materials" src/ 2>/dev/null`
Expected: only matches inside the directories we're deleting. If anything else references them, fix that first.

- [ ] **Step 2: Delete the legacy subroute directories**

```bash
rm -rf src/app/courses/[id]/modules src/app/courses/[id]/materials
```

- [ ] **Step 3: Remove the legacy `courseModules` rule block**

Open `firestore.rules`. Find the entire block:

```
match /courseModules/{moduleId} {
  ...
}
```

Delete it.

- [ ] **Step 4: Re-run rule tests**

Run: `npm run test:rules`
Expected: all tests still pass.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove legacy course subroutes + courseModules rule block"
```

---

## Task 34: Manual end-to-end smoke (no code, do this before declaring done)

**Files:** none

- [ ] **Step 1: Teacher path**

Log in as a teacher. Open one of your courses.
- Turn editing on → all four hover icons appear on a section/material.
- Add a section, rename it inline (double-click).
- Add each of the 5 resource types: File (upload + external), Folder (mixed), URL (with oEmbed), Page (rich text), Label (inline).
- Drag a section to reorder; drag a material within a section.
- Cycle visibility on a material to `restricted`, pick yourself in the user picker, save.
- Verify storage quota bar increments after a Firebase upload.
- Try to upload a 16 MB file → expect rejection.
- Delete a material → confirms, removes.
- Turn editing off → chrome disappears, view is clean.

- [ ] **Step 2: Student path**

Log in as a different student account.
- Browse to the course → see preview (titles only, lock icons).
- Click "Enrol me" → page reloads → full content appears.
- Open a File (PDF) → preview modal → completion ✓ ticks (disabled).
- Open a URL → opens new tab → completion ✓ ticks.
- Open a Page → modal → ✓.
- Manual-completion items: tick the box → tick stored; reload page → still ticked.
- Course progress bar updates correctly: matches "N / total" math.
- Restricted item visible only when student is in `allowedUserIds`.
- Hidden items invisible.
- Unenrol → reload → preview again, but the `userCourseProgress` doc preserved.
- Re-enrol → previous ticks restored.

- [ ] **Step 3: Cross-teacher path**

Log in as another teacher with a different course.
- Open your own course in edit mode → works.
- Try to navigate to the first teacher's course in edit mode → "Turn editing on" should not appear (you're not the course teacher); attempts to mutate via devtools should be rejected by rules.

If everything passes, Phase 1 is shipped.

- [ ] **Step 4: Tag the release**

```bash
git tag moodle-phase1
```

(Push only when the user confirms — no `git push --tags` from the agent.)

---

## Glossary of files added or changed

**New libs**: `src/lib/enrollment.ts`, `src/lib/progress.ts`, `src/lib/oembed.ts`, `src/lib/storageQuota.ts`, `src/lib/courseDelete.ts`
**New script**: `scripts/migrate-moodle-phase1.js`
**New components**:
- `src/components/course/MaterialIcon.tsx`
- `src/components/course/RichTextEditor.tsx`
- `src/components/course/RichTextRender.tsx`
- `src/components/course/UserPickerField.tsx`
- `src/components/course/OEmbedPreview.tsx`
- `src/components/course/StorageQuotaBar.tsx`
- `src/components/course/AddResourcePicker.tsx`
- `src/components/course/MaterialRow.tsx`
- `src/components/course/SectionCard.tsx`
- `src/components/course/SectionList.tsx`
- `src/components/course/CourseHeader.tsx`
- `src/components/course/CoursePreview.tsx`
- `src/components/course/MyCoursesCard.tsx`
- `src/components/course/forms/VisibilityField.tsx`
- `src/components/course/forms/CompletionField.tsx`
- `src/components/course/forms/FileResourceForm.tsx`
- `src/components/course/forms/FolderResourceForm.tsx`
- `src/components/course/forms/UrlResourceForm.tsx`
- `src/components/course/forms/PageResourceForm.tsx`
- `src/components/course/forms/LabelResourceForm.tsx`

**Modified**: `src/types/index.ts`, `src/lib/firebase.ts`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.gitignore`, `package.json`, `src/app/courses/[id]/page.tsx`, the student dashboard page

**Deleted**: `src/app/courses/[id]/modules/` and `src/app/courses/[id]/materials/`

**Tests**: `tests/rules/{sections,materials,enrollments,progress}.test.ts`, `tests/lib/{enrollment,progress,oembed,storageQuota}.test.ts`
