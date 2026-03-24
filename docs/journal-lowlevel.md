**Personal Journal App**

Low-Level Design Document

*CS4610 Final Project --- Implementation Reference*

**1. Project Structure & File Layout**

The app follows the Next.js App Router convention. All server
components, API routes, and client components live under /app.
Background workers are isolated in a /workers directory and run as a
separate process on Railway.

**1.1 Directory Tree**

> /
>
> ├── app/
>
> │ ├── (auth)/ \# Clerk auth pages (sign-in, sign-up)
>
> │ ├── (app)/ \# Protected routes (require auth)
>
> │ │ ├── dashboard/ \# Main dashboard page
>
> │ │ ├── entries/ \# Entry list + individual entry routes
>
> │ │ │ ├── \[id\]/ \# Dynamic route for single entry
>
> │ │ │ │ ├── page.tsx \# View/edit entry page
>
> │ │ │ │ └── edit/ \# Edit sub-route
>
> │ │ ├── capsules/ \# Time capsule list + creation
>
> │ │ └── settings/ \# User preferences, export
>
> │ ├── api/ \# API route handlers
>
> │ │ ├── entries/ \# CRUD for journal entries
>
> │ │ ├── analysis/ \# OpenAI mood analysis trigger
>
> │ │ ├── capsules/ \# Time capsule CRUD
>
> │ │ ├── export/ \# JSON + PDF export endpoints
>
> │ │ └── webhooks/ \# Clerk webhook receiver
>
> │ ├── layout.tsx \# Root layout with ClerkProvider
>
> │ └── globals.css
>
> ├── components/
>
> │ ├── editor/ \# Tiptap editor components
>
> │ ├── dashboard/ \# Dashboard widgets
>
> │ ├── ui/ \# Shared primitives (buttons, cards)
>
> │ └── charts/ \# Mood trend chart components
>
> ├── lib/
>
> │ ├── db/ \# Supabase client + query helpers
>
> │ ├── openai/ \# OpenAI client + prompt definitions
>
> │ ├── email/ \# Resend email templates
>
> │ └── utils/ \# Shared utility functions
>
> ├── workers/
>
> │ ├── index.ts \# Worker entry point (registered queues)
>
> │ ├── weeklyDigest.ts \# Sunday digest job processor
>
> │ └── timeCapsule.ts \# Capsule unlock job processor
>
> ├── types/ \# Shared TypeScript interfaces
>
> ├── middleware.ts \# Clerk auth middleware
>
> └── railway.toml \# Railway deploy config

**1.2 Environment Variables**

  ----------------------------------- ------------------------------------------------
  **Variable**                        **Purpose**

  DATABASE_URL                        Supabase PostgreSQL connection string

  NEXT_PUBLIC_SUPABASE_URL            Supabase project URL (client-safe)

  NEXT_PUBLIC_SUPABASE_ANON_KEY       Supabase anon key (client-safe)

  SUPABASE_SERVICE_ROLE_KEY           Supabase admin key (server only)

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   Clerk publishable key

  CLERK_SECRET_KEY                    Clerk secret key (server only)

  CLERK_WEBHOOK_SECRET                Svix webhook signing secret

  OPENAI_API_KEY                      OpenAI API key (server only)

  RESEND_API_KEY                      Resend email API key

  REDIS_URL                           Railway Redis connection string
  ----------------------------------- ------------------------------------------------

**2. Database Schema**

All tables live in a single PostgreSQL schema on Supabase. The clerk_id
column is the foreign key that ties all user data to Clerk\'s
authentication system. Row Level Security (RLS) is enabled on every
table and policies restrict all reads and writes to rows where clerk_id
matches the authenticated user\'s JWT sub claim.

**2.1 Table Definitions**

**users**

  ---------------------- ------------------------------------------------
  **Column**             **Type / Notes**

  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid()

  clerk_id               text UNIQUE NOT NULL --- Clerk user ID

  email                  text NOT NULL

  display_name           text

  theme                  text DEFAULT \'light\' --- light \| dark

  created_at             timestamptz DEFAULT now()
  ---------------------- ------------------------------------------------

**entries**

  ---------------------- ------------------------------------------------
  **Column**             **Type / Notes**

  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid()

  user_id                uuid REFERENCES users(id) ON DELETE CASCADE

  title                  text NOT NULL DEFAULT \'Untitled\'

  body                   jsonb NOT NULL --- Tiptap ProseMirror JSON

  body_text              text --- plain text extracted for FTS and word
                         count

  word_count             integer DEFAULT 0

  created_at             timestamptz DEFAULT now()

  updated_at             timestamptz DEFAULT now()

  fts                    tsvector GENERATED --- full-text search index
  ---------------------- ------------------------------------------------

*Note: An updated_at trigger fires on every UPDATE. The fts column is a
generated tsvector over title \|\| body_text, indexed with GIN.*

