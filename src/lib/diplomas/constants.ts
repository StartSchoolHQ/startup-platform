// Static diploma content. Programme prose is copied from the approved
// "Supplement to Diploma" layout (diploma.png, B0 batch). Category display
// content maps our tasks.category enum to what prints on the document.

export const DIPLOMAS_BUCKET = "diplomas";

export interface StartupCategoryContent {
  key: string;
  displayName: string;
  description: string;
}

/**
 * The 6 categories printed in the Startup Module table, in print order.
 * `repeatable-tasks` is intentionally absent — it never appears on diplomas.
 */
export const STARTUP_CATEGORIES: StartupCategoryContent[] = [
  {
    key: "idea-validation",
    displayName: "Idea Validation & Customer Discovery",
    description:
      "Students explore the customer discovery process, conducting interviews and market research to validate early-stage startup ideas in team-based projects.",
  },
  {
    key: "team-growth",
    displayName: "Teamwork & Growth",
    description:
      "Students build and grow an effective startup team through hackathons, collaborative workshops, leadership practice, and structured peer feedback.",
  },
  {
    key: "product-foundation",
    displayName: "Product Foundation & MVP",
    description:
      "Students design and build their product from Sprint 0 to a working MVP, focusing on user experience, modern UI practices, and iterative shipping.",
  },
  {
    key: "customer-acquisition",
    displayName: "Customer Acquisition & Sales",
    description:
      "Covers startup sales, marketing, and growth — from first outreach and content channels to repeatable customer acquisition and real revenue.",
  },
  {
    key: "legal-finance",
    displayName: "Business, Legal & Finance",
    description:
      "Covers core business skills including financial modeling, legal structures, company registration, and fundraising. Includes a Legal Clinic with experts.",
  },
  {
    key: "pitch",
    displayName: "Storytelling & Pitch",
    description:
      "Students develop pitching and storytelling skills through workshops and mentorship, culminating in presentations to investors during Demo Day.",
  },
];

/** Verbatim programme facts printed on every diploma (from diploma.png). */
export const PROGRAMME_STATIC = {
  supplementLabel: "SUPPLEMENT TO DIPLOMA No.",
  titleConferred: "Certificate in Technology and Business Skills",
  programmeType: "Professional education programme",
  programmeLength: "48 weeks",
  typeOfStudy: "Full time",
  fieldOfStudy: "Technology, Entrepreneurship, and Business",
  academicStatus:
    "Non-formal education; provides industry-recognized certification",
  professionalStatus:
    "Qualifies graduates for entry-level or upskilled positions in tech and business roles",
  establishmentNote:
    "Not a university – StartSchool is a full-time tech business education program, designed to train future startup founders and tech leaders.",
  entranceRequirements:
    "English proficiency, Logic test, Coding challenges completed, One day hackathon participation.",
  programmeRequirements: "Completion of all required subjects",
  languageOfInstruction: "English",
  workload: "1 credit = 40 working hours, Equal to 1.5 ECTS credits",
  examinationSystem:
    "Automated testing, Peer-to-peer code reviews, Mentor evaluation",
  ceoName: "Anna Andersone",
  ceoTitle: "StartSchool CEO",
} as const;

/**
 * Track columns known from the Qwasar CSV export header. Metadata columns
 * (User ID, Name, Login, ...) are listed separately in csv.ts. New tracks
 * Qwasar adds later are still ingested — they just aren't in this list.
 */
export const KNOWN_TRACK_COLUMNS = [
  "Onboarding",
  "Preseason Web",
  "Preseason Data",
  "Season 01 Arc 01",
  "Season 01 Arc 02",
  "Season 01 Cloud Devops",
  "Season 02 Fullstack",
  "Season 02 Data Science",
  "Season 02 Software Engineer",
  "Season 03 Fullstack Python",
  "Season 03 Fullstack Java",
  "Season 03 Backend",
  "Season 03 Cloud Engineer",
  "Season 03 Software Engineer Golang",
  "Season 03 Software Engineer CPP",
  "Season 03 Software Engineer Rust",
  "Season 03 Machine Learning",
  "Season 03 Data Science",
  "Season 03 Agentic AI",
  "Season 03 React",
  "Season 03 AI Application Developer",
  "Season 04 Masters",
] as const;
