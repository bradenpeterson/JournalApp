# Sanctuary — Project Plan

A full step-by-step build plan for the personal journaling app. Work through each phase in order. Do not move to the next phase until the current one is fully working.

---

## Phase 1 — Foundation

### 1.1 Next.js Project Setup
- [x] Initialize Next.js with TypeScript, Tailwind CSS, and ESLint
- [x] Set up the directory structure per the low-level design (`app/`, `components/`, `lib/`, `workers/`, `types/`)
- [x] Create `.env.local` with placeholder keys for all required environment variables

### 1.2 Supabase Project
- [x] Create a new Supabase project
- [x] Enable automatic RLS on the public schema during project creation
- [x] Navigate to Settings > Data API and copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into `.env.local`
- [ ] Add `CAPSULE_ENCRYPTION_KEY` to `.env.local` when you reach Phase 4.5 — server-only secret for time-capsule encryption (do not derive it from `SUPABASE_SERVICE_ROLE_KEY`; see §4.5)
- [x] Run the initial `users` table migration in the SQL editor:
  - [x] `id`, `clerk_id`, `email`, `display_name`, `theme`, `created_at`
  - [x] RLS policy: allow all operations where `auth.jwt()->>'sub' = clerk_id`
- [x] Confirm in Supabase that **Clerk JWTs are accepted** (Third Party Auth / JWKS) so `auth.jwt()` is populated — RLS does nothing useful until that wiring matches the dashboard

### 1.3 Clerk Setup
- [x] Create a Clerk application
- [x] Install `@clerk/nextjs` and add publishable/secret keys to `.env.local`
- [x] Wrap the root layout in `ClerkProvider`
- [x] Create sign-in and sign-up pages using Clerk's hosted components at `app/(auth)/sign-in` and `app/(auth)/sign-up`

### 1.4 Clerk + Supabase Integration
- [x] In the Clerk dashboard go to the Supabase setup page and enable the integration — this adds the `role: authenticated` claim to all Clerk JWTs
- [x] In Supabase dashboard go to Authentication > Third Party Auth and add Clerk as a provider using your Clerk domain
- [x] Create a server-side Supabase client in `lib/db/supabase-server.ts` that passes Clerk's session token via the `accessToken` option
- [x] Create a client-side Supabase hook in `lib/db/supabase-client.ts` using `useSession()` from Clerk

### 1.5 Proxy / Clerk middleware
- [x] Create `proxy.ts` at the project root using `clerkMiddleware()` (this project uses `proxy.ts` per Next.js / Clerk conventions for this repo — not `middleware.ts`)
- [x] Protect all routes under `/(app)/` (anything not in the public allowlist — URLs like `/dashboard` from `app/(app)/...` require auth)
- [x] Mark `/sign-in`, `/sign-up`, and `/api/webhooks` as public

### 1.6 Clerk Webhook
- [x] Use `verifyWebhook()` from `@clerk/nextjs/webhooks` to verify the signature (prefer this over hand-rolled Svix; add `svix` explicitly only if your lockfile does not already include it as a transitive dependency)
- [x] Create the webhook handler at `app/api/webhooks/clerk/route.ts`
- [x] On `user.created` event, upsert a row into the Supabase `users` table using the service role client
- [ ] On `user.updated` event, upsert the same fields (`clerk_id`, `email`, `display_name`, etc.) so profile changes and webhook retries stay in sync
- [x] Register the endpoint in the Clerk dashboard, subscribe to `user.created`, copy the signing secret into `.env.local` — use the **exact variable name** Clerk shows (e.g. `CLERK_WEBHOOK_SIGNING_SECRET` or `CLERK_WEBHOOK_SECRET` per [journal-lowlevel.md](journal-lowlevel.md)); it must match your code and deployment env
- [ ] In the Clerk dashboard, subscribe the same endpoint to **`user.updated`** as well as `user.created`
- [x] Use ngrok (`ngrok http 3000`) for local testing — update to Railway URL once deployed

### 1.7 Verification
- [x] Sign up as a test user
- [x] Confirm a row appears in the Supabase `users` table with the correct `clerk_id` and `email`
- [x] Confirm that protected routes redirect to sign-in when unauthenticated
- [x] Confirm that sign-in redirects back to the app correctly

---

## Phase 2 — Core Journaling

**Schema prerequisite:** Before implementing **§2.2** behaviors that touch `mood_analyses` (GET with joined analysis, DELETE with cascade), the **`mood_analyses` table must exist** — run the migration in **§3.1** first if you want strict schema order, or add those behaviors only after §3.1 is done.

