import type {
  BackgroundLean,
  FounderCardInput,
} from "@/lib/validation-schemas";

/**
 * Copy for the founder card (profile setup step 2). Lifted from the two
 * former "Phase 0 — Make your profile" tasks so onboarding asks exactly what
 * those tasks asked: MJ-P0-01 "Name your current background" and MJ-P0-02
 * "Write a short founder bio: strengths, energy, and gaps".
 */

export type FounderCardField = Exclude<
  keyof FounderCardInput,
  "background_lean"
>;

export const BACKGROUND_SECTION = {
  title: "Name your current background",
  intro:
    "A quick, honest check-in on which background you're coming from. It helps you find teammates and make a complementary team.",
  leanLabel: "Right now, are you more of a tech person or a business person? *",
  leanHint:
    "Pick what is true today, not what you would like to be. It will change, and a team needs both.",
} as const;

export const BIO_SECTION = {
  title: "Write a short founder bio",
  intro:
    "What energizes you, what skills you already bring, and what a complementary co-founder would bring. A few honest lines each is enough.",
  footer:
    "This is a working document for team matching, not a pitch. Sounding impressive is not the point.",
} as const;

export const LEANS: { value: BackgroundLean; label: string; hint: string }[] = [
  { value: "tech", label: "Tech", hint: "Building, engineering, product" },
  { value: "business", label: "Business", hint: "Market, sales, operations" },
  { value: "both", label: "Both", hint: "Genuinely split — say why" },
];

export const BACKGROUND_FIELD: {
  key: FounderCardField;
  label: string;
  placeholder: string;
  rows: number;
} = {
  key: "background_reason",
  label: "What makes you say that? One or two sentences. *",
  placeholder:
    "Where does your energy actually go, and what are you confident doing? Say it straight.",
  rows: 3,
};

export const BIO_FIELDS: {
  key: FounderCardField;
  label: string;
  placeholder: string;
  rows: number;
}[] = [
  {
    key: "bio_energizes",
    label: "What energizes you *",
    placeholder: "The kind of work you'd do on a Sunday without being asked.",
    rows: 3,
  },
  {
    key: "bio_skills",
    label: "Skills you already bring *",
    placeholder:
      'Specific beats generic: "built two Shopify stores" beats "good with people".',
    rows: 3,
  },
  {
    key: "bio_gaps",
    label: "What a complementary co-founder would bring *",
    placeholder:
      "Name at least one real gap, not just strengths. Who covers what you don't?",
    rows: 3,
  },
];
