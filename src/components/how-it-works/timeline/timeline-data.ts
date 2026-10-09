/**
 * Static content of the programme timeline board (Sep 2026–Jan 2027).
 * Dates are the planned windows from the programme board of 2026-10-09;
 * task titles match the `tasks` table. Phases open by progress in the app,
 * not by date — the board shows the plan, the gate copy shows the rule.
 * Next batch: edit the dates here.
 */

export interface CurriculumMonth {
  /** Calendar month, 1–12. */
  month: number;
  label: string;
  goals: string[];
  topics: string[];
}

export interface Phase {
  number: 1 | 2 | 3 | 4;
  name: string;
  start: string;
  end: string;
  taskCount: number;
  /** How the app opens this phase (the previous phase's gate). */
  opensAt?: string;
}

export interface TimelineTask {
  phase: Phase["number"];
  title: string;
  start: string;
  end: string;
  hours: number;
  /** Books: read at your own pace, so the bar runs past the phase window. */
  reading?: boolean;
  /** Work is done by `end`; replies or results are waited for until here. */
  waitsUntil?: string;
}

export interface Reading {
  title: string;
  start: string;
  end: string;
  hours: number;
}

export interface Recurring {
  title: string;
  cadence: string;
  hours: number;
  dates: string[];
}

export interface Milestone {
  label: string;
  start: string;
  end: string;
}

export const CURRICULUM_MONTHS: CurriculumMonth[] = [
  {
    month: 9,
    label: "Sep",
    goals: [
      "Turn rough ideas into a product hypothesis",
      "Validate early assumptions with your ICP",
    ],
    topics: [
      "Problem search",
      "Personas",
      "Customer interviews",
      "Value proposition",
      "Data validation",
    ],
  },
  {
    month: 10,
    label: "Oct",
    goals: [
      "Introduce a framework to build high-performing teams",
      "Design the full product service",
      "Get comfortable with different validation methods",
    ],
    topics: [
      "Service design",
      "Different validation methods",
      "Problem definition",
    ],
  },
  {
    month: 11,
    label: "Nov",
    goals: [
      "Build your funnel assumptions",
      "Launch an ads validation campaign",
    ],
    topics: [
      "Building a customer funnel",
      "Customer journey",
      "Business models",
      "Validation through paid ads",
    ],
  },
  {
    month: 12,
    label: "Dec",
    goals: [
      "Read the validation results and decide go / pivot / stop",
      "Prepare for the January hackathon",
    ],
    topics: [
      "Ads campaign results & metrics",
      "Unit economics",
      "Hackathon prep: clear team structure and roles",
      "Hackathon prep: validated assumptions about the idea",
    ],
  },
  {
    month: 1,
    label: "Jan",
    goals: ["MVP built in the Building Hackathon"],
    topics: [
      "Jan 4–8: preparing for the hackathon",
      "Jan 11–15: Building Hackathon, goal MVP",
    ],
  },
];

export const PHASES: Phase[] = [
  {
    number: 1,
    name: "Know yourself & experiment",
    start: "2026-09-28",
    end: "2026-10-18",
    taskCount: 11,
  },
  {
    number: 2,
    name: "Get outside the building",
    start: "2026-10-13",
    end: "2026-11-25",
    taskCount: 15,
    opensAt: "Opens at 9 of 11 Phase 1 tasks approved (75%)",
  },
  {
    number: 3,
    name: "Become a builder",
    start: "2026-11-02",
    end: "2026-12-13",
    taskCount: 12,
    opensAt: "Opens at 12 of 15 Phase 2 tasks approved (75%)",
  },
  {
    number: 4,
    name: "Think like a founder",
    start: "2026-11-26",
    end: "2026-12-20",
    taskCount: 10,
    opensAt: "Opens at 9 of 12 Phase 3 tasks approved (75%)",
  },
];

/** Deadline for the Phase 1 books and the last task; the buffer follows. */
export const READING_DEADLINE = "2026-12-20";