### 2.1 Entries Table Migration
- [x] Run the `entries` table migration in Supabase:
  - [x] `id`, `user_id`, `title`, `body` (jsonb), `body_text`, `word_count`, `created_at`, `updated_at`, `fts` (generated tsvector)
  - [x] RLS policy: allow all operations where the JWT sub matches the `clerk_id` of the row's `user_id`
  - [x] `updated_at` trigger that fires on every UPDATE
  - [x] GIN index on `fts`, B-tree index on `user_id`

### 2.2 Entries API Routes
- [x] Create `app/api/entries/route.ts`:
  - [x] `GET` — fetch all entries for the authed user ordered by `updated_at` desc; accept optional `?search=` param that uses Supabase's `.textSearch('fts', query)` for full-text search
  - [x] `POST` — create a new entry; accept `{ title, body, body_text }`; return the created row
- [x] Create `app/api/entries/[id]/route.ts`:
  - [x] `GET` — fetch a single entry by ID; verify ownership; **include joined `mood_analysis` (if any)** per low-level design
  - [x] `PATCH` — update `title`, `body`, `body_text`, `word_count`; `updated_at` is handled by the DB trigger
  - [x] `DELETE` — hard delete; cascades to `mood_analyses`
- [x] Every route must call `auth()` at the top and return 401 if no session
- [x] Use the Supabase **server** client from **`lib/db/supabase-server.ts`** that forwards the **Clerk session token** (`accessToken`) so **RLS** enforces access — not the service-role client (`lib/db/supabase-auth-context.ts` wires `auth()` + that client + `getSupabaseUserId` for entries APIs)
- [x] Reserve **`SUPABASE_SERVICE_ROLE_KEY`** for **webhooks**, **BullMQ workers**, and **admin-only** routes; use the same JWT server client for other user-facing APIs in later phases (`/api/analysis`, `/api/capsules`, `/api/uploads`, `/api/export/*`) wherever tables use RLS
- [x] *If you use the service role for user-owned data,* RLS does not apply — every query must be scoped by `user_id`; prefer the JWT client so RLS remains a backstop (entries use JWT + RLS; webhook uses service role only after signature verification)
- [x] For `?search=`, treat user text as plain language: map it to a valid search (e.g. SQL `plainto_tsquery` / `websearch_to_tsquery` via an RPC, or use Supabase `textSearch` options that avoid passing raw strings straight through as `tsquery`)

### 2.3 Helper: Get Supabase User ID
- [x] Create `lib/db/getUser.ts` — given a Clerk `userId`, look up and return the internal Supabase `users.id`
- [x] This is called at the top of every API route to resolve the foreign key for DB queries

*Optional later:* replace the per-request lookup with a custom JWT claim carrying Supabase `users.id` if traffic ever warrants it — for this app the extra query is usually fine.