**mood_analyses**

  ---------------------- ------------------------------------------------
  **Column**             **Type / Notes**

  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid()

  entry_id               uuid REFERENCES entries(id) ON DELETE CASCADE

  user_id                uuid REFERENCES users(id) ON DELETE CASCADE

  mood_label             text --- one of: joyful, content, neutral,
                         anxious, sad, angry, reflective

  score                  smallint CHECK (score BETWEEN 1 AND 10)

  summary                text --- 1--2 sentence AI summary

  prompt_suggestion      text --- personalized writing prompt

  created_at             timestamptz DEFAULT now()
  ---------------------- ------------------------------------------------

**time_capsules**

  ---------------------- ------------------------------------------------
  **Column**             **Type / Notes**

  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid()

  user_id                uuid REFERENCES users(id) ON DELETE CASCADE

  title                  text NOT NULL

  body                   jsonb NOT NULL --- encrypted at app layer before
                         insert

  unlock_at              timestamptz NOT NULL

  is_unlocked            boolean DEFAULT false

  notification_sent      boolean DEFAULT false

  bull_job_id            text --- BullMQ job ID for cancellation

  created_at             timestamptz DEFAULT now()
  ---------------------- ------------------------------------------------

**weekly_insights**

  ---------------------- ------------------------------------------------
  **Column**             **Type / Notes**

  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid()

  user_id                uuid REFERENCES users(id) ON DELETE CASCADE

  week_start             date NOT NULL

  week_end               date NOT NULL

  summary                text --- AI-generated weekly summary

  avg_score              numeric(4,2)

  entry_count            integer

  top_mood               text

  created_at             timestamptz DEFAULT now()
  ---------------------- ------------------------------------------------

**entry_images**

  ---------------------- ------------------------------------------------
  **Column**             **Type / Notes**

  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid()

  user_id                uuid REFERENCES users(id) ON DELETE CASCADE

  entry_id               uuid REFERENCES entries(id) ON DELETE SET NULL
                         --- nullable; null means orphaned

  storage_path           text NOT NULL --- path within Supabase Storage
                         bucket

  public_url             text NOT NULL --- full public URL inserted into
                         Tiptap

  file_name              text NOT NULL --- original filename

  file_size              integer NOT NULL --- size in bytes

  mime_type              text NOT NULL --- e.g. image/jpeg, image/png,
                         image/webp

  created_at             timestamptz DEFAULT now()
  ---------------------- ------------------------------------------------

*Note: entry_id is nullable to handle the case where an image is
uploaded but the entry is deleted before the image is removed. A cleanup
job or manual query can identify orphaned images where entry_id IS
NULL.*

**2.2 Supabase Storage**

Images are stored in a Supabase Storage bucket named entry-images. The
bucket is public so that image URLs can be embedded directly in Tiptap
without requiring signed URLs on every page load. Access to upload and
delete is restricted by Storage RLS policies tied to the authenticated
user.

-   Bucket name: entry-images

-   Bucket visibility: public (URLs are stable and embeddable)

-   Storage path pattern: {clerk_id}/{uuid}.{ext} --- scoped per user to
    avoid collisions

-   Max file size enforced server-side in the API route: 5MB

-   Allowed MIME types enforced server-side: image/jpeg, image/png,
    image/webp, image/gif