export const HOLIDAY_BUFFER: Milestone = {
  label: "Holiday buffer",
  start: "2026-12-21",
  end: "2026-12-31",
};

/** January: a prep week, then the Building Hackathon week. */
// prettier-ignore
export const HACKATHON: Milestone[] = [
  { label: "Preparing for the hackathon", start: "2027-01-04", end: "2027-01-08" },
  { label: "Building Hackathon, goal MVP", start: "2027-01-11", end: "2027-01-15" },
];

const t = (
  phase: Phase["number"],
  title: string,
  start: string,
  end: string,
  hours: number,
  extra: Pick<TimelineTask, "reading" | "waitsUntil"> = {}
): TimelineTask => ({ phase, title, start, end, hours, ...extra });

const READ = { reading: true };
const waits = (waitsUntil: string) => ({ waitsUntil });

// prettier-ignore
export const TASKS: TimelineTask[] = [
  // Phase 1
  t(1, "Read The Mom Test Book", "2026-09-28", READING_DEADLINE, 3, READ),
  t(1, "Watch a grit/resilience primer and recall your own moment", "2026-09-29", "2026-09-29", 0.5),
  t(1, "Write about a time you failed and what it taught you", "2026-09-29", "2026-09-29", 0.5),
  t(1, "Read Mindset: The New Psychology of Success", "2026-10-05", READING_DEADLINE, 5, READ),
  t(1, "List three problems you've personally felt strongly about", "2026-10-05", "2026-10-05", 0.5),
  t(1, "Write a one-sentence problem statement without mentioning a solution", "2026-10-05", "2026-10-06", 0.25),
  t(1, "Practice the 5 Whys on a problem you care about", "2026-10-06", "2026-10-06", 0.5),
  t(1, "Turn your unfair advantages into startup problems", "2026-10-06", "2026-10-08", 1.5),
  t(1, "Ask 3 past collaborators what you should improve before co-founding with you", "2026-10-08", "2026-10-10", 1, waits("2026-10-16")),
  t(1, "Run a self-timed 2-hour sprint from idea to shareable link", "2026-10-10", "2026-10-13", 2),
  t(1, "Vibe-code one tiny tool that fixes a personal annoyance", "2026-10-16", "2026-10-18", 2),
  // Phase 2
  t(2, "Get to know someone tackling a similar problem", "2026-10-13", "2026-10-14", 1),
  t(2, "Look at market trends and rules, and find three surprises", "2026-10-14", "2026-10-16", 1),
  t(2, "Surface an underserved need from outside your usual circle", "2026-10-18", "2026-10-20", 1),
  t(2, "Cold-message 5 potential users you don't know", "2026-10-20", "2026-10-21", 1, waits("2026-10-27")),
  t(2, "Find evidence that your idea is wrong", "2026-10-21", "2026-10-23", 1.5, waits("2026-10-28")),
  t(2, "Run a 3-conversation Mom-Test sequence on one problem", "2026-10-23", "2026-10-26", 2, waits("2026-11-02")),
  t(2, "Get one stranger onto a 15-minute user interview", "2026-10-26", "2026-10-28", 1, waits("2026-11-02")),
  t(2, "Find out what budget the problem already comes from", "2026-10-28", "2026-10-28", 0.5),
  t(2, "Tell 5 people about your idea and gather their feedback", "2026-10-28", "2026-10-30", 1, waits("2026-11-03")),
  t(2, "Pitch your idea to someone in 60 seconds, then ask them what they think it does", "2026-10-30", "2026-10-31", 0.5),
  t(2, "Practice ruthless scoping: cut 80% of an idea and defend what's left", "2026-10-31", "2026-11-01", 1),
  t(2, "Do one thing that doesn't scale to delight or acquire a user", "2026-11-01", "2026-11-02", 1),
  t(2, "Get 10 people to visit something you created, with no paid ads", "2026-11-05", "2026-11-07", 2),
  t(2, "Try to sell something before you feel ready", "2026-11-14", "2026-11-15", 1),
  t(2, "Collect three real no's", "2026-11-23", "2026-11-25", 1),
  // Phase 3
  t(3, "Compare ways to build an MVP, then pick one", "2026-11-02", "2026-11-03", 0.5),
  t(3, "Explore new AI or developer tools you haven't used", "2026-11-03", "2026-11-05", 1),
  t(3, "Find 3 existing solutions to one problem and explain why users still tolerate the problem", "2026-11-07", "2026-11-10", 1.5),
  t(3, "Use 3 competing products and compare what each does best", "2026-11-10", "2026-11-12", 2),
  t(3, "Pick one startup idea and write: user / problem / existing workaround / why now", "2026-11-12", "2026-11-14", 1),
  t(3, "Design an MVP you could launch tomorrow without writing any code", "2026-11-15", "2026-11-17", 1),
  t(3, "Ship an AI-built prototype in under 3 hours", "2026-11-17", "2026-11-21", 3),
  t(3, "Build something with a stranger in 90 minutes", "2026-11-21", "2026-11-23", 1.5),
  t(3, "Ask someone to try your prototype while you watch silently", "2026-11-25", "2026-11-26", 1),
  t(3, "Try to get one real user for something you built", "2026-11-29", "2026-12-01", 1.5),
  t(3, "Test 3 different channels for finding users and track the funnel", "2026-12-05", "2026-12-07", 2),
  t(3, "Run a weekend founder sprint on your most promising idea", "2026-12-11", "2026-12-13", 12),
  // Phase 4
  t(4, "Explain in one sentence why 3 ideas make sense now, not years ago", "2026-11-26", "2026-11-27", 1),
  t(4, "Write down your unfair advantages for three different startup ideas", "2026-11-27", "2026-11-29", 1),
  t(4, "Talk to someone who picked a competitor over your idea, and ask why", "2026-12-01", "2026-12-02", 1),
  t(4, "Try naming a beachhead market for a hypothetical idea", "2026-12-02", "2026-12-03", 0.5),
  t(4, "Sketch a Business Model Canvas for a hypothetical idea", "2026-12-03", "2026-12-05", 1),
  t(4, "Estimate the market size from the bottom up", "2026-12-07", "2026-12-09", 1),
  t(4, "Choose one metric that would tell you whether your hypothetical startup is working", "2026-12-09", "2026-12-10", 0.5),
  t(4, "Ask someone to pay for something you built", "2026-12-10", "2026-12-10", 0.5),
  t(4, "Run one tiny acquisition experiment with a €0–20 budget", "2026-12-14", "2026-12-16", 1.5),
  t(4, "48-Hour Founder Challenge", "2026-12-18", READING_DEADLINE, 16),
];

/** The two Phase 1 books, read at your own pace until the deadline. */
// prettier-ignore
export const READINGS: Reading[] = [
  { title: "The Mom Test", start: "2026-09-28", end: READING_DEADLINE, hours: 3 },
  { title: "Mindset", start: "2026-10-05", end: READING_DEADLINE, hours: 5 },
];

const FORTNIGHTLY = [
  "2026-10-15",
  "2026-10-29",
  "2026-11-12",
  "2026-11-26",
  "2026-12-10",
  "2026-12-24",
];

// prettier-ignore
export const RECURRING: Recurring[] = [
  { title: "Do one thing this month that scares you", cadence: "monthly", hours: 1.5, dates: ["2026-10-17", "2026-11-14", "2026-12-12"] },
  { title: "Run a monthly founder retrospective", cadence: "monthly", hours: 1, dates: ["2026-10-25", "2026-11-22", "2026-12-20"] },
  { title: "Ask someone for hard, critical feedback", cadence: "monthly", hours: 0.5, dates: ["2026-10-20", "2026-11-17", "2026-12-15"] },
  { title: "Ask a founder (Business) or builder (Tech) a tactical question", cadence: "every 2 weeks", hours: 0.5, dates: FORTNIGHTLY },
];