### 2.4 Tiptap Editor Component
- [x] Install Tiptap: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`, `@tiptap/extension-typography`
- [x] Create `components/editor/TiptapEditor.tsx`
- [x] Initialize the editor with all required extensions
- [x] Implement debounced auto-save: fire a `PATCH` to `/api/entries/[id]` 2 seconds after the user stops typing
- [x] Extract `body_text` using `editor.getText({ blockSeparator: ' ' })` on each save
- [x] Derive `word_count` from `body_text` on each save
- [x] Show a `Saving...` / `Saved` visual indicator in the UI
- [x] On component unmount (`useEffect` cleanup), fire a final save immediately without the debounce delay to avoid data loss on navigation
- [x] Avoid races between a pending debounced `PATCH` and the unmount save: clear the debounce timer on cleanup, use single-flight / in-flight guard, or flush the debounced save before the final one

### 2.5 New Entry Flow
- [x] Create `app/(app)/entries/new/page.tsx`
- [x] On page load, immediately `POST` to `/api/entries` to create a blank entry and get back its ID
- [x] Redirect to `/entries/[id]/edit` so the entry has an ID before the user starts typing
- [x] This ensures auto-save always has an ID to `PATCH` against
- [x] Mitigate **orphan blank entries** on refresh or double navigation: e.g. reuse a draft via **`sessionStorage`** (`pendingEntryId`), periodic **cleanup** of empty entries, or **create-on-first-save** instead — pick one approach for v1 (`lib/journal/pending-entry.ts` + `journal:pendingEntryId` in sessionStorage; refresh on `/entries/new` reuses the same draft instead of POSTing again)

### 2.6 Entry Edit Page
- [x] Create `app/(app)/entries/[id]/edit/page.tsx`
- [x] Fetch the entry on load and pass `body` JSON to `editor.commands.setContent()`
- [x] Render the `TiptapEditor` component
- [x] Include a title input field that also debounce-saves

### 2.7 Entry List Page
- [x] Create `app/(app)/entries/page.tsx`
- [x] Fetch all entries via `GET /api/entries`
- [x] Render each entry as a card showing title, date, word count, and a truncated preview from `body_text`
- [x] Include a search input that calls `GET /api/entries?search=query` and re-renders the list

### 2.8 Single Entry View
- [x] Create `app/(app)/entries/[id]/page.tsx`
- [x] Fetch the entry and render it as read-only
- [x] Include an Edit button that links to `/entries/[id]/edit`
- [x] Include a Delete button that calls `DELETE /api/entries/[id]` and redirects to `/entries`
- [x] Pop up that confirms deletion (`window.confirm` before delete in `EntryViewActions`)

### 2.9 Dashboard Skeleton
- [x] Create `app/(app)/dashboard/page.tsx`
- [x] Render a basic layout with placeholder sections for stats, mood chart, and recent entries
- [x] Populate the recent entries section by fetching the 5 most recent entries from `/api/entries`
- [x] Add a **dashboard search** input wired to `GET /api/entries?search=` (same API as the entry list; high-level and low-level specs place full-text search on the dashboard)
- [x] Stats and mood chart will be filled in during Phase 3 and Phase 5

### 2.10 Verification
- [ ] Create a new entry, type content, wait for auto-save to fire, navigate away and back — confirm content persisted
- [ ] Search for a word that exists in an entry — confirm it appears in results
- [ ] Delete an entry — confirm it's gone from the list (after **`mood_analyses` exists**, confirm cascade if you have analyses)
- [ ] Confirm unauthenticated users cannot access any entries API routes

---

## Phase 3 — AI Mood Analysis

### 3.1 Mood Analyses Table Migration
- [ ] Run the `mood_analyses` table migration in Supabase (skip if you already applied it for **§2.2** per the Phase 2 prerequisite):
  - [ ] `id`, `entry_id`, `user_id`, `mood_label`, `score`, `summary`, `prompt_suggestion`, `created_at`
  - [ ] RLS policy: allow all operations where JWT sub matches the row's user
  - [ ] B-tree indexes on `entry_id` and `user_id`
- [ ] Lock in the mood label enum: `joyful`, `content`, `neutral`, `anxious`, `sad`, `angry`, `reflective` — use these exact values everywhere

### 3.2 OpenAI Setup
- [ ] Install `openai` package
- [ ] Add `OPENAI_API_KEY` to `.env.local`
- [ ] Create `lib/openai/client.ts` that exports a configured OpenAI client instance
- [ ] Create `lib/openai/prompts.ts` that exports the system prompt string for per-entry mood analysis
- [ ] The prompt must use JSON mode schema enforcement — specify the exact fields and value constraints

### 3.3 Analysis API Route
- [ ] Create `app/api/analysis/route.ts`
  - [ ] `POST` — accept `{ entryId }`; validate it's a UUID; verify the entry belongs to the authed user (JWT Supabase client + RLS, or equivalent ownership check)
  - [ ] Fetch the entry's `body_text` from Supabase
  - [ ] **Choose one server model** (do not mix “return 202 immediately” with awaiting OpenAI in the same synchronous handler):
    - **Option A — true async:** Return **202** right after validation, then run OpenAI + upsert inside **`after()` / `waitUntil`** (per your Next.js version) or enqueue a **BullMQ** job; document platform timeouts and that work continues after the response.
    - **Option B — synchronous:** **Await** OpenAI + upsert, then return **200** or **202** when finished; the client may still call `fetch()` without `await` (non-blocking navigation), but the **server** does the full LLM round-trip — document **latency** and **route timeouts**.
  - [ ] Call OpenAI `gpt-4o-mini` with `response_format: { type: 'json_object' }`; parse and upsert into `mood_analyses`
  - [ ] Wrap OpenAI/DB work in try/catch; on failure log and return `{ status: 'failed' }` (or resolve the async task without throwing) — never leave the client with an unhandled error for expected failures
- [ ] Add a basic in-memory rate limit: max 10 requests per user per hour keyed by Clerk `userId`
- [ ] If you run **multiple** web instances, move that limiter to **Redis** so counts are shared (in-memory limits are per-process only)

### 3.4 Navigate-Away Trigger
- [ ] In `TiptapEditor.tsx`, add a `useEffect` cleanup function that fires a `POST` to `/api/analysis` with the `entryId` when the component unmounts
- [ ] This must be non-blocking — use a plain `fetch()` with no `await` so it doesn't delay navigation
- [ ] *Tab close:* the browser may abort an in-flight `fetch`. Optional hardening: `navigator.sendBeacon` or `visibilitychange` / `pagehide` (watch auth headers, payload size, CORS). Accepting an occasional missed analysis is reasonable for v1.

### 3.5 Mood Chart Component
- [ ] Install `recharts`
- [ ] Create `components/charts/MoodChart.tsx`
- [ ] Use a Recharts `LineChart` with entry date on the x-axis and mood score (1–10) on the y-axis
- [ ] Color each point by `mood_label`
- [ ] Show a tooltip on hover with the mood label and truncated summary
- [ ] Render a skeleton during load and an empty state if fewer than 2 data points exist
- [ ] Query the last 30 `mood_analyses` records for the user

### 3.6 Wire Up Dashboard
- [ ] Add the `MoodChart` component to the dashboard
- [ ] Add a writing prompt section in the sidebar that shows `prompt_suggestion` from the most recent mood analysis
- [ ] Handle the case where no analysis exists yet with a default placeholder prompt

### 3.7 Verification
- [ ] Write an entry, navigate away, return to the dashboard — confirm a mood analysis appears on the chart
- [ ] Confirm the mood label is one of the seven valid values
- [ ] Confirm the score is between 1 and 10
- [ ] Confirm a failed OpenAI call does not break the editor or navigation

---

## Phase 4 — Background Jobs

### 4.1 Redis + Worker Setup on Railway
- [ ] Provision a Redis instance via the Railway dashboard
- [ ] Copy the `REDIS_URL` into `.env.local`
- [ ] Install `bullmq` and `ioredis`
- [ ] Create `workers/index.ts` as the worker entry point — initialize IORedis connection and register both workers
- [ ] Configure Redis/BullMQ for **reconnects** and transient failures; hosted platforms may restart processes — keep job processors idempotent where you can

### 4.2 Weekly Digest Table Migration
- [ ] Run the `weekly_insights` table migration in Supabase:
  - [ ] `id`, `user_id`, `week_start`, `week_end`, `summary`, `avg_score`, `entry_count`, `top_mood`, `created_at`
  - [ ] RLS policy scoped to the authenticated user

### 4.3 Weekly Digest Worker
- [ ] Create `workers/weeklyDigest.ts`
- [ ] On worker startup, add a repeatable job to the `weekly-digest` queue with cron `0 8 * * 0` (every Sunday at 8am UTC)
- [ ] Processor logic:
  - [ ] Query all users from Supabase using the service role client
  - [ ] For each user, fetch entries from the past 7 days
  - [ ] Skip users with 0 entries
  - [ ] Call OpenAI with the weekly insight prompt (entry summaries + scores → JSON summary + insight + avg_score)
  - [ ] Insert result into `weekly_insights`
  - [ ] Send email via Resend
- [ ] If processing fails for one user, log and skip — do not fail the entire job
- [ ] *Scale:* loading all users and calling OpenAI in one cron run can hit **Railway time/memory limits** as usage grows; later consider **batching**, **concurrency limits**, or **one job per user**

### 4.4 Time Capsules Table Migration
- [ ] Run the `time_capsules` table migration in Supabase:
  - [ ] `id`, `user_id`, `title`, `body` (jsonb, encrypted), `unlock_at`, `is_unlocked`, `notification_sent`, `bull_job_id`, `created_at`
  - [ ] RLS policy scoped to the authenticated user
  - [ ] B-tree indexes on `unlock_at` and composite `(user_id, is_unlocked)`

### 4.5 Time Capsule Encryption
- [ ] Create `lib/utils/encryption.ts`
- [ ] Implement AES-256-GCM encrypt and decrypt functions using Node's built-in `crypto` module
- [ ] Use a **dedicated server-only secret** `CAPSULE_ENCRYPTION_KEY` (e.g. 32-byte random, base64-encoded in env, or derive once with PBKDF2 from that secret and a fixed salt) — **do not** derive capsule keys from `SUPABASE_SERVICE_ROLE_KEY` (separates DB admin from app encryption; eases rotation)
- [ ] Store encrypted output as `iv:ciphertext` string in the `body` column (optional later: **key version** column if you rotate keys and need re-encryption)
- [ ] Only decrypt inside `GET /api/capsules/[id]` after confirming `is_unlocked = true` and ownership
- [ ] *Threat model:* application-level encryption is **not** end-to-end; the server can decrypt. It adds defense in depth (e.g. backups). Leaking `SUPABASE_SERVICE_ROLE_KEY` still compromises the DB — treat both DB and capsule secrets as tier-0

### 4.6 Time Capsule API Routes
- [ ] Create `app/api/capsules/route.ts`:
  - [ ] `GET` — list all capsules; redact `body` for locked entries (return only `title`, `unlock_at`, `is_unlocked`)
  - [ ] `POST` — encrypt body, insert row, schedule BullMQ delayed job with delay = `max(0, unlock_at - Date.now())` (if `unlock_at` is in the past, use **delay 0** / immediate job); watch **max delay** / queue limits for far-future `unlock_at`; store `job.id` in `bull_job_id`
- [ ] Create `app/api/capsules/[id]/route.ts`:
  - [ ] `GET` — if `is_unlocked = true`, decrypt and return body; otherwise return locked state
  - [ ] `DELETE` — cancel BullMQ job via `bull_job_id`, delete row

### 4.7 Time Capsule Unlock Worker
- [ ] Create `workers/timeCapsule.ts`
- [ ] Processor logic:
  - [ ] Receive `capsuleId` from job data
  - [ ] Fetch capsule from Supabase
  - [ ] Set `is_unlocked = true` and `notification_sent = true`
  - [ ] Fetch user email
  - [ ] Send unlock notification email via Resend
- [ ] **Reconciliation:** delayed jobs can be **lost** on worker restarts; add a **repeatable cron** (or run on worker startup) that finds rows with `unlock_at <= now()` and `is_unlocked = false`, sets `is_unlocked` (and sends email if not yet sent), so unlocks are not only tied to a single delayed job

### 4.8 Resend Email Setup
- [ ] Create a Resend account and verify your sending domain
- [ ] Install `resend` and `@react-email/components`
- [ ] Add `RESEND_API_KEY` to `.env.local`
- [ ] Create `lib/email/WeeklyDigestEmail.tsx` — displays week range, avg score, entry count, AI summary, insight, CTA button
- [ ] Create `lib/email/CapsuleUnlockedEmail.tsx` — displays capsule title, unlock date, CTA link
- [ ] Create `lib/email/send.ts` with a reusable `sendEmail()` helper
- [ ] On Resend failures: log with context; use BullMQ retries where appropriate so transient mail errors do not silently drop unlock/digest notifications

### 4.9 Time Capsule UI
- [ ] Create `app/(app)/capsules/page.tsx` — list all capsules; locked ones show lock icon, title, and live countdown via `useInterval`; unlocked ones render as a normal entry card
- [ ] Create `app/(app)/capsules/new/page.tsx` — form with title, body (Tiptap editor), and date picker for `unlock_at`
- [ ] Locked capsule body is never rendered on the client — the API redacts it

### 4.10 Verification
- [ ] Create a time capsule with an unlock date 2 minutes in the future — confirm it appears locked
- [ ] Wait for the BullMQ job to fire — confirm `is_unlocked` flips to true in Supabase and an email arrives
- [ ] Confirm the weekly digest cron is registered in Redis (inspect via BullMQ's job list)
- [ ] Confirm a failed worker job does not crash the worker process

---

## Phase 5 — Image Uploads

### 5.1 Supabase Storage Setup
- [ ] Create a storage bucket named `entry-images` and set it to public
- [ ] Add a Storage RLS policy: users can only upload to and delete from their own folder (`{clerk_id}/...`)
- [ ] *Privacy:* public URLs + `{clerk_id}/{uuid}` are usually fine (UUIDv4 is hard to guess); for stricter privacy use a **private bucket** and **signed URLs** for reads

### 5.2 Entry Images Table Migration
- [ ] Run the `entry_images` table migration:
  - [ ] `id`, `user_id`, `entry_id` (nullable), `storage_path`, `public_url`, `file_name`, `file_size`, `mime_type`, `created_at`
  - [ ] RLS policy scoped to authenticated user
  - [ ] B-tree indexes on `entry_id` and `user_id`

### 5.3 Upload API Routes
- [ ] Install `file-type` package for MIME verification from buffer
- [ ] Create `app/api/uploads/route.ts`:
  - [ ] `POST` — accept `multipart/form-data` with image file and `entryId`
  - [ ] Validate MIME type from buffer (not headers): allow only `image/jpeg`, `image/png`, `image/webp`, `image/gif` (`file-type` reads the buffer — acceptable while the **5MB** cap holds)
  - [ ] Reject files over 5MB with a 413
  - [ ] Upload to Supabase Storage at path `{clerk_id}/{uuid}.{ext}`
  - [ ] Insert row into `entry_images`
  - [ ] Return `{ publicUrl, imageId }`
- [ ] Create `app/api/uploads/[id]/route.ts`:
  - [ ] `DELETE` — verify ownership, delete from Supabase Storage, delete `entry_images` row

### 5.4 Tiptap Image Extension
- [ ] Install `@tiptap/extension-image`
- [ ] Add the `Image` extension to the editor's extension list
- [ ] Add an image upload button to the Tiptap toolbar
- [ ] On file select: validate type and size client-side, POST to `/api/uploads`, on success call `editor.chain().focus().setImage({ src: publicUrl, alt: fileName }).run()`
- [ ] Show a loading spinner on the toolbar button during upload
- [ ] On failure show a toast error and reset the button — do not modify editor state

### 5.5 Verification
- [ ] Upload an image inside an entry — confirm it renders inline
- [ ] Navigate away and back — confirm the image persists
- [ ] Confirm uploading a non-image file is rejected
- [ ] Confirm uploading a file over 5MB is rejected
- [ ] Delete an image from within the editor — confirm it's removed from Supabase Storage

---

## Phase 6 — Polish & Export

### 6.1 Dashboard Stats
- [ ] Calculate and display: current writing streak, longest streak, total entries, total word count
- [ ] Create `lib/utils/streaks.ts` — takes an array of entry dates and returns current and longest streak
- [ ] **Before implementing** `streaks.ts` and dashboard stats, **decide and document** how a "day" is defined (**UTC calendar date** vs **user's local timezone**); wire the same rule into tests — late-night local writes can split streaks if you use UTC naively
- [ ] Fetch stats server-side on the dashboard page and pass as props
- [ ] Show skeleton loaders while fetching

### 6.2 Light / Dark Mode
- [ ] Set Tailwind `darkMode` to `class` strategy
- [ ] Store the user's theme preference in `users.theme` in Supabase
- [ ] On login, read the preference and apply the `dark` class to `<html>`
- [ ] Persist preference in `localStorage` for instant application before the DB call resolves
- [ ] Add a toggle button in the nav and in `/settings`
- [ ] When the user toggles theme: update `users.theme` via an API route **and** update `localStorage` **and** the `dark` class on `<html>` so all three stay in sync

### 6.3 Settings Page
- [ ] Create `app/(app)/settings/page.tsx`
- [ ] Display account info (email, display name) pulled from Clerk
- [ ] Theme toggle
- [ ] Export buttons (JSON and PDF)
- [ ] Notification preferences — **persist** flags (e.g. columns on `users` or a `notification_settings` table: weekly digest on/off, capsule unlock email on/off) and have workers read them before sending

### 6.4 JSON Export
- [ ] Create `app/api/export/json/route.ts`
- [ ] Fetch all entries with joined `mood_analyses` and `entry_images` for the authenticated user
- [ ] Return as a structured JSON file download with `Content-Disposition: attachment` header
- [ ] Shape: `{ exported_at, user, entries: [{ id, title, body_text, word_count, created_at, updated_at, mood, images }] }`

### 6.5 PDF Export
- [ ] Spike `@react-pdf/renderer` early in this phase — Next.js bundling sometimes needs extra config; discovering that late is painful
- [ ] Create `app/api/export/pdf/route.ts`
- [ ] Install `@react-pdf/renderer`
- [ ] Render entries chronologically with title, date, body text, and mood score per page
- [ ] For entries with images, fetch image buffers server-side and embed as base64
- [ ] If an image fetch fails, render a placeholder and continue — do not abort the export
- [ ] *Scale:* large journals + **base64 images** can **OOM** or hit **serverless timeouts**; consider **entry/page limits**, **streaming**, or splitting exports if needed
- [ ] Note: if `@react-pdf/renderer` proves too complex, fall back to a client-side `window.print()` on a formatted hidden div

### 6.6 Responsive Layout Pass
- [ ] Dashboard sidebar collapses to a bottom sheet on mobile (below `md` breakpoint)
- [ ] Tiptap toolbar collapses to icon-only below `sm` (640px)
- [ ] Navigation collapses to a hamburger menu below `md` (768px)
- [ ] Test all pages at 375px, 768px, and 1280px widths

---

## Phase 7 — UI Implementation

### 7.1 Design Tokens & Global Styles
- [ ] Apply the full Tailwind color palette from the mockups (`primary: #0b6a6a`, surface tokens, etc.) to `tailwind.config.ts`
- [ ] Add Newsreader and Manrope font imports to the root layout
- [ ] Set up global CSS for Material Symbols icon font variation settings

