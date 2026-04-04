# UI flaws, gaps, and technical debt

This document tracks **mismatches between design and implementation**, **missing product behavior**, and **known limitations** as the Sanctuary / Figma-inspired UI is rolled out. Update it as features ship.

---

## Dashboard (`/dashboard`, `DashboardHome`)

1. **Quick mood chips** — Labels link to **`/journal`** only. They do **not** create a mood log, call analysis, or pre-fill the editor. There is no API for “quick mood without an entry.”

2. **Italic quote under Quick log** — *“Today feels like a soft transition between seasons.”* is **static marketing copy**, not generated from `mood_analyses`, entry text, or AI.

3. **“Best time to write”** — Shows **—**. The app does **not** store or aggregate **hour-of-day** for writing; nothing computes this yet.

4. **“Top emotion”** — Derived as the **most frequent `mood_label`** in `mood_analyses` over the **last 7 days** (UTC). Ties are broken arbitrarily by iteration order. It is **not** the same as “dominant mood over a calendar week” or weighted by score.

5. **“Words this week”** — Sums `word_count` for entries whose **`created_at` falls in the last 7 UTC calendar days**, not necessarily “this local week” or “rolling 168 hours.”

6. **Consistency bar chart** — Bar heights reflect **entry counts per UTC day** (last 7 days), not a separate “consistency score” or streak segment like the Figma Make mock.

7. **Latest entry hero** — Left column is a **gradient placeholder**. The app does **not** extract a hero image from TipTap content or attachments for the card.

8. **`GET /api/entries` load** — The dashboard fetches **all entries** when not searching (existing pattern). For large journals this is **heavy**; there is **no pagination** or summary-only endpoint for dashboard widgets.

9. **Search** — Returns **all matches** with no limit or paging; large result sets can **slow the UI** and DOM.

10. **Greeting time-of-day** — “Good morning / afternoon / evening” is fixed at **first render** only; it does not update if the tab stays open across midnight.

11. **Streak copy vs. bars** — Streak numbers come from **server stats** (`loadDashboardStats`); bar data comes from the **client entries list**. They are consistent only if both see the same underlying data (they should, but two code paths).

12. **`DashboardStatsDisplay` / `DashboardStatsSkeleton`** — No longer used on the dashboard page; stats are inlined in `DashboardHome`. The module remains for reuse/tests but may drift.

---

## App shell (`SideNav`, `TopBar`)

13. **Notifications bell** — Not connected to a notification feed or real-time inbox; email prefs live under **Settings** only.

14. **Support link** — Points to a **generic external help URL** (Clerk), not in-app help or your product docs.

15. **“Weekly Digest” (top bar)** — Routes to **Settings**, not a digest preview or subscription management beyond toggles.

16. **“Time-Locked”** — Maps to **`/capsules`**; naming may confuse users who expect time-locked **journal entries** in one place.

17. **Capsules in sidebar** — **Not** in the Figma Make sidebar; discoverability relies on top bar + footer quick links.

18. **Dark mode** — Sanctuary tokens and surfaces are **tuned for light**; dark variants are **best-effort** and may not match future design specs.

---

## Analytics (`/analytics`, `AnalyticsDashboard`, `loadAnalyticsData`)

19. **Not a generative “AI report”** — The **blockquote** is the **latest analysis `summary`** in the selected window (truncated), not a newly generated narrative. **Insight bullets** are **heuristic** (dominant label %, best UTC weekday by average score, raw count).

20. **“Full AI report”** — Control is **disabled**; there is **no** export, email, or second-pass OpenAI flow behind it.

21. **Trajectory chart** — Plots **daily average `mood_analyses.score`** for days that have **at least one** analysis. Days with **no** analysis are **omitted** (line connects only existing points). Needs **≥ 2 days** with data to show a line.

22. **30D / 90D toggle** — Filters **client-side** from a server payload capped at **last 90 days** of analyses and entry day counts. Older history is **not** loaded.

23. **Daily distribution** — Percentages are **shares of analyses** in the window, **not** shares of calendar days. Up to **six** labels shown; the rest are omitted.

24. **Keyword / “dominant markers”** — **Word tags** are a naive **token count** on `summary` text (stopword-stripped) mixed with top **mood labels** — not NLP, not phrase-aware, and **not** the Figma mock’s poetic phrases unless they literally appear in summaries.

