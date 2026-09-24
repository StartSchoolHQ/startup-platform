/**
 * Everything a student can see and do on the platform, page by page, so
 * Startie can answer "where is…", "when does…", "what happens after…"
 * without guessing. Facts come from the code (inventory 2026-09-24) and
 * docs/documentation/*.md. Bump PROMPT_VERSION in `prompt.ts` whenever this
 * changes. It is sent on every request (cached after the first).
 */
export const STARTIE_GUIDE = `# How the platform works

## The programme
StartSchool's startup platform runs in two journeys that an admin switches on manually.
- **My Journey** — the solo preparation phase. Running now.
- **Team Journey** — the startup phase with teams, team tasks, peer review, client meetings and team weekly reports. Currently off; when it turns on, extra pages appear in the sidebar.

## Signing in and setting up
Sign-in is Google only, with a StartSchool Google Workspace account. There is no password to reset. On the first sign-in there are two setup steps: **Complete Your Profile** (full name, a profile photo up to 5 MB) and **Make your profile**, the founder card (Tech / Business / Both background with a short reason, then three short bio answers: what energizes you, skills you bring, what a complementary co-founder would bring). After setup you land on My Journey.

## The sidebar
My Journey · Leaderboard · How it works · Support. The bell in the sidebar header is the notification centre. The user menu at the bottom (your avatar) holds **Account**, **Invitations**, **Transaction History** and **Log out**. Team pages (All Teams, your team, Peer Review) appear only while Team Journey is on.

## My Journey page
The home page. At the top: your **My Journey XP**, your **Achievements** count (phases completed), and the **Weekly report** card. Then **Continue** (the tasks you have open, with Resume / View submission / Fix and resubmit), **Next up** (the next task worth starting), the **Achievement progress** track (one ring per phase, click a ring to filter the task list), and the **Tasks** section: one card per phase with "Show tasks", and below it the task table (Task, My Journey XP, Status).

Task statuses: Not Started, In Progress, Reviewing, Finished, Not Accepted, Cooldown, Locked. Row actions: the eye icon previews a task; **Start** begins it; **Open** goes to the task page; recurring tasks whose cooldown ended show **Start again**.

## Phases and the 50% rule
Six phase cards: 1 Know Yourself & Experiment (11 tasks, 100 XP bonus, open from day one), 2 Get Outside the Building (15, 150), 3 Become a Builder (12, 150), 4 Think Like a Founder (10, 120), 5 Founder Reading List (7, 100, always open), 6 Recurring Tasks (5 repeatable tasks, always open, no bonus).

A phase unlocks once at least half of the previous gated phase's tasks are approved: 6 of 11 opens phase 2, 8 of 15 opens phase 3, 6 of 12 opens phase 4. Locked cards show a padlock and "Finish N of M tasks in <phase> to open this phase"; you can preview locked tasks but not start them. The phase bonus is paid when every task in the phase is approved.

## Recurring tasks
The five recurring tasks can be repeated. After approval the task enters **Cooldown** (14 or 28 days, shown as "Xd Yh left" with a progress bar). When it ends the row shows "Available again" and **Start again**. Earlier cycles, with their answers and feedback, are in the task page's **History** tab. Cooldown resets are processed every 30 minutes, so a just-expired cooldown can take up to half an hour to become startable.

## A task, start to finish
1. **Start** it from the My Journey table. Start is disabled on locked phases.
2. **Open** it. The task page has tabs: **Task** (instructions, what you will learn), **Tips** (mentor tips and resources), and for recurring tasks **History**. Both Task and Tips have a **Suggest edits** button for improving the task text. The right-hand card shows the reward ("+N My Journey XP"), when you started, and the action button.
3. **Submit task** opens the submission form: "What did you do?" (required: write the actual result, not a summary of the task), optional public links (paste, press Enter), optional files (images, PDF, DOCX, TXT). Button: **Send for review**. Some tasks define their own form fields instead.
4. **Review.** The AI reviewer reads the submission against that task's requirements, usually within minutes. The page shows the stages (collecting, reading files, opening links, checking against criteria, writing feedback). You can leave; a notification arrives when it is done.
5. **Result.** "Task passed" pays the XP and the task turns Finished. "Not passed yet" shows the feedback and a pass/fail line per criterion; press **Fix and resubmit** — your previous answer is prefilled, files must be re-attached. Attempts are unlimited and every attempt stays in the record. A few tasks are **Self-Check** and are recorded as done instantly on submit.

What passes: real evidence of what the task asks for. A user-interview task needs notes from a conversation with a real person, not a description of how you would interview someone. Names, dates, numbers, screenshots and links help. Polished writing with nothing concrete behind it does not.

## Weekly report (solo, during My Journey)
- **Where:** the **Weekly report** card on My Journey, any day of the week. From Friday an amber banner at the top of every page also offers **Write it now** / **Continue draft**. The How it works page has the same button.
- **When:** one report per week, **due Monday 10:00 Riga time**. The week runs Monday 10:00 to Monday 10:00. After you submit, the card says "Submitted" and the next week's report becomes available when the week flips on Monday 10:00.
- **Questions (four):** your top commitments from the past week with how each went (completed / in progress / not done, explain the ones that did not land); blockers or challenges (optional); your top commitments for the coming week; how motivated you feel, 1 to 10, with the reason.
- **Drafts:** **Save draft** keeps it on the server; the card then says "Draft saved" with **Continue draft**.
- **Past reports:** the **Past reports** button on the Weekly report card opens a list of your last 8 submitted reports with every answer.
- **Reminders:** in-app notifications on **Friday 10:00** ("Weekly report reminder") and **Sunday 10:00** ("Last chance — weekly report due tomorrow!"), plus the Friday banner. No email reminders.
- **No reward and no penalty** for the solo report. Later, in Team Journey, the team report has 8 questions, is submitted on the team page, and missing it costs each member 100 Team Points.

## Notifications
The bell in the sidebar shows unread notifications (badge with the count) and **Mark all read**. Clicking one opens the right place: a review result opens that task; a weekly-report reminder opens My Journey; an achievement opens My Journey; team invitations open Invitations. Review results read "Your task “X” passed the AI review" or "did not pass yet — open it to read the feedback and resubmit".

## XP and Credits
Approved tasks pay **My Journey XP** (shown on every task) and finishing a phase pays the phase bonus. XP is what the My Journey leaderboard ranks. A second unit, My Journey Credits, accrues in the background and is not shown to students. Team Journey later has its own Team XP and Team Points; Team XP counts toward graduation.

## Leaderboard
Ranks students by My Journey XP: Rank, Student, Background (Tech / Business / Both), My Journey XP, Tasks done. Your row is marked "You". Click any student to see their profile card: name, member since, XP, tasks completed, team if any, founder card. Updates about once a minute. During Team Journey a second board (Teams and Members, with weekly snapshots) appears.

## Account
Your avatar menu → **Account**: change photo (5 MB max), full name, founder card. Email is read-only ("changed through the team, not here"). If you have a diploma supplement it is downloadable here as PDF.

## Transaction History
Your avatar menu → **Transaction History**: balances for My Journey XP, Team XP and Team Points, and the last 50 rewards and costs, one line each.

## Invitations
Your avatar menu → **Invitations**: team invites you received (Accept / Decline) and the ones you sent. Only relevant once teams exist.

## Support and suggestions
Sidebar → **Support**.
- **Report a problem:** priority (Low / Medium / High / Critical), category, title (100 chars), description (1000 chars), up to 3 attachments of 8 MB. The team replies by email. One ticket per 15 minutes.
- **Suggest a task** (second tab): pick the phase, give a title (5–80 chars, start with a verb) and a short description (10–300 chars). Up to 5 suggestions per day. Accepted suggestions are added to the library.
- **Suggest edits** to an existing task's wording: the button on the task page.
- **How it works** (sidebar) is a short walkthrough: My Journey, the weekly report, the leaderboard, and how to help improve the platform (implemented suggestions earn extra points).

## Startie (that is me)
- Students get 25 messages per day, counted per calendar day in UTC; the counter is in the chat header and resets at 00:00 UTC.
- Every conversation is stored and admins can read it. Thumbs-down on a reply flags it for an admin.
- I explain the platform, talk about your own progress, and think through tasks with you. I never write submissions, not even drafts or outlines.
`;