### 7.2 Shared Component Library
- [ ] Build shared primitives in `components/ui/`:
  - [ ] `Button` — variants: primary (filled), ghost, icon
  - [ ] `Card` — base card with surface background and rounded corners
  - [ ] `Badge` — small label pill for mood tags
  - [ ] `Skeleton` — loading placeholder block
  - [ ] `Toast` — success/error notification
  - [ ] `Avatar` — user profile image with fallback initials

### 7.3 Navigation
- [ ] Build the `SideNav` component matching the mockup: Sanctuary wordmark, italic nav links with active state border, New Entry CTA button, Settings and Support links at the bottom
- [ ] Build the `TopBar` component: editorial title, secondary nav links, notifications icon, user avatar

### 7.4 Dashboard Page
- [ ] Implement the full bento grid layout from the mockup
- [ ] Top stats bar: streak, longest streak, total entries, total word count
- [ ] Mood trend chart (Recharts `LineChart`)
- [ ] Recent entries list
- [ ] Sidebar: writing prompt card, weekly insight snippet
- [ ] Full-text **search** (sidebar or prominent placement) wired to `GET /api/entries?search=` — matches [journal-highlevel.md](journal-highlevel.md) / [journal-lowlevel.md](journal-lowlevel.md) dashboard spec

### 7.5 Journal Editor Page
- [ ] Style the Tiptap editor to match the mockup: large italic title input, distraction-free body textarea with left accent border on focus
- [ ] Style the floating formatting toolbar at the bottom of the screen
- [ ] Style the mood selector widget and time-lock date picker below the editor