25. **Heatmap** — **28-day UTC** grid (**4×7**), **oldest → newest** left-to-right, top to bottom; **not** calendar-week aligned, so the grid does **not** match a conventional “week starts Monday” calendar.

26. **Heatmap data** — Cells use **`entries.created_at`** counts by UTC date — **independent** of whether a mood analysis exists that day (user can journal without analysis yet).

27. **“Entries this month”** — Uses **UTC month** boundaries from the same **90-day** `entryCountByDay` map — not the user’s local timezone.

28. **Performance** — Loader fetches **all** `mood_analyses` and **all** `entries` in the 90-day window with **no pagination**; large accounts may get **slow** responses and **heavy** JSON.

29. **Styling vs. Figma** — Layout follows the Make **bento** loosely; **chip under the chart** (e.g. “SEPT 9: Serene High”) and some **glass** treatments from the mock are **not** reproduced.

30. **Dashboard link** — “View trends” on the dashboard now lands on a **real** analytics page; the insight copy there is still high-level and may **overpromise** emotional insight.

---

## Entries archive (`/entries`, `EntryList`)

31. **No server pagination** — `GET /api/entries` still returns **all** matching rows (search uses FTS). **“Load more”** only reveals more cards from the **already-downloaded** array; it does **not** page the API.

32. **Mood badge** — Shows the **`mood_label` from the most recent `mood_analyses` row** for that entry (by `created_at` among returned rows). Multiple analyses per entry collapse to **one** tag; **no** history or score shown.

33. **Mood filter chips** — Only the **canonical** `MOOD_LABELS` list (`lib/mood/labels.ts`) appears as filters. If the DB ever contains a **non-canonical** label, it appears on the card but **cannot** be selected as its own filter (only under **All**).

34. **Disabled mood chips** — A mood button is **disabled** when **no** loaded entry currently has that label — you cannot select an “empty” filter to see zero results unless you first select it while entries exist.

35. **Sort** — **Recently updated** / **Oldest updated** sorts by **`entries.updated_at`** only; **created_at** is not offered.

36. **“Time-locked” overlay on cards** — PLAN §7.6 imagined a **frosted lock** on locked entries. **Journal entries are not lockable** in the schema; the **promo strip** explains **capsules** and links to **`/capsules`** instead of per-card overlays.

37. **Bento / card variety** — **Four** visual variants rotate by index; every **7th** visible card **spans two columns** on `md+`. This is a **heuristic**, not a 1:1 copy of the Figma Make archive.

38. **Mood load timing** — Until Clerk `isLoaded` and `session` are ready, the **`mood_analyses`** query is skipped; cards can appear **without** badges for a moment, then fill in (no skeleton per card).

39. **Performance** — Second request: **`mood_analyses`** with `.in('entry_id', …)` for **all** visible entry IDs after each entries fetch — can be **large** for big journals (two round trips, no batching cap).

40. **Entry detail styling** — **`/entries/[id]`** and **`/entries/[id]/edit`** still use **older** neutral/violet chrome; only the **list** page matches the Sanctuary archive shell.

---

## Journal composer (`/journal`, `EntryEditForm` presentation)

41. **Mood selector** — Radiant / Calm / etc. are **client-only highlight**; nothing is written to `entries` or sent to **`/api/analysis`** as a hint. Mood still comes from the analyzer after save / navigation.

42. **“Complete entry”** — Requires **at least one word** in the body (`wordCount > 0`). A **title-only** draft cannot be “completed” via this button (autosave still runs).

43. **Formatting toolbar** — Figma showed a **rich** floating bar; the journal skin only exposes **image insert** at the bottom of the editor card (same capability as the classic editor’s toolbar, fewer buttons).

44. **Toolbar position** — Bar sits at the **bottom of the editor card**, not **fixed to the viewport** (PLAN §7.5 “bottom of the screen” is only partially met).

45. **Dual editors** — **`/journal`** (Sanctuary layout) and **`/entries/[id]/edit`** (classic layout) edit the **same** entry model; users can cross-link (“Classic editor”). Risk of **divergent UX** over time.

46. **`/entries/new`** — **Server-redirects** to **`/journal`**; `sessionStorage` draft reuse is keyed from **`fetchOrReuseNewEntryId`** on the journal page (same as before, different entry URL).

47. **Time-lock card** — Does **not** lock the current journal entry; it **explains** capsules and links to **`/capsules/new`**. Broader product note: **entry-level** “open after date” is **not** implemented anywhere — only **time capsules** (`/capsules`).

