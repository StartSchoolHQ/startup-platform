/**
 * What's new: the student-facing changelog. Big updates only; a fix that
 * nobody would notice does not belong here. Newest first. Adding an entry
 * is one commit; the nav dot lights up for everyone who has not opened the
 * page since `CHANGELOG_LATEST`.
 *
 * Every entry says two things: what changed, and what it means for the
 * student. Write both from the student's side.
 */

export type ChangelogArea =
  "My Journey" | "Reviewer" | "Startie" | "Reports" | "Account" | "Platform";

export interface ChangelogEntry {
  /** ISO date, yyyy-mm-dd. */
  date: string;
  area: ChangelogArea;
  title: string;
  /** What changed, one or two sentences. */
  summary: string;
  /** What it means for the student: what to expect, what to do. */
  impact: string;
  /** Optional in-app link the entry points at. */
  link?: { label: string; href: string };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-30",
    area: "Reports",
    title: "Weekly report reminders by email",
    summary:
      "The Friday and Sunday reminders now also arrive in your startschool.org inbox, not only in the bell.",
    impact:
      "If this week's report is still open you get an email on Friday and a last one on Sunday. Submit it and the Sunday mail stays away. The mails are automatic, no need to reply.",
    link: { label: "Open My Journey", href: "/dashboard/my-journey" },
  },
  {
    date: "2026-10-29",
    area: "Platform",
    title: "Your answers save themselves",
    summary:
      "Task submissions and weekly reports autosave to your account a couple of seconds after you stop typing.",
    impact:
      "Close the tab, switch laptops, come back a day later: your text and links are where you left them. Files still need re-attaching before you submit.",
  },
  {
    date: "2026-10-26",
    area: "Reviewer",
    title: "Resubmitting a recurring task is no longer called a repeat",
    summary:
      "The reviewer used to compare your fix with your own rejected attempt and reject it again as a repeat. It now only looks at entries from earlier months that were approved.",
    impact:
      "If a monthly retrospective or a scary-thing entry was rejected for repeating a previous submission, resubmit it. It is judged on what you wrote now.",
  },
  {
    date: "2026-10-26",
    area: "Reports",
    title: "Solo weekly report due Monday 12:00",
    summary:
      "The My Journey weekly report closes at 12:00 Riga time on Monday instead of 10:00.",
    impact:
      "Two more hours on Monday morning. The new week opens the moment the old one closes, and the form stays open all week.",
  },
  {
    date: "2026-10-16",
    area: "Reviewer",
    title: "Reading tasks are judged on substance",
    summary:
      'The reviewer no longer looks for the literal words "I read the whole book". A reflection that clearly draws on the book is enough.',
    impact:
      "If a reading task was rejected only for missing that sentence, resubmit the same text. A summary or a video instead of the book still does not count.",
  },
  {
    date: "2026-10-09",
    area: "My Journey",
    title: "The next phase opens at 75%",
    summary:
      "A phase unlocks when three quarters of the previous phase is approved. It used to be half.",
    impact:
      "9 of 11 tasks approved opens phase 2, 12 of 15 opens phase 3, 9 of 12 opens phase 4. Tasks you had already started in a phase keep working.",
  },
  {
    date: "2026-09-30",
    area: "My Journey",
    title: "Where to get each book",
    summary:
      "Every reading task now lists where to borrow or buy the book under Tips & resources.",
    impact:
      "Library, Libby, Internet Archive and bookshop links per book. No more hunting.",
  },
  {
    date: "2026-09-24",
    area: "Startie",
    title: "Meet Startie",
    summary:
      "A chat assistant in the bottom corner of the dashboard. It knows the programme, your tasks and your deadlines.",
    impact:
      "Ask it where you stand, what is next, or what a failed reviewer check means. It asks questions back rather than doing the task for you. Up to 25 messages a day, and the StartSchool team can read the conversations.",
  },
  {
    date: "2026-09-23",
    area: "Platform",
    title: "Support moved into the platform",
    summary:
      "Report a problem or suggest a task from the Support page. The Discord form is gone.",
    impact:
      "Attach a screenshot, pick a priority, and the team answers by email. Task ideas go through the same page, up to five a day.",
    link: { label: "Open Support", href: "/dashboard/support" },
  },
  {
    date: "2026-09-16",
    area: "My Journey",
    title: "Recurring tasks have their own card",
    summary:
      "The five recurring tasks, such as the monthly retrospective, moved out of the phases into an always-open Recurring Tasks card with a History tab.",
    impact:
      "After an approval the task cools down for 14 or 28 days and then shows Start again. Every past cycle, with its feedback, stays visible in History.",
  },
  {
    date: "2026-09-15",
    area: "Account",
    title: "Google sign-in, founder card, profile cards",
    summary:
      "Sign in with your startschool.org Google account. Profile setup asks for a short founder card. Any leaderboard row opens a profile card.",
    impact:
      "No more passwords or invite links. Fill in your founder card once, then see who you are competing with and what they bring.",
  },
  {
    date: "2026-09-10",
    area: "My Journey",
    title: "My Journey is live",
    summary:
      "62 solo tasks in phases, from founder mindset to customer discovery, each reviewed by the AI reviewer within a minute of submitting.",
    impact:
      "This is where the programme starts. Work through phase 1, read the reviewer's feedback on every attempt, and watch your XP on the leaderboard.",
    link: { label: "Open My Journey", href: "/dashboard/my-journey" },
  },
];

/** Date of the newest entry; the nav dot compares against this. */
export const CHANGELOG_LATEST = CHANGELOG[0]?.date ?? "1970-01-01";

export interface ChangelogMonth {
  /** "October 2026" */
  label: string;
  entries: ChangelogEntry[];
}

const MONTH = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Groups entries by month, keeping the array order (newest first). */
export function groupChangelogByMonth(
  entries: ChangelogEntry[] = CHANGELOG
): ChangelogMonth[] {
  const months: ChangelogMonth[] = [];
  for (const entry of entries) {
    const label = MONTH.format(new Date(`${entry.date}T00:00:00Z`));
    const last = months[months.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else months.push({ label, entries: [entry] });
  }
  return months;
}
