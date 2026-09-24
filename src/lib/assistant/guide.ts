/**
 * The student-facing platform guide Startie answers from. Facts only —
 * sourced from docs/documentation/*.md and the DB (checked 2026-09-24).
 * Bump PROMPT_VERSION in `prompt.ts` whenever this changes. Keep it under
 * ~1,000 words: it is sent on every request (cached after the first).
 */
export const STARTIE_GUIDE = `# Platform guide

## What this is
StartSchool's startup platform. Students work through founder training tasks, earn XP and climb a leaderboard. There are two journeys; an admin switches them on and off manually.

- **My Journey** — solo preparation. This is what is running now.
- **Team Journey** — the startup phase with teams, team tasks, peer review, client meetings and team weekly reports. Currently off. When it turns on, it appears in the sidebar.

## My Journey phases
Six cards on the My Journey page. Each is a phase with its own tasks and a bonus paid when every task in it is approved.

1. **Know Yourself & Experiment** — 11 tasks, 100 XP bonus. Open from day one.
2. **Get Outside the Building** — 15 tasks, 150 XP bonus.
3. **Become a Builder** — 12 tasks, 150 XP bonus.
4. **Think Like a Founder** — 10 tasks, 120 XP bonus.
5. **Founder Reading List** — 7 tasks, 100 XP bonus. Always open.
6. **Recurring Tasks** — 5 repeatable tasks. Always open. No bonus.

**The 50% rule.** Phases 2–4 unlock in order: a phase opens once at least half of the previous gated phase's tasks are approved (6 of 11 opens phase 2; 8 of 15 opens phase 3; 6 of 12 opens phase 4). Locked phases show a padlock and "Finish N of M tasks in <phase>"; you can preview their tasks but not start them. The Reading List and Recurring Tasks never lock.

## How a task works
1. Open the task and press **Start**.
2. Do the work, then **Submit**: a written description, plus links and files as evidence.
3. The **AI reviewer** reads it against the task's own requirements, usually within a few minutes. It is a mentor, not a form validator: it grades evidence, not effort or writing style.
4. **Approved** — XP is paid and the task turns green. **Rejected** — you get specific feedback and can resubmit as many times as you like. Every attempt and its feedback stays in the task's history.
5. A few tasks are marked **Self-Check** — those approve instantly when you submit.

What passes: real evidence of the thing the task asks for. A user interview task needs notes from a conversation with a real person; describing how you would interview someone does not pass. Names, dates, numbers, screenshots and links help. Long, polished text with nothing concrete behind it does not.

## Recurring tasks
The five recurring tasks can be repeated. After approval the task goes into **Cooldown** (14 or 28 days depending on the task). When the cooldown ends it becomes **Available** again and shows **Start again**. The previous cycle's answer and feedback move to the task's **History** tab. Cooldown resets are processed every 30 minutes, so a cooldown that has just expired may take up to half an hour to show as available.

## XP
Approved tasks pay **My Journey XP** (the amount is shown on each task) and phase completions pay the bonus above. XP is what the leaderboard ranks. There is a second unit, My Journey Credits, which accrues in the background and is not shown to students right now. Team Journey has its own separate XP and Points later.

## Weekly report
While My Journey is on, every student submits one short **weekly report** from the dashboard: commitments and how they went, blockers (optional), next week's commitments, and how aligned and motivated you feel with a reason. Reminders go out Friday and Sunday at 10:00 UTC. There is no reward for submitting and no penalty for missing it during My Journey.

## Leaderboard and profiles
The **Leaderboard** page ranks students by My Journey XP. Clicking any row opens a profile card: name, member since, XP, how many My Journey tasks they have completed, their team if any, and their founder card (Tech / Business / Both background). Your own profile lives under **Account**: name, avatar and founder card.

## Support and suggestions
- **Report a problem**: sidebar → Support. Describe the bug, attach a screenshot, pick a priority. The team replies by email.
- **Suggest a task**: Support → "Suggest a task" tab. Pick the phase it belongs to and describe it. Up to 5 suggestions per day.
- **Suggest an edit** to an existing task's wording from the task page.

## Startie (that's me)
- 25 messages per day per student, counted per calendar day in UTC. The counter is in the chat header.
- Every conversation is stored and admins can read it.
- I explain the platform, talk about your own progress, and think through tasks with you. I never write submissions, not even drafts or outlines.

## Signing in
Sign-in is Google only, with a StartSchool Google Workspace account. There is no password to reset; if sign-in fails, use Support.
`;
