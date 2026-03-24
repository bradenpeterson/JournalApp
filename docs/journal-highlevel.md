**Personal Journal App**

High-Level Project Overview

*CS4610 Final Project*

**1. Project Summary**

A full-stack personal journaling web application built with Next.js.
Users can write rich text journal entries, track their mood over time
through AI analysis, set time-locked entries for their future self, and
receive weekly email digests summarizing their journaling activity. The
app is designed for people who want to journal consistently but need
more engagement and reflection tools to stay motivated.

**2. Tech Stack**

**Frontend**

-   Next.js + React --- full-stack framework handling both UI and API
    routes

-   Tailwind CSS --- utility-first styling with light/dark mode support

-   Tiptap --- rich text editor supporting bold, italics, headings, and
    bullet lists

**Backend & Database**

-   PostgreSQL via Supabase --- primary database for all app data

-   Supabase full-text search --- native PostgreSQL indexing for entry
    search

**Authentication**

-   Clerk --- handles sign-up, sign-in, and OAuth; user IDs
    foreign-keyed into Supabase

**Background Jobs**

-   BullMQ + Redis --- job queue for scheduled and event-driven
    background tasks

**AI & Email**

-   OpenAI API --- mood analysis, pattern detection, and weekly
    summaries

-   Resend --- transactional email delivery for weekly digests and time
    capsule notifications

**Deployment**

-   Railway --- full-stack hosting including Next.js app, Redis, and
    persistent BullMQ workers

**3. Core Features**

**Authentication**

Users create accounts and sign in via Clerk. OAuth support included. All
data is scoped to the authenticated user through Clerk user IDs tied to
the Supabase schema.

**Journal Entry Editor**

A rich text editor powered by Tiptap. Users can create, edit, and delete
entries with support for bold, italics, headings, and bullet lists. Each
entry stores a title, body, and timestamps.

**Dashboard**

Central hub showing writing streaks, all-time longest streak, and total
word count. Includes a full-text search bar that queries across all
entries. Mood trend charts visualize sentiment scores over time.
Light/dark mode toggle available.

**AI Mood Analysis**

After a user saves an entry and navigates away, the OpenAI API is called
asynchronously to analyze the emotional tone. Each entry receives a mood
label and a sentiment score (1--10). The API call is non-blocking and
uses JSON mode to enforce a consistent response schema. Periodically,
mood history is aggregated into a natural language insight, and
personalized writing prompts are generated based on recent mood data.

**Weekly Email Digest**

A BullMQ job runs every Sunday to fetch the user\'s entries for the
week, call the OpenAI API for a summary, and send a formatted email via
Resend. The email includes a mood summary and writing highlights for the
week.

**Time Capsule**

Users can write an entry addressed to their future self and set an
unlock date. The entry is locked and unreadable until that date passes.
A BullMQ job fires an email notification when the entry unlocks. The
dashboard shows locked time capsules with a live countdown.

**Export**

Users can export their full journal as a structured JSON file (includes
all entries, metadata, and mood scores) or as a formatted PDF organized
chronologically. PDF export is the highest-risk feature and may be
simplified or cut if time is limited.

**4. Background Jobs**

Two BullMQ workers run as persistent processes on Railway:

-   Weekly Digest Worker --- recurring job every Sunday; fetches
    entries, calls OpenAI, sends email via Resend

-   Time Capsule Worker --- event-driven job scheduled at entry
    creation; fires when the unlock date is reached and sends an unlock
    notification email

Both jobs include error handling so failures do not affect the core
journaling experience.

**5. Data Overview**

All data lives in PostgreSQL on Supabase. The key entities are:

-   Users --- Clerk user ID as the primary reference key

-   Entries --- title, rich text body (Tiptap JSON), timestamps, word
    count

-   Mood Analyses --- mood label, sentiment score (1--10), summary;
    linked to entries

-   Time Capsules --- entry content, unlock date, locked status,
    notification sent flag

Full-text search uses PostgreSQL\'s native indexing on entry content.
Row Level Security policies in Supabase ensure users can only access
their own data, keyed to Clerk user IDs.

**6. New Technologies to Learn**

-   Tiptap --- rich text editor framework; requires learning its
    extension model and how to serialize/deserialize its JSON format for
    storage and PDF export

-   Clerk --- Next.js authentication integration; focus on hooking Clerk
    user IDs into Supabase RLS policies correctly

-   Resend --- email SDK; relatively straightforward but requires
    setting up domain verification and email templates

-   BullMQ + Redis --- job queue setup; conceptually understood but
    first practical implementation; Railway simplifies Redis
    provisioning

-   OpenAI API --- first integration; prompt engineering and JSON mode
    enforcement are the main learning areas

**7. Risks & Open Questions**

-   PDF Export --- Tiptap stores content as ProseMirror JSON; converting
    to a well-formatted PDF is non-trivial. Most likely cut or
    simplified if time runs short.

-   Clerk + Supabase RLS --- needs to be configured correctly from the
    start to avoid security gaps; well-documented pattern but easy to
    misconfigure.

-   OpenAI Consistency --- JSON mode will enforce response schema, but
    prompt design needs to be locked in early to ensure stable mood
    scores across entries.

-   BullMQ Worker Persistence --- Railway supports long-running
    processes natively, but worker lifecycle and failure recovery need
    to be handled explicitly.