48. **Prompt block** — Reuses **`WritingPromptCard`** (latest `prompt_suggestion` or default); duplicate **Supabase fetch** if the user also has the prompt on the dashboard in the same session.

---

## Typography & icons (Phase 7 plan)

49. **Material Symbols** — `PLAN.md` mentions Material Symbols; the Figma Make export and current shell use **inline SVG / Lucide-style icons**, not Material Symbols as a font.

---

## Auth & marketing

50. **Landing `/`** — Still default template content; **not** aligned with Sanctuary branding.

51. **Signed-in user on `/`** — No automatic redirect to `/dashboard`; may feel disjointed from the rest of the app.

---

## Responsive behavior

52. **§7.9 not done** — Sidebar hamburger, bottom sheet for dashboard widgets, collapsed toolbar, and breakpoints **375 / 768 / 1280** are **not** implemented for the new shell.

---

## Time capsules (`/capsules`, `/capsules/new`, `/capsules/[id]`)

53. **List polling** — While any capsule is **sealed**, the list **polls every 1s** to refresh countdown text; this stops when all visible items are opened. There is **no** visibility-based throttle.

54. **Detail polling** — A **sealed** capsule detail polls the clock every **1s** for the countdown. After `unlock_at` passes, the client **refetches** immediately and then every **2.5s** until the server returns `is_unlocked: true` (covers cron / slight skew).

55. **Timezone copy** — Unlock **datetime-local** uses the **browser timezone**; the server stores **UTC**. The UI states this on the new form but does **not** show the user’s IANA zone name.

56. **No edit after seal** — There is **no** UI or API to change title, body, or unlock time after create; mistakes require a new capsule (by design unless product changes).

57. **Empty body** — Sealing with an **empty** TipTap doc is allowed; opened capsules can show a **blank** read surface.

58. **Card overlay** — Sealed list cards use a **light gradient + backdrop blur** for a “frosted” hint; the **entire card** remains a link (overlay is `pointer-events-none`).

59. **Read-only editor** — Opened body still renders via **TipTap read-only** (same extensions as compose) rather than a static HTML export; very large docs inherit editor **bundle cost** on this page.

60. **404 vs invalid id** — Malformed `id` in `CapsuleDetail` shows **“Invalid capsule id”** without a round trip; UUID-shaped missing ids return **404** from the API.

---

## Settings (`/settings`)

61. **Account read-only** — Profile name and email are **Clerk-derived** (server `currentUser` + client `useUser`); there is **no** in-app profile edit. **UserButton** + large avatar are **two** account affordances (menu vs. visual identity).

62. **Weekly digest timezone** — Copy states **Sunday 08:00 UTC** to match `workers/weeklyDigest`; users in other zones see a **UTC-centric** send time, not local “Sunday morning.”

63. **PDF export dependencies** — UI mentions **Redis** and **`npm run worker`**; if either is missing, **Download PDF** fails or stalls — there is **no** live “worker healthy” indicator on the page.

64. **PDF polling** — Status is polled every **2s** until complete/failed; closing **Settings** unmounts the component and **stops** polling (in-flight job may still finish server-side).

65. **JSON export** — **GET** `/api/export/json` triggers a **full download** in the same tab flow; very large journals may be **slow** or hit platform limits with no progress UI.

66. **Theme control** — **`ThemeSegmentedControl`** is shared with the **top bar** and **marketing bar**; styling changes apply **everywhere**, not only Settings.

67. **Layout vs. Figma file** — The **two-column** page (**preferences + export** left, **journey stats** right on `lg+`) follows **`PLAN.md` §7.8** and dashboard **Sanctuary** patterns. For **pixel** or **structural** parity with *your* Figma frame, paste a **design link** including **`node-id`** so the frame can be compared directly.

68. **Journey stats duplication** — Sidebar numbers come from **`loadDashboardStats`** (same source as the dashboard stat tiles). Values should match **per request**; the UI **repeats** metrics in a second location.

69. **Mobile order** — Below **`lg`**, blocks stack as: **Account → Preferences → Data (export) → Journey stats**. A Figma mobile artboard may specify a different order.

---

## How to use this file

- When fixing an item, **remove or shorten** its bullet and optionally link the PR / commit.
- When adding UI that is still stubbed, **add a bullet** so QA and graders know what is intentional.