### 7.6 Entry List / Archive Page
- [ ] Implement the archive grid with varied card styles from the mockup
- [ ] Locked time capsule overlay with frosted glass blur and lock icon
- [ ] Mood filter buttons and sort controls
- [ ] Pagination / load more button

### 7.7 Analytics Page
- [ ] *Optional / mockup-driven:* the low-level page map does not include `/analytics`; add this route only if you have bandwidth after core flows
- [ ] Mood trend area chart (SVG or Recharts)
- [ ] Daily mood distribution horizontal bar chart
- [ ] Journaling frequency heat map grid
- [ ] Dominant mood word tags
- [ ] AI insight card

### 7.8 Settings / Profile Page
- [ ] Account info section
- [ ] Journaling preferences toggles
- [ ] Journey stats sidebar card
- [ ] Export buttons

---

## Phase 8 — Testing

### 8.1 Unit Tests (Vitest)
- [ ] Set up Vitest: `npm install -D vitest` is the **minimum** — you will typically also need **`jsdom`**, **`@vitejs/plugin-react`** (if testing React), and a **`vitest.config`** aligned with Next.js TypeScript paths; follow current [Vitest](https://vitest.dev/) + Next.js docs for this repo’s version
- [ ] Write tests for:
  - [ ] `lib/utils/wordCount.ts` — word count from Tiptap JSON
  - [ ] `lib/utils/streaks.ts` — streak calculation from date arrays
  - [ ] `lib/openai/parseAnalysis.ts` — JSON schema validation of OpenAI responses
  - [ ] `lib/utils/encryption.ts` — encrypt/decrypt roundtrip for time capsule bodies
  - [ ] `lib/db/queryHelpers.ts` — query builder helpers with mocked Supabase client (skip if you do not add this module)

### 8.2 Integration Tests (Vitest + Supertest)
- [ ] Use a test Supabase instance and mock Clerk auth
- [ ] Always mock OpenAI and Resend
- [ ] Write tests for:
  - [ ] `POST /api/entries` — creates entry, verifies DB row
  - [ ] `PATCH /api/entries/[id]` — updates entry, verifies `updated_at` changes
  - [ ] `DELETE /api/entries/[id]` — deletes entry, verifies cascade to `mood_analyses`
  - [ ] `POST /api/analysis` — verifies OpenAI mock called, `mood_analyses` row upserted
  - [ ] `POST /api/capsules` — verifies BullMQ job enqueued, encryption applied
  - [ ] `POST /api/uploads` — valid image uploads, non-image rejected, oversized rejected
  - [ ] `DELETE /api/uploads/[id]` — ownership check, Storage object removed

### 8.3 Component Tests (React Testing Library)
- [ ] Write tests for:
  - [ ] `TiptapEditor` — typing updates word count, save indicator appears after debounce, image upload triggers API call
  - [ ] `MoodChart` — empty state when no data, chart renders with mock data
  - [ ] `CapsuleCard` — body not rendered when `is_unlocked = false`, countdown renders
  - [ ] `DashboardStats` — correct streak and word count displayed

### 8.4 End-to-End Tests (Playwright)
- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Use Clerk test mode with a pre-seeded test user
- [ ] Document test Clerk app keys / env vars and how to run E2E locally in `README.md` or `e2e/README.md` (test vs dev instances are easy to mix up)
- [ ] Write flows for:
  - [ ] Sign in and land on dashboard
  - [ ] Create a new entry, type content, navigate away, verify analysis appears
  - [ ] Search for a word, verify correct entry appears
  - [ ] Upload an image in an entry, verify it renders and persists
  - [ ] Create a time capsule with a future date, verify it appears locked
  - [ ] Export JSON, verify file downloads and contains expected structure

---

## Phase 9 — Deployment

### 9.1 Railway Setup
- [ ] Create a Railway project
- [ ] Add three services from the same GitHub repo: `web`, `worker`, `redis`
- [ ] Configure `web` service: build with Nixpacks, start command `npm run start`, port 3000
- [ ] Configure `worker` service: start command `node workers/index.ts`
- [ ] Provision the Railway Redis plugin and confirm `REDIS_URL` is auto-injected

### 9.2 Environment Variables
- [ ] Add all production environment variables to Railway's shared environment variable group
- [ ] Update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to production Clerk keys
- [ ] Set production webhook signing secret to the **same env var name** your app expects (`CLERK_WEBHOOK_SIGNING_SECRET` or `CLERK_WEBHOOK_SECRET`, etc. — see §1.6)
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is set and never exposed client-side
- [ ] Set `CAPSULE_ENCRYPTION_KEY` in production (server only; see §4.5)

### 9.3 Production Webhook
- [ ] In the Clerk dashboard add a second webhook endpoint pointing to the Railway production URL: `https://your-app.railway.app/api/webhooks/clerk`
- [ ] Subscribe to `user.created` and **`user.updated`** (same as §1.6)
- [ ] Copy the new signing secret into Railway environment variables

### 9.4 railway.toml
- [ ] Create `railway.toml` at the project root (intended for the **`web`** service / default deploy — **`startCommand`** below is the Next.js app):
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```
- [ ] The **`worker`** service must use **`node workers/index.ts`** via **Railway’s per-service settings** (override start command in the dashboard) — do not assume one repo-level file starts both processes unless Railway is configured that way

### 9.5 CI/CD
- [ ] Set up GitHub Actions to run Vitest on every pull request
- [ ] Railway auto-deploys from the `main` branch on merge
- [ ] Run Playwright E2E against a **known base URL** from GitHub Actions secrets (e.g. **staging** or **production**) — **Railway PR previews are not automatic** like Vercel unless you set them up; do not assume a preview URL exists in CI

### 9.6 Database Migrations
- [ ] Manage all schema changes as numbered SQL files in `/supabase/migrations/`
- [ ] Apply migrations manually via the Supabase CLI before deploying dependent code
- [ ] There is no automated migration runner — apply manually before each deploy that requires schema changes
- [ ] **Deploy checklist:** (1) apply migrations (`supabase db push` / CLI), (2) verify schema in the Supabase dashboard, (3) **then** deploy application code that depends on the new schema

### 9.7 Smoke Test
- [ ] Sign up as a real user on production
- [ ] Create an entry, confirm auto-save works
- [ ] Navigate away, confirm mood analysis appears
- [ ] Create a time capsule, confirm it appears locked
- [ ] Trigger the weekly digest manually via BullMQ to confirm email sends
- [ ] Export JSON, confirm download works
