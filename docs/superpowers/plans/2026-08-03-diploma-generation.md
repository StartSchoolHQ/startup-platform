# Diploma Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only diploma generation: compute per-category platform progress + Qwasar track progress, freeze a snapshot, render the official "Supplement to Diploma" PDF, store it, and let students download theirs.

**Architecture:** Self-contained `src/lib/diplomas/` module (mirrors the scholarship module pattern; scholarship code is firewalled by seam-audit so we copy its small PDF renderer + admin guard rather than import). All admin writes go through `/api/admin/diplomas/*` routes using the service-role client; one SECURITY DEFINER RPC computes the diploma data; PDFs render via Handlebars + puppeteer-core/@sparticuz/chromium (the repo's existing PDF stack — NOT @react-pdf/renderer) into a private `diplomas` Storage bucket.

**Tech Stack:** Next.js 16 App Router, Supabase (MCP `apply_migration` for DDL, project `ksoohvygoysofvtqdumz`), Zod v4, TanStack Query, d3-dsv, Handlebars, puppeteer-core + @sparticuz/chromium, ShadCN UI, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-diploma-generation-design.md`

## Global Constraints

- Branch: work on `develop`. Never push to `master`.
- **Take a manual Supabase backup before Task 1** (Database Changes Safety Protocol).
- Prettier: double quotes, printWidth 80, trailingComma es5. Files under ~200 lines.
- Never edit `src/types/database.ts` manually — regenerate after migrations.
- No `alert()`/`confirm()`; Sonner toasts + inline errors; `onError` + `isPending` on every mutation; `retry: 0` on mutations.
- API routes: server `createClient()` → `getUser()` → admin check → `createAdminClient()` only where RLS bypass needed. Zod-validate all bodies. Never expose raw DB errors.
- Do NOT import anything from `@/lib/scholarship/*` or other seam-audit module dirs.
- CSV parsing by header name, never column index. Empty Qwasar cell ≠ 0 (never enrolled → no row).
- Commit after each task: `feat(diplomas): <what>`.

---

### Task 1: Database migration

**Files:** none in repo (applied via Supabase MCP `apply_migration`, name `diplomas_feature_v1`)

**Interfaces:**
- Produces: tables `diploma_batches`, `qwasar_progress`, `qwasar_tracks`, `diplomas`; `users.qwasar_username`, `users.personal_code`, `users.startup_module_completed`; private Storage bucket `diplomas`; milestone tasks flagged with `metadata.diploma_hours_excluded`.

- [ ] **Step 1: Manual Supabase backup** — remind Elias / take Pro-plan backup before applying.

- [ ] **Step 2: Apply migration** via MCP `apply_migration`, name `diplomas_feature_v1`:

```sql
-- users columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS qwasar_username text UNIQUE,
  ADD COLUMN IF NOT EXISTS personal_code text,
  ADD COLUMN IF NOT EXISTS startup_module_completed boolean NOT NULL DEFAULT false;

-- batches
CREATE TABLE public.diploma_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  admission_date date,
  completion_date date,
  number_prefix text NOT NULL,
  next_seq integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- qwasar progress (upsert target for CSV upload now, n8n later)
CREATE TABLE public.qwasar_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qwasar_login text NOT NULL,
  track text NOT NULL,
  percent integer CHECK (percent BETWEEN 0 AND 100),
  cohort text,
  qwasar_status text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qwasar_login, track)
);

-- track reference/content
CREATE TABLE public.qwasar_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csv_column text NOT NULL UNIQUE,
  display_name text NOT NULL,
  weeks numeric,
  description text,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

-- issued diplomas
CREATE TABLE public.diplomas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diploma_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  batch_id uuid NOT NULL REFERENCES public.diploma_batches(id),
  diploma_type text NOT NULL CHECK (diploma_type IN ('full','tech_only')),
  snapshot jsonb NOT NULL,
  storage_path text NOT NULL,
  issued_by uuid NOT NULL REFERENCES public.users(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','superseded'))
);
CREATE INDEX idx_diplomas_user ON public.diplomas(user_id, status);

-- RLS: service-role only, except students read own issued diplomas
ALTER TABLE public.diploma_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qwasar_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qwasar_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diplomas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read own issued diplomas" ON public.diplomas
  FOR SELECT USING (auth.uid() = user_id AND status = 'issued');

-- private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('diplomas', 'diplomas', false)
ON CONFLICT (id) DO NOTHING;

-- flag revenue-milestone tasks: hours excluded from diploma sums
UPDATE public.tasks
SET metadata = COALESCE(metadata, '{}'::jsonb)
  || '{"diploma_hours_excluded": true}'::jsonb
WHERE title IN (
  'Reach 5,000 EUR in Business Revenue',
  'Drive First 1000 EUR in Sales',
  'Generate Your First 500 EUR in Sales',
  'Land Your First Sale: Show Proof of Payment'
);

-- seed current batch (dates filled by admin in UI)
INSERT INTO public.diploma_batches (name, number_prefix, next_seq)
VALUES ('Mercury-Redstone', 'B1', 1);
```

- [ ] **Step 3: Seed `qwasar_tracks`** via `apply_migration` name `diplomas_seed_qwasar_tracks` — one INSERT per CSV column from the Qwasar export header (22 track columns). Descriptions verbatim from `diploma_resources/Track descriptions.html`; weeks from `diploma.png` where known, else NULL:

```sql
INSERT INTO public.qwasar_tracks (csv_column, display_name, weeks, description, sort_order) VALUES
('Onboarding','Onboarding',1,'This track introduces students to the learning platform and guides them through their first programming quest.',10),
('Preseason Web','Preseason Web',3,'This track covers both front-end and back-end development, including fundamental programming concepts, languages such as Ruby, JavaScript, HTML, and CSS, as well as database management, object-oriented design, and cloud deployment. It also prepares students for real-world job interviews through extensive role plays and résumé reviews.',20),
('Preseason Data','Preseason Data',3,'This track focuses on the foundation of data science, learning the essentials of data manipulation, data analysis, and data visualization. By the end of this track, you will be proficient in Python, SQL, and Excel, and ready to tackle big data challenges.',21),
('Season 01 Arc 01','Season 01 Arc 01',9,'This track reinforces foundational programming knowledge through real-world projects using the C programming language, strengthening problem-solving skills and emphasizing coding best practices.',30),
('Season 01 Arc 02','Season 01 Arc 02',NULL,'This track provides hands-on experience with advanced programming concepts in C, including algorithms, data structures, and complexity analysis, while developing complex real-world projects.',31),
('Season 01 Cloud Devops','Season 01 Cloud DevOps',NULL,'This track develops cloud and DevOps skills with a focus on architecture and deployment strategies. Students work with leading providers (AWS, Azure, GCP) and apply containerization using Docker and Kubernetes.',32),
('Season 02 Fullstack','Season 02 Fullstack',11,'This track deepens knowledge of both front-end and back-end web development by introducing advanced technologies such as React, Node.js, and Express, while also building an understanding of database design and API integrations.',40),
('Season 02 Data Science','Season 02 Data Science',NULL,'This track provides an in-depth study of data science, covering advanced machine learning techniques, big data technologies, and predictive modeling, while refining analytical and problem-solving skills.',41),
('Season 02 Software Engineer','Season 02 Software Engineer',NULL,NULL,42),
('Season 03 Fullstack Python','Season 03 Fullstack Python',3,'This track focuses on mastering full-stack application development with Python, from building intuitive front-end interfaces to implementing efficient server-side logic, providing comprehensive coverage of all aspects of full-stack Python development.',50),
('Season 03 Fullstack Java','Season 03 Fullstack Java',NULL,'This track extends full-stack development skills with a focus on Java for back-end logic. Students learn to build comprehensive web applications by integrating Java frameworks for both server-side and client-side programming.',51),
('Season 03 Backend','Season 03 Backend',NULL,'This track specializes in back-end development with a focus on server-side programming. Students work with modern technologies and learn to design efficient, scalable databases.',52),
('Season 03 Cloud Engineer','Season 03 Cloud Engineer',NULL,NULL,53),
('Season 03 Software Engineer Golang','Season 03 Software Engineer Golang',NULL,NULL,54),
('Season 03 Software Engineer CPP','Season 03 Software Engineer C++',NULL,NULL,55),
('Season 03 Software Engineer Rust','Season 03 Software Engineer Rust',NULL,NULL,56),
('Season 03 Machine Learning','Season 03 Machine Learning',NULL,'This track explores advanced topics in artificial intelligence, including complex machine learning algorithms, deep learning, and neural networks. Students learn to design and deploy adaptive systems capable of continuous learning and improvement.',57),
('Season 03 Data Science','Season 03 Data Science',NULL,NULL,58),
('Season 03 Agentic AI','Season 03 Agentic AI',NULL,NULL,59),
('Season 03 React','Season 03 React (Frontend)',NULL,'This track develops expertise in modern React with Next.js, TypeScript, and advanced front-end techniques. Students cover the full process from setup to production, learning to build performant, type-safe applications with features such as server components, edge computing, streaming responses, and AI integration, while also gaining skills in styling, back-end integration, testing, and debugging.',60),
('Season 03 AI Application Developer','Season 03 AI Application Developer',NULL,NULL,61),
('Season 04 Masters','Season 04 Masters',NULL,NULL,70);
```

- [ ] **Step 4: Verify** with `execute_sql`: `SELECT count(*) FROM qwasar_tracks;` → 22; `SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('qwasar_username','personal_code','startup_module_completed');` → 3 rows; `SELECT count(*) FROM tasks WHERE metadata->>'diploma_hours_excluded'='true';` → 4.

- [ ] **Step 5: Backfill `qwasar_username` from `users.csv`** via `execute_sql` (single UPDATE ... FROM (VALUES ...) with the 77 email→login pairs, matching `LOWER(users.email)`). Then verify: `SELECT count(*) FROM users WHERE qwasar_username IS NOT NULL;` → expect 64. Report the unmatched list (12 dropouts + juris.lebedoks — known).

- [ ] **Step 6: Regenerate types:** `npx supabase gen types typescript --project-id ksoohvygoysofvtqdumz > src/types/database.ts` (fix BOM/encoding if PowerShell adds one — file must start with `export type Json`). Run `npm run typecheck`.

- [ ] **Step 7: Commit** `feat(diplomas): add diploma schema, qwasar tables, storage bucket + type regen`

---

### Task 2: RPC `get_diploma_data`

**Files:** migration only (`apply_migration` name `diplomas_get_diploma_data_v1`)

**Interfaces:**
- Produces: `public.get_diploma_data(p_user_id uuid) RETURNS jsonb`. Service-role only (EXECUTE revoked from anon/authenticated). Shape:

```json
{
  "student": { "name": "...", "personal_code": "..." , "qwasar_username": "..." },
  "startup_name": "..." ,
  "startup_modules": [ { "category": "idea-validation", "hours": 42, "percent": 87 } ],
  "tech_modules": [ { "track": "Preseason Web", "display_name": "...", "weeks": 3, "description": "...", "percent": 100 } ]
}
```

- [ ] **Step 1: Apply migration:**

```sql
CREATE OR REPLACE FUNCTION public.get_diploma_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_result jsonb;
BEGIN
  SELECT tm.team_id INTO v_team_id
  FROM team_members tm
  WHERE tm.user_id = p_user_id AND tm.left_at IS NULL
  ORDER BY tm.joined_at DESC
  LIMIT 1;

  WITH completed AS (
    -- distinct completed tasks visible to this student:
    -- their current team's team-context completions + their own individual ones
    SELECT DISTINCT tp.task_id
    FROM task_progress tp
    WHERE tp.status IN ('completed', 'approved')
      AND (
        (v_team_id IS NOT NULL AND tp.team_id = v_team_id)
        OR tp.user_id = p_user_id
      )
  ),
  per_category AS (
    SELECT
      t.category::text AS category,
      COALESCE(SUM(t.estimated_hours) FILTER (
        WHERE c.task_id IS NOT NULL
          AND COALESCE(t.metadata->>'diploma_hours_excluded','') <> 'true'
      ), 0) AS hours,
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE c.task_id IS NOT NULL)
        / NULLIF(COUNT(*), 0)
      ) AS percent
    FROM tasks t
    LEFT JOIN completed c ON c.task_id = t.id
    WHERE t.is_active = true
      AND t.category IS NOT NULL
      AND t.category::text <> 'repeatable-tasks'
    GROUP BY t.category::text
  )
  SELECT jsonb_build_object(
    'student', jsonb_build_object(
      'name', u.name, -- verified: users.name is the display-name column
      'personal_code', u.personal_code,
      'qwasar_username', u.qwasar_username
    ),
    'startup_name', (SELECT tm2.name FROM teams tm2 WHERE tm2.id = v_team_id),
    'startup_modules', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
         'category', pc.category,
         'hours', pc.hours,
         'percent', pc.percent
       ) ORDER BY pc.category)
       FROM per_category pc), '[]'::jsonb),
    'tech_modules', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
         'track', qp.track,
         'display_name', COALESCE(qt.display_name, qp.track),
         'weeks', qt.weeks,
         'description', qt.description,
         'percent', qp.percent
       ) ORDER BY COALESCE(qt.sort_order, 999))
       FROM qwasar_progress qp
       LEFT JOIN qwasar_tracks qt ON qt.csv_column = qp.track
       WHERE u.qwasar_username IS NOT NULL
         AND qp.qwasar_login = u.qwasar_username), '[]'::jsonb)
  )
  INTO v_result
  FROM users u
  WHERE u.id = p_user_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'user % not found', p_user_id;
  END IF;
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_diploma_data(uuid) FROM PUBLIC, anon, authenticated;
```

**IMPORTANT — before applying:** verify with MCP that `users.full_name`, `teams.name`, `team_members.left_at`/`joined_at`, `task_progress.status` enum value `'completed'` all exist as named (check `information_schema` / prior queries this session). Adjust column names to reality if they differ (e.g. if users has `first_name`/`last_name` instead of `full_name`, use `TRIM(CONCAT(u.first_name,' ',u.last_name))`).

- [ ] **Step 2: Verify with real data** via `execute_sql`: run `SELECT get_diploma_data(id) FROM users WHERE qwasar_username = 'vedla_j';` (Janis Vedla — known Qwasar row in scrape doc example). Check: 6 startup_modules, hours numeric, percent 0–100, tech_modules empty (no CSV uploaded yet — expected `[]`).

- [ ] **Step 3: Sanity-check the milestone exclusion:** `execute_sql` — pick a team that completed 'Land Your First Sale…', confirm that category's hours do NOT include 160.

- [ ] **Step 4: Commit** (no repo files — note migration name in commit of Task 3, or make an empty-change commit skip; document in PR description instead).

---

### Task 3: Diplomas module — types, constants, CSV parsing (TDD)

**Files:**
- Create: `src/lib/diplomas/types.ts`
- Create: `src/lib/diplomas/constants.ts`
- Create: `src/lib/diplomas/csv.ts`
- Test: `tests/diplomas/csv.test.ts`

**Interfaces:**
- Produces:
  - `DiplomaSnapshot` (types.ts) — the frozen jsonb shape stored in `diplomas.snapshot`.
  - `STARTUP_CATEGORIES: { key: string; displayName: string; description: string }[]` (6 entries, ordered), `PROGRAMME_STATIC` (header/footer prose), `DIPLOMAS_BUCKET = "diplomas"` (constants.ts).
  - `parseQwasarProgressCsv(text: string): { rows: QwasarProgressRow[]; unknownColumns: string[]; error?: string }` and `parseUsernameMappingCsv(text: string): { rows: { email: string; login: string; status: string }[]; error?: string }` (csv.ts).

- [ ] **Step 1: Write types.ts:**

```ts
export interface StartupModuleRow {
  category: string;
  displayName: string;
  description: string;
  hours: number;
  percent: number;
}

export interface TechModuleRow {
  track: string;
  display_name: string;
  weeks: number | null;
  description: string | null;
  percent: number | null;
}

export interface DiplomaSnapshot {
  diploma_number: string;
  diploma_type: "full" | "tech_only";
  issued_date: string; // YYYY-MM-DD
  student: { name: string; personal_code: string };
  batch: {
    name: string;
    admission_date: string;
    completion_date: string;
  };
  startup_name: string | null;
  startup_modules: StartupModuleRow[];
  tech_modules: TechModuleRow[];
}

export interface QwasarProgressRow {
  qwasar_login: string;
  track: string;
  percent: number;
  cohort: string;
  qwasar_status: string;
}

/** Raw return shape of the get_diploma_data RPC (pre-snapshot). */
export interface RpcDiplomaData {
  student: {
    name: string;
    personal_code: string | null;
    qwasar_username: string | null;
  };
  startup_name: string | null;
  startup_modules: { category: string; hours: number; percent: number }[];
  tech_modules: TechModuleRow[];
}

/** diploma_batches row as consumed by buildSnapshot. */
export interface BatchRow {
  id: string;
  name: string;
  admission_date: string | null;
  completion_date: string | null;
  number_prefix: string;
  next_seq: number;
}
```

- [ ] **Step 2: Write constants.ts** — `DIPLOMAS_BUCKET`, `STARTUP_CATEGORIES` (6 rows: idea-validation "Idea Validation & Customer Discovery"; product-foundation "Product Foundation & MVP"; customer-acquisition "Customer Acquisition & Sales"; team-growth "Teamwork & Growth"; legal-finance "Business, Legal & Finance"; pitch "Storytelling & Pitch" — each with 1–2 sentence description modeled on last year's diploma prose), `PROGRAMME_STATIC` object: titleConferred "Certificate in Technology and Business Skills", programmeType "Professional education programme", length "48 weeks", typeOfStudy "Full time", fieldOfStudy "Technology, Entrepreneurship, and Business", academicStatus, professionalStatus, establishmentNote, entranceRequirements, programmeRequirements, languageOfInstruction "English", workload "1 credit = 40 working hours, Equal to 1.5 ECTS credits", examinationSystem, ceoName "Anna Andersone" — all copied verbatim from `diploma.png`.

- [ ] **Step 3: Write failing tests** (`tests/diplomas/csv.test.ts`) — pure unit tests, no DB:

```ts
import { describe, expect, it } from "vitest";
import {
  parseQwasarProgressCsv,
  parseUsernameMappingCsv,
} from "@/lib/diplomas/csv";

const QWASAR_HEADER =
  "User ID,Name,Login,Status,Email,Last Login,Cohort Name,Onboarding,Preseason Web,Some Future Track";

describe("parseQwasarProgressCsv", () => {
  it("produces one row per non-empty track cell, keyed by header name", () => {
    const text = `${QWASAR_HEADER}\n16374,Janis Vedla,vedla_j,active,j@x.org,2026-02-26,Mercury-Redstone,100,84,`;
    const { rows } = parseQwasarProgressCsv(text);
    expect(rows).toEqual([
      { qwasar_login: "vedla_j", track: "Onboarding", percent: 100, cohort: "Mercury-Redstone", qwasar_status: "active" },
      { qwasar_login: "vedla_j", track: "Preseason Web", percent: 84, cohort: "Mercury-Redstone", qwasar_status: "active" },
    ]);
  });

  it("empty cell means never enrolled — NO row, and 0 means a real row", () => {
    const text = `${QWASAR_HEADER}\n1,A B,ab,active,a@x.org,2026-01-01,C1,0,,`;
    const { rows } = parseQwasarProgressCsv(text);
    expect(rows).toEqual([
      { qwasar_login: "ab", track: "Onboarding", percent: 0, cohort: "C1", qwasar_status: "active" },
    ]);
  });

  it("tolerates unknown future track columns and reports them", () => {
    const text = `${QWASAR_HEADER}\n1,A B,ab,active,a@x.org,2026-01-01,C1,,,55`;
    const { rows, unknownColumns } = parseQwasarProgressCsv(text);
    expect(rows[0].track).toBe("Some Future Track");
    expect(unknownColumns).toContain("Some Future Track");
  });

  it("rejects a CSV missing the Login column", () => {
    const { error } = parseQwasarProgressCsv("Name,Status\nA,active");
    expect(error).toMatch(/Login/);
  });
});

describe("parseUsernameMappingCsv", () => {
  it("parses name,email,login,status rows and lowercases emails", () => {
    const { rows } = parseUsernameMappingCsv(
      "name,email,login,status\nJanis Vedla,Janis.Vedla@startschool.org,vedla_j,graduate"
    );
    expect(rows).toEqual([
      { email: "janis.vedla@startschool.org", login: "vedla_j", status: "graduate" },
    ]);
  });

  it("rejects missing headers", () => {
    const { error } = parseUsernameMappingCsv("email\na@b.c");
    expect(error).toMatch(/login/i);
  });
});
```

Note on `unknownColumns`: csv.ts hardcodes the 7 known NON-track metadata columns (`User ID,Name,Login,Status,Email,Last Login,Cohort Name`); every other column is a track column. `unknownColumns` = track columns not in a `KNOWN_TRACK_COLUMNS` list (export the 22 seeded csv_column names from constants.ts). Rows for unknown tracks are still returned (forward-compatible) — the upload API upserts them; they just won't print until a `qwasar_tracks` row exists.

- [ ] **Step 4: Run tests, verify FAIL:** `npx vitest run tests/diplomas/csv.test.ts` → module not found.

- [ ] **Step 5: Implement csv.ts** with `csvParse` from `d3-dsv` (same lib as `src/lib/csv-validator.ts`): parse, validate required headers (`Login`, `Cohort Name` for progress; `email`, `login` for mapping), iterate `result.columns` minus metadata columns → track columns; for each row × track column, skip `""`/whitespace cells, `Number()` the rest (clamp NaN → skip with a console-less silent skip is NOT allowed — collect into a `skippedCells` count returned alongside). Keep file < 150 lines.

- [ ] **Step 6: Run tests, verify PASS:** `npx vitest run tests/diplomas/csv.test.ts`

- [ ] **Step 7: Commit** `feat(diplomas): module types, constants, qwasar csv parsing`

---

### Task 4: Zod schemas + server data layer

**Files:**
- Modify: `src/lib/validation-schemas.ts` (append)
- Create: `src/lib/diplomas/auth.ts`
- Create: `src/lib/diplomas/data.ts`

**Interfaces:**
- Produces (validation-schemas.ts):

```ts
export const QwasarProgressUploadSchema = z.object({
  rows: z
    .array(
      z.object({
        qwasar_login: z.string().min(1),
        track: z.string().min(1),
        percent: z.number().int().min(0).max(100),
        cohort: z.string(),
        qwasar_status: z.string(),
      })
    )
    .min(1)
    .max(10000),
});
export const UsernameMappingUploadSchema = z.object({
  rows: z
    .array(z.object({ email: z.string().email(), login: z.string().min(1) }))
    .min(1)
    .max(1000),
});
export const DiplomaIssueSchema = z.object({
  user_id: z.string().uuid(),
  batch_id: z.string().uuid(),
});
export const DiplomaBatchUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  admission_date: z.string().nullable(),
  completion_date: z.string().nullable(),
  number_prefix: z.string().min(1),
});
export const DiplomaStudentUpdateSchema = z.object({
  user_id: z.string().uuid(),
  personal_code: z.string().nullable().optional(),
  startup_module_completed: z.boolean().optional(),
});
```

- Produces (auth.ts): `requireAdmin(): Promise<{ id: string } | null>` — same body as scholarship's (server client → getUser → `users.primary_role === "admin"`), owned by this module.
- Produces (data.ts, all server-only, `createAdminClient()`):
  - `getDiplomaData(userId: string): Promise<RpcDiplomaData>` — `supa.rpc("get_diploma_data", { p_user_id: userId })`, throw on error.
  - `listDiplomaStudents()` — all users (id, full name fields, email, qwasar_username, personal_code, startup_module_completed) + their current team name + latest issued diploma (number, issued_at) via two queries joined in TS.
  - `updateDiplomaStudent(input)` — UPDATE users SET personal_code / startup_module_completed.
  - `listBatches() / getBatch(batchId: string) / upsertBatch(input)`.
  - `getDiplomaStudent(userId: string)` — single user row (id, startup_module_completed, personal_code, qwasar_username).
  - `upsertQwasarProgress(rows)` — chunked upsert (500/chunk) `onConflict: "qwasar_login,track"`, sets `synced_at: new Date().toISOString()`; returns `{ upserted: number }`.
  - `applyUsernameMapping(rows)` — for each row, UPDATE users SET qwasar_username WHERE lower(email) matches; returns `{ matched: string[]; unmatched: string[] }` (loop of eq() updates is fine at n≤1000; batch via `in()` select first to find matches, then per-row update only for matched).
  - `issueDiploma({ userId, batchId, adminId, pdf, snapshot, diplomaNumber, diplomaType })` — uploads `pdf` Buffer to `diplomas` bucket at `issued/<userId>/<diplomaNumber>.pdf` (`contentType: "application/pdf", upsert: true`), inserts `diplomas` row, returns the row.
  - `claimDiplomaNumber(batchId)` — atomic: `UPDATE diploma_batches SET next_seq = next_seq + 1 WHERE id = $1 RETURNING number_prefix, next_seq - 1 AS seq` via `supa.rpc` is NOT needed — use a small SQL function? **Decision: add tiny RPC in this task** (`apply_migration` name `diplomas_claim_number`):

```sql
CREATE OR REPLACE FUNCTION public.claim_diploma_number(p_batch_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE diploma_batches
  SET next_seq = next_seq + 1
  WHERE id = p_batch_id
  RETURNING number_prefix || '-S' || lpad((next_seq - 1)::text, 3, '0');
$$;
REVOKE EXECUTE ON FUNCTION public.claim_diploma_number(uuid) FROM PUBLIC, anon, authenticated;
```

  - `supersedeDiploma(id)` — UPDATE status='superseded' WHERE id.
  - `listIssuedDiplomas()` — diplomas + user name, newest first.
  - `getOwnIssuedDiploma(userId)` — latest `status='issued'` row for user.
  - `createDiplomaSignedUrl(storagePath)` — `createSignedUrl(path, 60)`.

- [ ] **Step 1: Append Zod schemas** to `src/lib/validation-schemas.ts` (exact code above + `z.infer` type exports following file convention).
- [ ] **Step 2: Write auth.ts** (copy requireAdmin pattern; doc-comment that it's intentionally duplicated from the firewalled scholarship module).
- [ ] **Step 3: Write data.ts** (~180 lines; if it crosses 200, split `data-qwasar.ts` for the two upload functions). Apply `diplomas_claim_number` migration via MCP.
- [ ] **Step 4: Typecheck:** `npm run typecheck` passes.
- [ ] **Step 5: Commit** `feat(diplomas): zod schemas, admin guard, server data layer`

---

### Task 5: Snapshot builder + PDF template (TDD on pure parts)

**Files:**
- Create: `src/lib/diplomas/snapshot.ts`
- Create: `src/lib/diplomas/pdf-template.ts`
- Create: `src/lib/diplomas/pdf-render.ts`
- Test: `tests/diplomas/snapshot.test.ts`

**Interfaces:**
- Produces:
  - `buildSnapshot(input: { rpc: RpcDiplomaData; batch: BatchRow; diplomaNumber: string; diplomaType: "full" | "tech_only"; issuedDate: string }): DiplomaSnapshot` — merges RPC output with STARTUP_CATEGORIES display content (drops categories not in the 6, orders per constants), for `tech_only` sets `startup_modules: []` and `startup_name: null`. Throws `Error("missing_personal_code")` / `Error("missing_batch_dates")` / `Error("missing_qwasar_username")` when prerequisites absent.
  - `renderDiplomaHtml(snapshot: DiplomaSnapshot): string` — Handlebars template replicating `diploma.png`: A4, header block (supplement no., name, personal code, programme facts, admission/completion dates), Tech Module table (Display name / Weeks / % completed / Description + weeks total), Startup Module table only when `diploma_type === "full"` (Category / Hours / % completed / Description + hours total), footer block (static prose, startup title line only for full, issue date, CEO signature line). `@page { size: A4; margin: 1.5cm; }`, system font stack, black on white, pink StartSchool wordmark block matching the PNG.
  - `renderHtmlToPdf(html: string): Promise<Buffer>` — puppeteer-core + @sparticuz/chromium copy (local dev uses `PUPPETEER_LOCAL_CHROME_PATH`, Vercel uses `chromium.executablePath()`), `printBackground: true, format: "A4"`, waits `document.fonts.ready`. Doc-comment: duplicated from scholarship module (seam-audit firewall).

- [ ] **Step 1: Write failing snapshot tests:**

```ts
import { describe, expect, it } from "vitest";
import { buildSnapshot } from "@/lib/diplomas/snapshot";

const rpc = {
  student: { name: "Test User", personal_code: "010101-11111", qwasar_username: "user_t" },
  startup_name: "TestStartup",
  startup_modules: [
    { category: "idea-validation", hours: 42, percent: 87 },
    { category: "pitch", hours: 10, percent: 100 },
  ],
  tech_modules: [
    { track: "Onboarding", display_name: "Onboarding", weeks: 1, description: "d", percent: 100 },
  ],
};
const batch = {
  id: "b", name: "Mercury-Redstone", admission_date: "2025-09-01",
  completion_date: "2026-08-01", number_prefix: "B1", next_seq: 2,
};

describe("buildSnapshot", () => {
  it("orders startup modules per STARTUP_CATEGORIES and fills display content", () => {
    const s = buildSnapshot({ rpc, batch, diplomaNumber: "B1-S001", diplomaType: "full", issuedDate: "2026-08-03" });
    expect(s.startup_modules.map((m) => m.category)).toEqual(["idea-validation", "pitch"]);
    expect(s.startup_modules[0].displayName).toMatch(/Idea Validation/);
    expect(s.startup_name).toBe("TestStartup");
  });

  it("tech_only drops startup modules and startup name", () => {
    const s = buildSnapshot({ rpc, batch, diplomaNumber: "B1-S002", diplomaType: "tech_only", issuedDate: "2026-08-03" });
    expect(s.startup_modules).toEqual([]);
    expect(s.startup_name).toBeNull();
  });

  it("throws when personal_code missing", () => {
    const bad = { ...rpc, student: { ...rpc.student, personal_code: null } };
    expect(() =>
      buildSnapshot({ rpc: bad, batch, diplomaNumber: "x", diplomaType: "full", issuedDate: "2026-08-03" })
    ).toThrow("missing_personal_code");
  });

  it("throws when batch dates missing", () => {
    expect(() =>
      buildSnapshot({ rpc, batch: { ...batch, admission_date: null }, diplomaNumber: "x", diplomaType: "full", issuedDate: "2026-08-03" })
    ).toThrow("missing_batch_dates");
  });

  it("throws when qwasar_username missing (tech data would be empty)", () => {
    const bad = { ...rpc, student: { ...rpc.student, qwasar_username: null } };
    expect(() =>
      buildSnapshot({ rpc: bad, batch, diplomaNumber: "x", diplomaType: "full", issuedDate: "2026-08-03" })
    ).toThrow("missing_qwasar_username");
  });
});

describe("renderDiplomaHtml", () => {
  it("renders snapshot values into the HTML", async () => {
    const { renderDiplomaHtml } = await import("@/lib/diplomas/pdf-template");
    const s = buildSnapshot({ rpc, batch, diplomaNumber: "B1-S001", diplomaType: "full", issuedDate: "2026-08-03" });
    const html = renderDiplomaHtml(s);
    expect(html).toContain("B1-S001");
    expect(html).toContain("Test User");
    expect(html).toContain("TestStartup");
    expect(html).toContain("Idea Validation");
  });

  it("tech_only omits the Startup Module section", async () => {
    const { renderDiplomaHtml } = await import("@/lib/diplomas/pdf-template");
    const s = buildSnapshot({ rpc, batch, diplomaNumber: "B1-S002", diplomaType: "tech_only", issuedDate: "2026-08-03" });
    const html = renderDiplomaHtml(s);
    expect(html).not.toContain("Startup Module");
  });
});
```

- [ ] **Step 2: Run, verify FAIL.** `npx vitest run tests/diplomas/snapshot.test.ts`
- [ ] **Step 3: Implement snapshot.ts** (pure, ~80 lines) and **pdf-template.ts** (Handlebars `compile` once at module level; template string ~150 lines; helper `fmtDate` → `DD.MM.YYYY`).
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Write pdf-render.ts** (copy scholarship renderer, strip footer option). No unit test (needs Chrome); verified in Task 6 smoke + manual test.
- [ ] **Step 6: Commit** `feat(diplomas): snapshot builder and pdf template`

---

### Task 6: API routes

**Files (create):**
- `src/app/api/admin/diplomas/students/route.ts` — GET list, PATCH update (personal_code / startup_module_completed)
- `src/app/api/admin/diplomas/batches/route.ts` — GET, POST (upsert)
- `src/app/api/admin/diplomas/qwasar-progress/route.ts` — POST rows
- `src/app/api/admin/diplomas/qwasar-usernames/route.ts` — POST rows
- `src/app/api/admin/diplomas/preview/route.ts` — GET `?userId=` → `{ data, readiness }`
- `src/app/api/admin/diplomas/issue/route.ts` — POST → full pipeline
- `src/app/api/admin/diplomas/issued/route.ts` — GET list
- `src/app/api/admin/diplomas/[id]/supersede/route.ts` — POST
- `src/app/api/admin/diplomas/[id]/download/route.ts` — GET → `{ url }`
- `src/app/api/diplomas/mine/route.ts` — GET (student) → `{ diploma, url } | { diploma: null }`

**Interfaces:**
- Consumes: everything from Tasks 3–5 (`requireAdmin`, data.ts functions, `buildSnapshot`, `renderDiplomaHtml`, `renderHtmlToPdf`, Zod schemas).
- Produces: JSON contracts used by Task 7 hooks (shapes below).

Every admin route starts:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const parsed = SomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    // ... data.ts call
  } catch (e) {
    console.error("diplomas: <route> failed", e);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
```

Issue route (`issue/route.ts`) pipeline — the one non-trivial route:

```ts
export const runtime = "nodejs";
export const maxDuration = 60;

// after requireAdmin + DiplomaIssueSchema parse:
const { user_id, batch_id } = parsed.data;
const [rpc, batch, student] = await Promise.all([
  getDiplomaData(user_id),
  getBatch(batch_id),
  getDiplomaStudent(user_id), // startup_module_completed flag
]);
const diplomaType = student.startup_module_completed ? "full" : "tech_only";
let snapshot;
try {
  const diplomaNumber = await claimDiplomaNumber(batch_id);
  snapshot = buildSnapshot({
    rpc, batch, diplomaNumber, diplomaType,
    issuedDate: new Date().toISOString().slice(0, 10),
  });
} catch (e) {
  const code = e instanceof Error ? e.message : "unknown";
  if (code.startsWith("missing_")) {
    return NextResponse.json({ error: code }, { status: 422 });
  }
  throw e;
}
const pdf = await renderHtmlToPdf(renderDiplomaHtml(snapshot));
const row = await issueDiploma({
  userId: user_id, batchId: batch_id, adminId: admin.id,
  pdf, snapshot, diplomaNumber: snapshot.diploma_number, diplomaType,
});
return NextResponse.json(row, { status: 201 });
```

Note: `claimDiplomaNumber` before `buildSnapshot` may burn a sequence number when prerequisites fail — reorder: call `buildSnapshot` with a placeholder FIRST to validate (`diplomaNumber: "PENDING"`), then claim the number and rebuild with the real number. Cheap and avoids gaps:

```ts
buildSnapshot({ rpc, batch, diplomaNumber: "PENDING", diplomaType, issuedDate }); // throws on missing prereqs
const diplomaNumber = await claimDiplomaNumber(batch_id);
const snapshot = buildSnapshot({ rpc, batch, diplomaNumber, diplomaType, issuedDate });
```

`preview/route.ts` GET returns `{ data: buildSnapshot-able check, readiness: { qwasar_username: boolean, personal_code: boolean, batch_dates: boolean, has_qwasar_rows: boolean } }` — computed from `rpc` + batch without throwing (call the same prerequisite checks exported from snapshot.ts as `checkReadiness(rpc, batch)`).

`mine/route.ts` (student): server client + `getUser()` only (no admin), `getOwnIssuedDiploma(user.id)` then `createDiplomaSignedUrl` — returns `{ diploma: { diploma_number, issued_at }, url }` or `{ diploma: null }`.

- [ ] **Step 1: Implement all 10 routes** (each < 80 lines; shared readiness helper lives in snapshot.ts).
- [ ] **Step 2: Typecheck + lint:** `npm run typecheck && npm run lint` (seam-audit must pass — diplomas module imports only `@/lib/supabase/*`, `@/lib/validation-schemas`, `@/types/database`).
- [ ] **Step 3: Smoke-test locally:** `npm run dev`; with an admin session, `GET /api/admin/diplomas/students` returns rows; `GET /api/admin/diplomas/preview?userId=<vedla_j uuid>` returns readiness with `has_qwasar_rows: false`.
- [ ] **Step 4: Commit** `feat(diplomas): admin + student api routes`

---

### Task 7: React Query hooks + Setup tab

**Files:**
- Create: `src/components/diplomas/use-diplomas.ts`
- Create: `src/components/diplomas/setup-tab.tsx`
- Create: `src/components/diplomas/batch-form.tsx`
- Create: `src/components/diplomas/csv-upload-card.tsx`

**Interfaces:**
- Produces hooks (all keys namespaced `["admin-diplomas", ...]`, staleTime 5 min, mutations `retry: 0` + `onError` toast + invalidate):
  - `useDiplomaStudents()`, `useUpdateStudent()`, `useBatches()`, `useUpsertBatch()`, `useUploadQwasarProgress()`, `useUploadUsernames()`, `useDiplomaPreview(userId | null)`, `useIssueDiploma()`, `useIssuedDiplomas()`, `useSupersedeDiploma()`.
- `SetupTab({ active }: { active: boolean })` — batches card (name, prefix, admission/completion date inputs, save) + two `CsvUploadCard`s (one per upload type: file input → `FileReader.readAsText` → parse via `src/lib/diplomas/csv.ts` → show parse summary/errors inline → POST parsed rows → toast result incl. unmatched emails list).

- [ ] **Step 1: Write use-diplomas.ts** following `use-analytics.ts` pattern (`fetchJson` helper, `enabled: active`/`!!userId` gates).
- [ ] **Step 2: Write the three tab components** (ShadCN Card/Table/Input/Button/Checkbox; each file < 200 lines).
- [ ] **Step 3: Manual test** on dev server: create/edit Mercury-Redstone dates, upload the real Qwasar CSV export (Elias downloads it), see "N rows upserted"; upload `users.csv`, see 64 matched / unmatched list.
- [ ] **Step 4: Commit** `feat(diplomas): admin setup tab with csv uploads`

---

### Task 8: Issue tab + Issued tab + page + nav

**Files:**
- Create: `src/components/diplomas/issue-tab.tsx`
- Create: `src/components/diplomas/preview-dialog.tsx`
- Create: `src/components/diplomas/issued-tab.tsx`
- Create: `src/app/dashboard/admin/diplomas/page.tsx`
- Modify: `src/components/app-sidebar.tsx` (add `{ title: "Diplomas", url: "/dashboard/admin/diplomas" }` to the admin items array)

**Interfaces:**
- Consumes: all hooks from Task 7.
- `IssueTab` — table of ALL users: name, email, team, qwasar_username (✓/—), personal_code (inline editable), **`startup_module_completed` Checkbox** (persists via `useUpdateStudent`, optimistic-free: disabled while `isPending`), last issued diploma number, "Preview & Issue" button.
- `PreviewDialog({ userId })` — fetches `useDiplomaPreview(userId)`; shows readiness checklist (red/green per flag with the specific missing-item message), diploma type badge (from checkbox state), computed startup rows (hours + %) and tech rows (% per track); Issue button disabled until all readiness flags true; on success `toast.success("Issued B1-S00X")` + invalidate students/issued.
- `IssuedTab` — table: number, student, type, issued date, status; Download (calls `[id]/download`, opens `url`), Supersede (with ShadCN AlertDialog confirm → supersede → re-issue hint toast).
- Page: `"use client"`, `useApp()` admin guard (redirect + `AdminSkeleton`), `<Tabs>` with Setup / Issue / Issued passing `active`.

- [ ] **Step 1: Implement the four files + sidebar entry.**
- [ ] **Step 2: Manual E2E on dev:** check off a student's startup-module checkbox → preview → issue → PDF downloads and matches diploma.png layout; verify a `tech_only` student (checkbox off) renders without Startup Module; verify superseding + re-issue mints the next number.
- [ ] **Step 3: Verify snapshot freeze:** complete any test task for that team afterwards → re-download the issued PDF → numbers unchanged (rendered from snapshot, not live data).
- [ ] **Step 4: Commit** `feat(diplomas): admin issue flow and issued registry`

---

### Task 9: Student download card

**Files:**
- Create: `src/components/diplomas/student-diploma-card.tsx`
- Modify: `src/app/dashboard/account/page.tsx` (render the card)

**Interfaces:**
- Consumes: `GET /api/diplomas/mine`.
- `StudentDiplomaCard` — React Query `["diplomas", "mine", userId]`, `enabled: !!userId`; renders nothing when `diploma: null`; otherwise a Card with diploma number, issue date, Download button (opens signed `url`).

- [ ] **Step 1: Implement card + mount in account page** (find a sensible existing section; keep the page's current structure).
- [ ] **Step 2: Manual test** as a non-admin user with an issued diploma (issue one for a test account) and one without.
- [ ] **Step 3: Commit** `feat(diplomas): student diploma download card`

---

### Task 10: Verification & wrap-up

- [ ] **Step 1:** `npm run test` (all suites, sequential), `npm run typecheck`, `npm run lint` (includes seam-audit) — all green.
- [ ] **Step 2:** Re-run the Task 2 RPC verification queries; run `get_advisors` (security) via MCP for new-table RLS warnings.
- [ ] **Step 3:** Manual checklist with Elias on dev preview: upload real Qwasar CSV → check off startup-module completions → issue 1 full + 1 tech_only diploma → download both → visual compare vs diploma.png.
- [ ] **Step 4:** Push `develop`. Do NOT touch master.

## Open items carried from spec

1. `juris.lebedoks@startschool.org` — graduate without platform account; Elias creates the account, then username backfill re-run for that one row.
2. `qwasar_tracks.weeks` NULL for tracks not on last year's diploma — Elias supplies; blank prints as "—".
3. "Satisfactory" threshold rendering — v1 prints raw percentages; revisit if wanted.
