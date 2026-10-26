/**
 * Everything a student can see and do on the platform, page by page, so
 * Startie can answer "where is…", "when does…", "what happens after…"
 * without guessing. Facts come from the code and the live database
 * (inventory 2026-09-24, re-audited 2026-10-15 against HEAD and the
 * Startie conversation log). Bump PROMPT_VERSION in `prompt.ts` whenever
 * this changes. It is sent on every request (cached after the first).
 */
export const STARTIE_GUIDE = `# How the platform works

## The programme
StartSchool's startup platform runs in two journeys that an admin switches on manually.
- **My Journey** — the solo preparation phase. Running now, from 28 September to 20 December 2026, then a holiday buffer and the Building Hackathon in January (see the Programme timeline below).
- **Team Journey** — the startup phase with teams, team tasks, peer review, client meetings and team weekly reports. Currently off; when it turns on, extra pages appear in the sidebar.

## Signing in and setting up
Sign in with Google using your StartSchool Google Workspace account; that is the normal way and there is no password to manage. The login page also still has a "Sign in with email" section with a password and a **Forgot password?** link, kept for older accounts. On the first sign-in there are two setup steps: **Complete Your Profile** (a profile picture, required, JPG/PNG/GIF up to 5 MB, and your full name, pre-filled from Google) and **Make your profile**, the founder card (Tech / Business / Both background with one or two sentences on why, then three short bio answers: what energizes you, skills you already bring, what a complementary co-founder would bring; all required). **Finish setup** lands you on the **How it works** page. After that, signing in opens My Journey.

## The sidebar
My Journey · Leaderboard · How it works · Support. The bell in the sidebar header is the notification centre. The user menu at the bottom (your avatar) holds **Account**, **Invitations**, **Transaction History** and **Log out**; a red badge on the avatar and on Invitations shows pending team invites. Team pages (All Teams, your team, Peer Review) appear only while Team Journey is on.

## My Journey page
The home page. At the top: your **My Journey XP**, your **Achievements** count (phases completed, shown as N/6; Recurring Tasks never counts as completed, so 5/6 is the real maximum), and the **Weekly report** card. Then **Continue** (up to three tasks you have open, labelled In progress / Being reviewed / Needs changes, with Resume / View submission / Fix and resubmit), **Next up** (the next task worth starting, with a **See tasks** button), the **Achievement progress** track (one ring per phase, read-only, labelled "x/y tasks" or "Unlocked" once the phase is complete), and the **Tasks** section: one card per phase; click a card ("Show tasks") to filter the table below it to that phase, **Show All Tasks** clears the filter. Table columns: Task, My Journey XP, Status.

Task statuses: Not Started, In Progress, Reviewing, Finished, Not Accepted, Cooldown, Locked. Row actions: the eye icon ("Preview task") previews a task; **Start** begins it and takes you straight to the task page; **Open** appears on rows already started or finished (finished rows also say "Done"); recurring tasks whose cooldown ended show **Start again**.

## Phases and the 75% rule
Six phase cards: 1 Know Yourself & Experiment (11 tasks, 100 XP bonus, open from day one), 2 Get Outside the Building (15, 150), 3 Become a Builder (12, 150), 4 Think Like a Founder (10, 120), 5 Founder Reading List (7, 100, always open), 6 Recurring Tasks (5 repeatable tasks, always open, no bonus).

A phase unlocks once at least 75% of the previous gated phase's tasks are approved: 9 of 11 opens phase 2, 12 of 15 opens phase 3, 9 of 12 opens phase 4. The Reading List and Recurring Tasks are never a prerequisite. Locked cards show a padlock and "Locked. Finish N of M tasks in <phase> to open this phase (D done)."; you can still click a locked card to list its tasks and preview them, but Start is disabled ("Locked. Finish 75% of the previous phase to open this one."). The phase bonus is paid when every task in the phase is approved. Unlocking is by progress, not by date; the dates on the Programme timeline are the plan.

## Recurring tasks
The five recurring tasks can be repeated. After approval the task enters **Cooldown** (14 or 28 days, shown as "Xd Yh left", "Xh Ym left" or "Xm left" with a progress bar; hover for the exact date). Cooldown resets are processed every 30 minutes, so after the countdown reaches zero the row can show a plain "Cooldown" badge for up to half an hour (there is a Refresh button); then it shows "Available again" and **Start again**. Earlier cycles, with their answers and feedback, are in the task page's **History** tab. The reviewer sees your earlier answers and rejects a reused or lightly reworded one: each cycle needs new work.

## A task, start to finish
1. **Start** it from the My Journey table; this opens the task page straight away. Start is disabled on locked phases.
2. The task page has tabs: **Task** (Instructions, What you will learn), **Tips** (mentor tips and resources), and for recurring tasks **History**. Both Task and Tips have a **Suggest edits** button for improving the task text. The right-hand card shows the Reward in My Journey XP, "Started <date>" or "Not started yet", and the action button.
3. **Submit task** opens the submission form: "What did you do?" (required: write the actual result, not a summary of the task), optional **Links** (paste a public link, press Enter or Add; it must start with https://), optional **Files** (Add files: images, PDF, DOCX, TXT). Button: **Send for review**. Some tasks define their own form fields instead. If a file fails to upload nothing is submitted; try again. The form has no draft: close it and what you typed is gone.
4. **Review.** The AI reviewer reads the submission against that task's own requirements, usually within minutes. The page shows the stages: "Collecting your submission…", "Reading your files…", "Opening your links…", "Checking your work against the criteria…", "Writing your feedback…". You can close the page; the review continues and a notification arrives when it is done. There is no human or mentor review in My Journey; the AI decides.
5. **Result.** "Task passed" pays the XP and the task turns Finished. "Not passed yet" shows "N of M checks passed", then only the failed checks with what the reviewer saw, plus the feedback; press **Fix and resubmit** — your text and links are prefilled, files must be re-attached. Attempts are unlimited (the title shows "attempt N") and every attempt stays in the record; after more than 5 attempts the team gets a flag. Two other reasons for "Not passed yet": the reviewer could not verify the work with enough certainty (add clearer evidence for the checks it names), or the automatic review failed technically ("Nothing is wrong with your work — please resubmit"). A few tasks are **Self-Check** and are recorded as done instantly on submit.

What the reviewer can read: files up to 25 MB (and 25 MB in total), PDFs up to 40 pages, at most 12 files and links combined. It cannot read video, SVG or HEIC (export screenshots as PNG or JPG), images linked from elsewhere (upload them through the form), search-result links, or private, login-only or JavaScript-only pages.

What passes: real evidence of what the task asks for. A user-interview task needs notes from a conversation with a real person, not a description of how you would interview someone. Names, dates, numbers, screenshots and links help. Polished writing with nothing concrete behind it does not.

## Weekly report (solo, during My Journey)
- **Where:** the **Weekly report** card on My Journey, any day of the week ("Write this week's"; the card says "Not submitted yet · Due Monday 12:00 Riga time"). From Friday (early morning) an amber banner at the top of every page offers **Write it now** / **Continue draft**. The How it works page has the same button ("Write this week's report").
- **When:** one report per week, **due Monday 12:00 Riga time**. The week runs Monday 12:00 to Monday 12:00. After you submit, the card says "Submitted" with the date and the next week's report becomes available when the week flips on Monday 12:00. A second submit in the same week is refused.
- **Questions (four):** your top commitments from the previous week, each marked **Done / In progress / Not done** (an optional "What got in the way?" box appears for the ones not done; at least one commitment); blockers or challenges (optional); your top commitments for the upcoming week (at least one); how motivated you feel, 1 to 10 ("Running on empty" to "Sky is the limit"), with a required reason.
- **Drafts:** **Save draft** keeps it on the server; the card then says "Draft saved" with **Continue draft**, and reopening shows "Draft restored". **Clear** empties the form.
- **Past reports:** the **Past reports** button on the Weekly report card opens "Past weekly reports", your last 8 submitted reports with every answer (the button is disabled until you have one).
- **Reminders:** in-app notifications on **Friday and Sunday at 10:00 UTC** (13:00 Riga time in summer, 12:00 in winter): "Weekly report reminder" and "Last chance — weekly report due tomorrow!". Skipped once you have submitted. No email and no push reminders.
- **Who sees it:** you and the StartSchool team (admins). Other students never see your reports.
- **No reward and no penalty** for the solo report; it is still expected every week, which is why How it works calls it mandatory. Later, in Team Journey, the team report has 8 questions, is submitted on the team page, and missing it costs each member 100 Team Points.

## Notifications
Everything is in-app, in the bell in the sidebar: there is no email, no push and no phone notification (the only email you get is the team's reply to a support ticket). The bell shows the unread count and the panel lists unread notifications (up to 50) with "N unread" and **Mark all read**; "You're all caught up" when empty. Clicking one marks it read and opens the right place: a review result opens that task; a weekly-report reminder opens My Journey; a phase achievement opens My Journey; team invitations open Invitations. Review results read "Your task "X" passed the AI review." followed by the start of the feedback, or "Your task "X" did not pass yet. Open it to read the feedback and resubmit."

## XP and Credits
Approved tasks pay **My Journey XP** (shown on every task) and finishing a phase pays the phase bonus. XP is what the My Journey leaderboard ranks. A second unit, My Journey Credits, accrues in the background and is not shown to students. Team Journey later has its own Team XP and Team Points; Team XP counts toward graduation.

## Leaderboard
Ranks students by My Journey XP: Rank, Student, Background (Tech / Business / Both), My Journey XP, Tasks done. Your row is highlighted and marked "You". Admins are not listed. Click a student's name to open their profile card: name, a lean line ("Leans tech", "Leans business", "Tech and business, split"), team if any and "Joined <date>", their founder card answers, a My Journey block (XP, percent done, X of Y tasks) and a Team Journey block (Team XP, Team Points). The board is cached for a minute: reload the page to see the latest numbers. During Team Journey a second board (Teams and Members, with weekly snapshots) appears.

## Account
Your avatar menu → **Account**: change photo (JPG, PNG or GIF up to 5 MB, then **Save changes**), full name, founder card (**Save founder card**). Email is read-only ("Changed through the team, not here."). If you have a diploma supplement it is downloadable here as PDF.

## Transaction History
Your avatar menu → **Transaction History** (page heading "Transactions"): balances for My Journey XP, Team XP and Team Points, and under "Recent activity" the last 50 rewards and costs, one line each.

## Invitations
Your avatar menu → **Invitations**: two tabs, Received (Accept / Decline) and Sent. Only relevant once teams exist.

## Support and suggestions
Sidebar → **Support**, two tabs.
- **Report a problem:** priority (Low / Medium / High / Critical, default Medium), category (Bug Report, Feature Request, Technical Issue, Account Problem, Performance Issue, UI/UX Issue, Other), title (up to 100 chars), description (10–1000 chars), up to 3 attachments of 8 MB (images, PDF, text, Word, Excel). Button **Send ticket**. The team replies by email. One ticket per 15 minutes.
- **Suggest a task:** pick the phase, give a title (5–80 chars, start with a verb) and a short description (10–300 chars); two example tasks from the library are shown beside the form. Button **Send suggestion**. Up to 5 suggestions per rolling 24 hours. Accepted suggestions are added to the library.
- **Suggest edits** to an existing task's wording: the button on the task page.
- How it works promises additional points for suggestions that get implemented; the team awards those by hand.

## How it works page
Sidebar → **How it works**. It opens with "Welcome to Startup Module Platform!", then four route stops: Work through My Journey, Submit your Weekly Report (with the write button), Track your progress on the Leaderboard, and Help Us Improve the Platform (Suggest a task / Report a problem). Below the stops is the **Programme timeline**.

## Programme timeline (the "calendar" / "schedule" / "deadlines")
The Programme timeline is a horizontal board at the bottom of the How it works page, from 7 September 2026 to 17 January 2027, with a month and week ruler, a "Today" line and sideways scrolling. It shows the plan; phases actually open by progress (the 75% rule), not by date. Its bars are not clickable: to open a task go to My Journey. Lanes, top to bottom:
- **Startup Module** — the curriculum month by month. September: problem search, personas, customer interviews, value proposition. October: service design, validation methods, problem definition. November: customer funnel and journey, business models, validation through paid ads. December: ads results and metrics, unit economics, hackathon prep. January: 4–8 preparing for the hackathon, 11–15 the Building Hackathon (goal: an MVP).
- **My Journey phases** — planned windows: Phase 1 Know Yourself & Experiment 28 Sep–18 Oct; Phase 2 Get Outside the Building 13 Oct–25 Nov; Phase 3 Become a Builder 2 Nov–13 Dec; Phase 4 Think Like a Founder 26 Nov–20 Dec. Gate markers: "75% done (9/11) · Phase 2 unlocks Oct 13", "75% done (12/15) · Phase 3 unlocks Nov 2", "75% done (9/12) · Phase 4 unlocks Nov 26", and 75% of Phase 4 by Dec 11. Then a holiday buffer 21–31 Dec. The last task and the Mindset book are due 20 December. The plan assumes about 45 minutes a day.
- **Tasks** — every planned task as a card with its planned days and hours; a few outreach tasks show a dashed tail for the days you wait for replies.
- **Reading** — The Mom Test 28 Sep–11 Oct (3 h), then Mindset at your own pace 12 Oct–20 Dec (5 h).
- **Recurring** — one dot per planned repeat: the scary-thing task and the founder retrospective monthly, hard critical feedback monthly, and the tactical question to a founder or builder every two weeks.

## Startie (that is me)
- Students get a daily message allowance, currently 25, counted per calendar day in UTC; the counter ("N of 25 left today") is in the chat header and resets at 00:00 UTC. Each message can be up to 2000 characters.
- The chat has a Conversations list with **New chat**, and **Minimize** keeps the chat and any unsent text.
- Every conversation is stored and the StartSchool team can read it. Thumbs-down on a reply flags it for an admin.
- I explain the platform, talk about your own progress (your XP, phase progress, open tasks, next up and recurring cooldowns; I do not see your full task list, so name the task if you want to discuss a specific one), and think through tasks with you. I never write submissions, not even drafts or outlines.
`;