> \-- Storage RLS: users can only upload to their own folder
>
> CREATE POLICY \"Users manage own images\" ON storage.objects
>
> FOR ALL USING (bucket_id = \'entry-images\'
>
> AND (storage.foldername(name))\[1\] = auth.jwt()-\>\>\'sub\');

**2.3 Row Level Security**

RLS is enabled on all tables. The pattern is identical across tables: a
policy allows SELECT, INSERT, UPDATE, DELETE only when the row\'s
user_id matches the Clerk JWT sub. Supabase is configured to accept
Clerk-issued JWTs by adding Clerk\'s JWKS endpoint under Authentication
\> JWT Settings.

> \-- Example RLS policy for entries
>
> CREATE POLICY \"Users own their entries\" ON entries
>
> USING (user_id = (SELECT id FROM users WHERE clerk_id =
> auth.jwt()-\>\>\'sub\'));

*Note: The service role key (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS and
is used only inside background workers and server-side API routes where
Clerk auth is already verified.*

**2.4 Indexes**

-   GIN index on entries.fts for full-text search

-   B-tree index on entries.user_id for per-user entry queries

-   B-tree index on mood_analyses.entry_id for analysis lookups

-   B-tree index on time_capsules.unlock_at for worker queries

-   B-tree index on time_capsules.user_id + is_unlocked composite for
    dashboard queries

-   B-tree index on entry_images.entry_id for image lookups per entry

-   B-tree index on entry_images.user_id for per-user image management

**3. Authentication (Clerk)**

**3.1 Setup**

Clerk is initialized in the root layout. The ClerkProvider wraps the
entire app. middleware.ts uses Clerk\'s clerkMiddleware() to protect all
routes under /(app)/. Public routes are (auth)/sign-in and
(auth)/sign-up.

> // middleware.ts
>
> import { clerkMiddleware, createRouteMatcher } from
> \'@clerk/nextjs/server\';
>
> const isPublic = createRouteMatcher(\[\'/sign-in(.\*)\',
> \'/sign-up(.\*)\'\]);
>
> export default clerkMiddleware((auth, req) =\> {
>
> if (!isPublic(req)) auth().protect();
>
> });

**3.2 User Sync via Webhook**

When a user signs up via Clerk, a webhook fires to /api/webhooks/clerk.
This endpoint verifies the Svix signature, extracts the user payload,
and upserts a row in the users table. This is the only place a user row
is created --- never in a client-side flow.

1.  Clerk fires user.created event to /api/webhooks/clerk

2.  Endpoint verifies signature using CLERK_WEBHOOK_SECRET via Svix

3.  Extracts clerk_id, email, display_name from event payload

4.  Upserts into users table using service role key (bypasses RLS)

**3.3 Getting the Supabase User ID**

Server components and API routes call auth() from \@clerk/nextjs/server
to get the Clerk userId. This is then used to look up the internal
Supabase user.id for all database queries.

> // lib/db/getUser.ts
>
> export async function getSupabaseUser(clerkId: string) {
>
> const { data } = await supabase
>
> .from(\'users\').select(\'id\').eq(\'clerk_id\', clerkId).single();
>
> return data;
>
> }

**4. API Routes**

All API routes live under /app/api and are Next.js Route Handlers. Every
route calls auth() at the top and returns 401 if no session exists. The
Supabase service role client is used server-side so RLS does not
interfere --- auth is already enforced by Clerk.

**4.1 Entries**

  -------------------- -------------------------- --------------------------
  **Route**            **Method**                 **Description**

  api/entries          GET                        Fetch all entries for the
                                                  authed user, ordered by
                                                  updated_at desc. Accepts
                                                  optional ?search= query
                                                  param for FTS.

  api/entries          POST                       Create a new entry. Body:
                                                  { title, body (Tiptap
                                                  JSON), body_text }.
                                                  Returns created entry.

  api/entries/\[id\]   GET                        Fetch a single entry with
                                                  its mood_analysis joined.

  api/entries/\[id\]   PATCH                      Update title, body,
                                                  body_text, word_count.
                                                  Recalculates updated_at.

  api/entries/\[id\]   DELETE                     Hard delete entry and
                                                  cascade to mood_analyses.
  -------------------- -------------------------- --------------------------

**4.2 Analysis**

  ------------------ -------------------------- --------------------------
  **Route**          **Method**                 **Description**

  api/analysis       POST                       Accepts { entryId }.
                                                Fetches entry body_text,
                                                calls OpenAI, upserts into
                                                mood_analyses.
                                                Fire-and-forget from the
                                                client --- returns 202
                                                immediately and runs
                                                async.
  ------------------ -------------------------- --------------------------

**4.3 Time Capsules**

  --------------------- -------------------------- --------------------------
  **Route**             **Method**                 **Description**

  api/capsules          GET                        List all capsules for
                                                   user. Returns locked ones
                                                   with body redacted.

  api/capsules          POST                       Create capsule. Encrypts
                                                   body, inserts row,
                                                   schedules BullMQ job for
                                                   unlock_at date, stores
                                                   bull_job_id.

  api/capsules/\[id\]   GET                        Returns capsule. If
                                                   is_unlocked = true,
                                                   returns decrypted body.
                                                   Otherwise returns locked
                                                   state.

  api/capsules/\[id\]   DELETE                     Deletes capsule, cancels
                                                   BullMQ job via
                                                   bull_job_id.
  --------------------- -------------------------- --------------------------

**4.4 Export**

  ------------------ -------------------------- --------------------------
  **Route**          **Method**                 **Description**

  api/export/json    GET                        Fetches all entries +
                                                mood_analyses for user,
                                                returns structured JSON
                                                file as download.

  api/export/pdf     GET                        Fetches all entries,
                                                renders via
                                                \@react-pdf/renderer
                                                server-side, returns PDF
                                                blob.
  ------------------ -------------------------- --------------------------

**4.5 Uploads**

  -------------------- -------------------------- --------------------------
  **Route**            **Method**                 **Description**

  api/uploads          POST                       Accepts
                                                  multipart/form-data with
                                                  an image file and entryId.
                                                  Validates file type and
                                                  size, uploads to Supabase
                                                  Storage, inserts row into
                                                  entry_images, returns {
                                                  publicUrl, imageId }.

  api/uploads/\[id\]   DELETE                     Deletes image from
                                                  Supabase Storage and
                                                  removes the entry_images
                                                  row. Verifies the
                                                  requesting user owns the
                                                  image before deletion.
  -------------------- -------------------------- --------------------------

**4.6 Error Handling Convention**

All routes return consistent error shapes. A failed OpenAI call in
/api/analysis logs the error and returns a 202 with { status: \'failed\'
} --- it never throws to the client. Core CRUD errors return appropriate
HTTP codes with { error: string } body.

> // Standard error response
>
> return NextResponse.json({ error: \'Entry not found\' }, { status: 404
> });

**5. Journal Editor (Tiptap)**

**5.1 Extensions**

The editor uses a curated set of Tiptap extensions. No unnecessary
extensions are added to keep the bundle lean.

-   StarterKit --- includes Document, Paragraph, Text, Bold, Italic,
    Strike, Code, Blockquote, HardBreak, Heading, BulletList,
    OrderedList, ListItem, History

-   Placeholder --- shows placeholder text when the editor is empty

-   CharacterCount --- used to derive word count on every transaction

-   Typography --- smart quotes, em-dashes, ellipsis conversion

-   Image --- renders uploaded images as inline nodes; src is set to the
    Supabase Storage public URL returned from /api/uploads

**5.2 Storage Format**

The Tiptap editor serializes content as ProseMirror JSON. This JSON is
stored in the entries.body column (jsonb). On load, the JSON is passed
directly to editor.commands.setContent(). A plain text extraction runs
on every save and is stored in body_text for full-text search and word
count.

> // Plain text extraction for FTS
>
> const bodyText = editor.getText({ blockSeparator: \' \' });

**5.3 Image Upload Flow**

Images are uploaded through a custom toolbar button in the editor. The
flow is intentionally simple and non-blocking.

5.  User clicks the image button in the Tiptap toolbar and selects a
    file

6.  Client validates file type (jpeg, png, webp, gif) and size (max 5MB)
    before sending

7.  File is POSTed to /api/uploads as multipart/form-data along with the
    current entryId

8.  API route validates, uploads to Supabase Storage, inserts
    entry_images row, returns publicUrl

9.  Editor inserts an Image node at the current cursor position with src
    set to publicUrl

10. Tiptap auto-save captures the image node in the next debounced PATCH
    to /api/entries/\[id\]

If the upload fails, the toolbar button resets and a toast error is
shown. The editor state is not modified on failure. Image deletion from
within the editor triggers a DELETE to /api/uploads/\[id\] and then
removes the node from the document.

> // Insert image node after successful upload
>
> editor.chain().focus().setImage({ src: publicUrl, alt: fileName
> }).run();

**5.4 Auto-Save Behavior**

The editor does not auto-save on every keystroke. Instead, a debounced
save fires 2 seconds after the user stops typing, sending a PATCH to
/api/entries/\[id\]. This keeps API calls minimal without risking data
loss. A visual indicator shows Saving\... / Saved states.

**5.5 Analysis Trigger**

When the user navigates away from the editor page (via Next.js
router.push or browser navigation), a useEffect cleanup function fires a
POST to /api/analysis with the entry ID. This is non-blocking --- it
does not delay navigation. The analysis result appears on the dashboard
when the user returns.

> // Trigger on unmount
>
> useEffect(() =\> {
>
> return () =\> {
>
> fetch(\'/api/analysis\', { method: \'POST\',
>
> body: JSON.stringify({ entryId }) });
>
> };
>
> }, \[entryId\]);

**6. OpenAI Integration**

**6.1 Per-Entry Mood Analysis**

The analysis prompt is sent to gpt-4o-mini using JSON mode
(response_format: { type: \'json_object\' }). The prompt enforces a
fixed schema so the response can be parsed without defensive fallbacks.

> // System prompt
>
> You are a journaling assistant. Analyze the emotional tone of the
>
> journal entry and respond ONLY with a JSON object matching this
> schema:
>
> {
>
> \"mood_label\": one of \[joyful, content, neutral, anxious, sad,
> angry, reflective\],
>
> \"score\": integer 1-10 where 1=very negative, 5=neutral, 10=very
> positive,
>
> \"summary\": string, 1-2 sentences describing the emotional tone,
>
> \"prompt_suggestion\": string, one writing prompt tailored to this
> mood
>
> }
>
> // User message
>
> Analyze this journal entry: \<entry_body_text\>

**6.2 Weekly Insight**

The weekly digest job sends a different prompt that receives an array of
entry summaries and mood scores for the week and returns a natural
language paragraph summarizing the week emotionally, plus a single
insight observation.

> // Weekly system prompt
>
> You are a journaling assistant. Given a week of journal mood data,
>
> return ONLY JSON matching:
>
> {
>
> \"summary\": string, 2-3 sentence emotional arc for the week,
>
> \"insight\": string, one specific observation or pattern noticed,
>
> \"avg_score\": number, the average mood score for the week
>
> }

**6.3 Error Handling**

All OpenAI calls are wrapped in try/catch. On failure the API route logs
the error with the entry ID and returns a 202 with { status: \'failed\'
} so the client is not blocked. A retry is not automatic --- if the
analysis fails, the entry simply has no mood analysis. The dashboard
handles missing analyses gracefully by rendering a neutral placeholder.

**6.4 Cost Management**

gpt-4o-mini is used for all calls as it is the most cost-effective
option for short text classification. Analysis is triggered once per
entry save session (on navigate-away), not on every save. The body_text
field (plain text) is sent instead of the full Tiptap JSON to minimize
token count.

**7. Background Workers (BullMQ + Redis)**

**7.1 Queue Setup**

Two named queues are defined: weekly-digest and capsule-unlock. Both are
initialized in workers/index.ts which is the entry point for the
separate worker process on Railway.

> // workers/index.ts
>
> import { Worker } from \'bullmq\';
>
> import IORedis from \'ioredis\';
>
> const connection = new IORedis(process.env.REDIS_URL, {
> maxRetriesPerRequest: null });
>
> new Worker(\'weekly-digest\', weeklyDigestProcessor, { connection });
>
> new Worker(\'capsule-unlock\', capsuleUnlockProcessor, { connection
> });

**7.2 Weekly Digest Job**

A repeatable job is added to the weekly-digest queue on worker startup
using a cron expression. It runs every Sunday at 8:00 AM UTC.

> // Schedule on startup
>
> await digestQueue.add(\'run\', {}, {
>
> repeat: { cron: \'0 8 \* \* 0\' },
>
> jobId: \'weekly-digest-recurring\'
>
> });

The processor logic:

11. Query all users from Supabase

12. For each user, fetch entries created in the past 7 days

13. Skip users with 0 entries for the week

14. Call OpenAI weekly insight prompt with entry summaries and scores

15. Insert result into weekly_insights table

16. Send email via Resend using the weekly digest template

**7.3 Time Capsule Unlock Job**

When a capsule is created via POST /api/capsules, a delayed BullMQ job
is added with a delay equal to the ms until unlock_at. The returned job
ID is stored in time_capsules.bull_job_id so it can be cancelled if the
capsule is deleted.

> // Schedule unlock job
>
> const delay = new Date(unlock_at).getTime() - Date.now();
>
> const job = await capsuleQueue.add(\'unlock\', { capsuleId }, { delay
> });
>
> // Store job.id in time_capsules.bull_job_id

The processor logic:

17. Receive capsuleId from job data

18. Fetch capsule from Supabase

19. Set is_unlocked = true and notification_sent = true

20. Fetch user email from users table

21. Send unlock notification email via Resend

**7.4 Worker Failure Recovery**

-   Both workers use BullMQ\'s default retry with exponential backoff (3
    attempts)

-   Failed jobs are moved to a failed set in Redis and can be inspected

-   Worker process restarts are handled by Railway\'s restart policy

-   If the weekly digest fails for a user, that user is skipped and
    logged --- other users are unaffected

**8. Email (Resend)**

**8.1 Templates**

Both email templates are React components rendered server-side using
\@react-email/components. They are located in lib/email/.

-   WeeklyDigestEmail --- displays week date range, avg mood score,
    entry count, AI summary, insight, and a CTA button to the app

-   CapsuleUnlockedEmail --- displays capsule title, unlock date, and a
    CTA link to view the unlocked entry

**8.2 Sending**

> // lib/email/send.ts
>
> import { Resend } from \'resend\';
>
> const resend = new Resend(process.env.RESEND_API_KEY);
>
> await resend.emails.send({
>
> from: \'journal@yourdomain.com\',
>
> to: user.email,
>
> subject: \'Your Weekly Journal Digest\',
>
> react: \<WeeklyDigestEmail data={insightData} /\>
>
> });

*Note: Domain verification is required in Resend before emails send
reliably. Set up a verified sending domain early in development.*

**9. UI / UX Design**

**9.1 Page Map**

  ---------------------- ------------------------------------------------
  **Route**              **Description**

  /sign-in               Clerk-hosted sign-in page, minimal branding

  /sign-up               Clerk-hosted sign-up page

  /dashboard             Main hub --- streaks, word count, mood chart,
                         recent entries, search

  /entries               Paginated list of all entries sorted by recency

  /entries/\[id\]        View a single entry with its mood analysis
                         sidebar

  /entries/new           New entry --- opens blank Tiptap editor

  /entries/\[id\]/edit   Edit an existing entry in Tiptap editor

  /capsules              List of all time capsules with countdown timers

  /capsules/new          Create a new time capsule

  /settings              Theme toggle, account info, export buttons
  ---------------------- ------------------------------------------------

**9.2 Dashboard Layout**

The dashboard is divided into three zones: a top stats bar, a main
content area, and a sidebar. On mobile the sidebar collapses below the
main content.

-   Top stats bar --- current streak, longest streak, total entries,
    total word count

-   Main content left --- mood trend chart (last 30 days), recent
    entries list

-   Sidebar right --- today\'s writing prompt (from most recent AI
    analysis), weekly insight snippet, search bar

**9.3 Image Upload UI**

The Tiptap toolbar includes an image upload button represented by a
standard image icon. Clicking it opens the browser\'s native file picker
filtered to image types. A loading spinner overlays the toolbar button
during the upload request. On success the image renders inline in the
editor at natural width, capped to 100% of the editor container width
via CSS. Users can click an uploaded image to select it and press delete
to remove it from the entry, which also triggers the DELETE
/api/uploads/\[id\] call.

*Note: Images are displayed at their natural aspect ratio inside the
editor. No cropping or resizing UI is provided in v1.*

**9.4 Mood Trend Chart**

The chart is built with Recharts (LineChart). The x-axis is the entry
date and the y-axis is the mood score (1--10). Points are color-coded by
mood_label. Hovering shows the mood label and a truncated summary. The
chart queries the last 30 mood_analyses records for the user.

**9.5 Light / Dark Mode**

Tailwind\'s dark mode is set to class strategy. The theme class is
toggled on the \<html\> element. The user\'s preference is stored in
users.theme and synced on login. A toggle button in the nav and in
/settings switches the theme. The preference is also persisted in
localStorage for instant application before the DB call resolves.

**9.6 Time Capsule UI**

Locked capsules are shown as cards with a lock icon, the capsule title,
and a live countdown rendered with a useInterval hook updating every
second. The body is never sent to the client while locked --- the API
explicitly redacts it. Unlocked capsules show a visual unlock animation
on first view and then render as a normal read-only entry card.

**9.7 Loading & Empty States**

-   Entry list --- skeleton cards during load; empty state with a prompt
    to write the first entry

-   Mood chart --- skeleton chart during load; empty state if fewer than
    2 data points

-   Dashboard stats --- skeleton numbers during load

-   Time capsule countdown --- shows \'Unlocked!\' badge with animation
    when is_unlocked flips

**9.8 Responsive Behavior**

-   Breakpoints follow Tailwind defaults: sm (640px), md (768px), lg
    (1024px)

-   Dashboard sidebar collapses to a bottom sheet on mobile

-   Tiptap toolbar collapses to an icon-only bar on screens below 640px

-   Navigation collapses to a hamburger menu below 768px

**10. Time Capsule Encryption**

Capsule bodies are encrypted at the application layer before being
written to Supabase. This ensures that even a direct database read
cannot expose a locked capsule\'s contents.

-   Algorithm: AES-256-GCM using Node\'s built-in crypto module

-   Key: derived from SUPABASE_SERVICE_ROLE_KEY using PBKDF2 (fixed salt
    per deployment)

-   The IV is randomly generated per capsule and stored alongside the
    ciphertext as iv:ciphertext in the body column

-   Decryption only runs inside the GET /api/capsules/\[id\] handler
    after confirming is_unlocked = true and the requesting user owns the
    capsule

*Note: This is application-level encryption, not end-to-end. The server
can always decrypt. The goal is preventing casual DB exposure, not
adversarial access.*

**11. Export**

**11.1 JSON Export**

The JSON export is the primary, reliable export format. The endpoint
fetches all entries with their mood_analyses for the authenticated user
and returns a structured JSON file.

> // Export shape
>
> {
>
> \"exported_at\": \"ISO timestamp\",
>
> \"user\": { \"display_name\": \"\...\", \"email\": \"\...\" },
>
> \"entries\": \[
>
> {
>
> \"id\": \"uuid\",
>
> \"title\": \"string\",
>
> \"body_text\": \"plain text\",
>
> \"word_count\": 123,
>
> \"created_at\": \"ISO\",
>
> \"updated_at\": \"ISO\",
>
> \"mood\": { \"label\": \"content\", \"score\": 7, \"summary\":
> \"\...\" }
>
> }
>
> \]
>
> }

**11.2 PDF Export**

PDF export is implemented using \@react-pdf/renderer running server-side
in the API route. The Tiptap JSON body is converted to plain text
(body_text) before rendering. Entries are laid out chronologically with
title, date, body, and mood score per page break.

*Note: If \@react-pdf/renderer proves too complex within the project
timeline, PDF export will be simplified to a client-side window.print()
on a formatted hidden div. This is the most likely feature to be scoped
down.*

**11.3 Image Handling in Exports**

Images embedded in entries require special handling in both export
formats. For JSON export, the entry_images rows for each entry are
included in the export payload alongside the body_text, giving the
exported file a complete record of attached image URLs and metadata.

> \"images\": \[
>
> { \"id\": \"uuid\", \"public_url\": \"https://\...\", \"file_name\":
> \"photo.jpg\", \"file_size\": 204800 }
>
> \]

For PDF export, images are fetched server-side by URL and embedded as
base64 data into the PDF using \@react-pdf/renderer\'s Image component.
If an image fetch fails, a placeholder is rendered in its place and the
export continues. Fetching many large images may increase PDF generation
time significantly --- this is noted as a known limitation.

**12. Testing Strategy**

**12.1 Unit Tests (Vitest)**

Unit tests cover pure utility functions and data transformation logic.
They do not require a running server or database.

-   lib/utils/wordCount.ts --- test word count calculation from Tiptap
    JSON

-   lib/utils/streaks.ts --- test streak calculation logic from date
    arrays

-   lib/openai/parseAnalysis.ts --- test JSON schema validation of
    OpenAI responses

-   lib/db/queryHelpers.ts --- test query builder helpers with mocked
    Supabase client

**12.2 Integration Tests (Vitest + Supertest)**

Integration tests hit the actual API route handlers with a test Supabase
instance and mocked Clerk auth. OpenAI and Resend are always mocked in
integration tests.

-   POST /api/entries --- creates entry, verifies DB row exists

-   PATCH /api/entries/\[id\] --- updates entry, verifies updated_at
    changes

-   DELETE /api/entries/\[id\] --- deletes entry, verifies cascade to
    mood_analyses

-   POST /api/analysis --- verifies OpenAI mock is called, mood_analyses
    row upserted

-   POST /api/capsules --- verifies BullMQ job is enqueued, encryption
    applied

-   POST /api/uploads --- verifies file type validation rejects
    non-images, valid image uploads to Supabase Storage and inserts
    entry_images row

-   DELETE /api/uploads/\[id\] --- verifies ownership check, verifies
    Storage object removed on success

**12.3 Component Tests (React Testing Library)**

Component tests render individual React components in isolation using
jsdom. They focus on user interaction and conditional rendering.

-   TiptapEditor --- test that typing updates word count, save indicator
    appears after debounce

-   MoodChart --- test that empty state renders when no data, chart
    renders with mock data

-   CapsuleCard --- test that body is not rendered when is_unlocked =
    false, countdown renders

-   DashboardStats --- test that correct streak and word count values
    are displayed

-   TiptapEditor image upload --- test that selecting a file triggers
    /api/uploads, image node inserted on success, error toast shown on
    failure

**12.4 End-to-End Tests (Playwright)**

E2E tests run against a local dev server with a seeded test database.
Clerk auth is bypassed using Clerk\'s test mode and a pre-seeded test
user.

-   Sign in and land on dashboard

-   Create a new entry, type content, navigate away, verify analysis
    appears

-   Search for a word and verify correct entry appears in results

-   Create a time capsule with a future date, verify it appears locked
    in the list

-   Export JSON, verify file downloads and contains expected structure

-   Upload an image inside an entry, verify it renders inline, verify it
    persists after page reload

**12.5 Test File Conventions**

-   Unit/integration: colocated with source in \_\_tests\_\_/
    subdirectory or .test.ts suffix

-   Component tests: colocated with component files as
    ComponentName.test.tsx

-   E2E: all in /e2e directory at project root

-   All tests run via npm test (Vitest) and npm run test:e2e
    (Playwright)

**13. Deployment (Railway)**

**13.1 Services**

Railway runs three services from the same GitHub repo:

  ---------------------- ------------------------------------------------
  **Service**            **Details**

  web                    Next.js app --- next start on port 3000. Railway
                         detects Next.js automatically.

  worker                 BullMQ workers --- node workers/index.ts. Runs
                         as a separate Railway service with the same env
                         vars.

  redis                  Railway Redis plugin --- provisioned via the
                         Railway dashboard. Connection string
                         auto-injected as REDIS_URL.
  ---------------------- ------------------------------------------------

**13.2 railway.toml**

> \[build\]
>
> builder = \"NIXPACKS\"
>
> \[deploy\]
>
> startCommand = \"npm run start\"
>
> restartPolicyType = \"ON_FAILURE\"
>
> restartPolicyMaxRetries = 5

The worker service overrides startCommand in the Railway dashboard to
node workers/index.ts. Both services share the same environment variable
group.

**13.3 CI/CD**

-   GitHub Actions runs Vitest on every pull request

-   Railway auto-deploys from the main branch on merge

-   Playwright E2E tests run post-deploy against the Railway preview URL

**13.4 Database Migrations**

Schema changes are managed as numbered SQL migration files in
/supabase/migrations/. Migrations are applied manually via the Supabase
CLI before deploying code that depends on them. There is no automated
migration runner in the deployment pipeline for this project.

**14. Security**

Security is enforced at multiple layers. No single mechanism is solely
responsible --- auth, database policies, API validation, and data
handling each carry part of the responsibility.

**14.1 Authentication & Authorization**

Every API route calls auth() from \@clerk/nextjs/server at the top of
the handler. If no valid Clerk session exists, the route returns 401
immediately before touching the database. The Clerk userId extracted
from the session is the only trusted identifier --- user IDs are never
accepted from the request body or query string.

> // Every protected route starts with this
>
> const { userId } = auth();
>
> if (!userId) return NextResponse.json({ error: \'Unauthorized\' }, {
> status: 401 });

**14.2 Row Level Security (RLS)**

Supabase RLS policies are the last line of defense at the database
layer. Even if application-level auth were bypassed, RLS ensures a user
can only read or write rows where their clerk_id matches the JWT sub
claim. RLS is enabled on all tables with no exceptions.

Supabase is configured to accept Clerk-issued JWTs by registering
Clerk\'s JWKS endpoint under Authentication \> JWT Settings in the
Supabase dashboard. This must be configured before any RLS policies that
reference auth.jwt() will work correctly.

*Note: The service role key bypasses RLS entirely. It is used only in
background workers and server-side API routes where Clerk auth has
already been verified. It is never exposed to the client and never
included in any client-side Supabase calls.*

**14.3 Webhook Verification**

The Clerk webhook endpoint at /api/webhooks/clerk is publicly reachable
and must not be trusted without signature verification. Every incoming
request is verified using the Svix library against the
CLERK_WEBHOOK_SECRET before any payload is processed. Requests that fail
verification are rejected with a 400.

> const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
>
> const event = wh.verify(body, headers); // throws if invalid

**14.4 Input Validation**

All incoming request bodies are validated before being written to the
database or forwarded to OpenAI. The title and body fields on entry
creation and update are checked for presence and type. The entryId on
analysis requests is validated as a UUID before any DB lookup. Malformed
requests return 400 with a descriptive error message.

Tiptap\'s ProseMirror JSON body is stored as-is in the jsonb column but
the body_text plain text extraction is what gets passed to OpenAI ---
never the raw JSON. This limits the surface area for prompt injection
attacks through crafted entry content.

**14.5 Rate Limiting**

The /api/analysis route is the most expensive endpoint --- each call
triggers an OpenAI API request. To prevent abuse, this route is
rate-limited per user to a maximum of 10 requests per hour using an
in-memory counter keyed by Clerk userId. If the app scales to multiple
web instances, the counter must be moved to Redis to be shared across
instances.

*Note: A simple in-memory rate limiter is sufficient for a
single-instance deployment on Railway. Multi-instance deployments
require a Redis-backed counter.*

**14.6 Environment Variable Security**

Environment variables are split by exposure level. Client-safe variables
are prefixed with NEXT_PUBLIC\_ and can be included in browser bundles.
Server-only variables must never appear in client components or be
logged.

  ----------------------------------- ------------------------------------------------
  **Variable**                        **Exposure**

  NEXT_PUBLIC_SUPABASE_URL            Client-safe --- used in browser Supabase client

  NEXT_PUBLIC_SUPABASE_ANON_KEY       Client-safe --- scoped by RLS, safe to expose

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   Client-safe --- Clerk design for frontend use

  SUPABASE_SERVICE_ROLE_KEY           Server only --- bypasses RLS, never expose

  CLERK_SECRET_KEY                    Server only --- used to verify sessions
                                      server-side

  CLERK_WEBHOOK_SECRET                Server only --- used to verify Svix signatures

  OPENAI_API_KEY                      Server only --- never referenced in client
                                      components

  RESEND_API_KEY                      Server only --- email sending, server only

  REDIS_URL                           Server only --- worker and queue access only
  ----------------------------------- ------------------------------------------------

**14.7 Time Capsule Data Exposure**

Locked capsule bodies are never sent to the client under any
circumstance. The GET /api/capsules route explicitly redacts the body
field for any capsule where is_unlocked = false, returning only the
title, unlock_at timestamp, and is_unlocked flag. The GET
/api/capsules/\[id\] route checks is_unlocked before decrypting and
returns a locked state response if the date has not passed.

Decryption of capsule bodies happens exclusively on the server inside
the API handler, after both ownership and unlock status have been
confirmed. The decrypted plaintext is never cached or logged.

**14.8 Image Upload Security**

File uploads are validated at the API layer before anything is written
to storage. Both file type and file size are checked server-side
regardless of any client-side validation. MIME type is verified by
inspecting the file buffer using the file-type package rather than
trusting the Content-Type header or file extension, which can be
spoofed.

-   Allowed types: image/jpeg, image/png, image/webp, image/gif only

-   Max file size: 5MB --- requests exceeding this are rejected with a
    413

-   MIME type verified from buffer using file-type package, not from
    headers

-   Storage path is {clerk_id}/{uuid}.{ext} --- user cannot control the
    path or overwrite another user\'s files

-   Ownership is verified on DELETE before removing from storage ---
    users cannot delete other users\' images

**14.9 HTTPS & Transport Security**

All traffic is served over HTTPS. Railway enforces HTTPS on all deployed
services by default and redirects HTTP to HTTPS. No additional
configuration is needed. Worker-to-Supabase and worker-to-Redis
connections use TLS-enabled connection strings provided by Railway and
Supabase.

**15. Recommended Implementation Order**

Each phase should be fully working before moving to the next. Do not
begin Phase 3 until Phase 2 is tested and stable.

**Phase 1 --- Foundation**

22. Initialize Next.js project with Tailwind, TypeScript, ESLint

23. Set up Supabase project, run initial schema migrations

24. Install and configure Clerk, implement middleware and webhook sync

25. Verify sign-up creates a users row, sign-in protects routes

**Phase 2 --- Core Journaling**

26. Implement /api/entries CRUD routes

27. Build Tiptap editor component with debounced save

28. Build entry list page and single entry view

29. Implement full-text search via Supabase FTS

**Phase 3 --- AI Analysis**

30. Implement /api/analysis route with OpenAI JSON mode

31. Wire up navigate-away trigger in editor

32. Build mood chart component with Recharts

33. Add writing prompt display to dashboard sidebar

**Phase 4 --- Background Jobs**

34. Provision Redis on Railway

35. Implement worker entry point and queue connections

36. Implement weekly digest processor and Resend email template

37. Implement time capsule CRUD, encryption, and unlock job

**Phase 5 --- Polish & Export**

38. Dashboard stats (streaks, word count)

39. Light/dark mode toggle and persistence

40. JSON export

41. PDF export (or simplified fallback)

42. Responsive mobile layout pass

**Phase 6 --- Testing & Deploy**

43. Write unit and integration tests

44. Write Playwright E2E flows

45. Deploy to Railway, verify all services healthy

46. Smoke test all features in production
