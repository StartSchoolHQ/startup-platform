# Writing Criteria the AI Reviewer Can Actually Check

> Applies to individual (My Journey) tasks. The AI reviewer (`docs/documentation/ai-task-review.md`)
> grades against `tasks.peer_review_criteria` — the task's `detailed_instructions`, `deliverables`
> and `review_instructions` are given to it as context, but these two blocks are the only pass/fail
> rubric. If a check isn't checkable from what's written here, the reviewer will reject it as
> unverifiable, every time, for every student.

## 1. Why this matters

The reviewer sees only what is submitted: the description text, the pasted links (fetched as text or
a screenshot/PDF export), and the uploaded files (images, PDFs, DOCX/XLSX/PPTX text, CSV/plain text).
It cannot browse a website interactively, log into anything, click through a flow, watch a video, or
"just check" something the way a human reviewer would. A criterion that assumes any of that will
never pass — not because the student's work is bad, but because the reviewer has nothing to point at.
Every "What to evaluate" item must name a piece of evidence the reviewer can actually open and read.

**Who is reading your criteria.** The reviewer answers in a persona
(`docs/documentation/ai-reviewer-persona.md`): StartSchool's built-in mentor — friendly, motivating,
fair and direct, YC-office-hours blunt rather than form-validator terse. It may cite one relevant
playbook (The Mom Test, Lean Startup, default alive/dead, …) when it earns its place. That governs
*how it writes the feedback*, never *how strictly it grades*: the pass/fail bar is only ever what
you write in the task's own fields (`detailed_instructions`, `deliverables`, `review_instructions`,
`peer_review_criteria`), and the prompt explicitly forbids inventing a stricter bar than the task
states — or a looser one because the student sounds earnest. If you want something enforced, write
it down as an evaluate item or a reject rule; hoping the reviewer will "obviously" expect it does
not work. The same cuts the other way: if the task itself says an incomplete first attempt is
acceptable, say so in the task text and the reviewer will honour it.

**"Self-Check" tasks need no criteria at all.** Set `requires_review = false` on the task (the admin
dialog's review toggle) and the submission is recorded as complete the moment the student submits —
`submit_individual_task_v1` finalises it in SQL with `decided_by = 'self_check'`, pays the reward,
and the model is never called. That is the right shape for honesty prompts and private reflections
where the point is the founder being straight with themselves. Any task with
`requires_review = false` ignores `peer_review_criteria` entirely, so don't spend time writing them;
conversely, never leave `requires_review = false` on a task you actually want graded.

## 2. Format

Criteria live in the same two blocks you already use in the admin task dialog:

- **"What to evaluate"** — a numbered list, one check per line. Each line becomes one AI-graded item.
- **"Reject if"** — a bulleted list of hard fails. If any one is true, the submission is rejected
  regardless of how many "What to evaluate" items passed.

Storage shape in `tasks.peer_review_criteria` (exactly two entries, in this order):

```json
[
  { "category": "What to evaluate:**", "points": ["1. ...", "2. ...", "..."] },
  { "category": "Reject if:**", "points": ["- ...", "- ...", "..."] }
]
```

The `:**` suffix on `category` is the literal stored string produced by the admin dialog's markdown
bold formatting — it is stripped automatically when building the prompt, so don't worry about it, but
**do not rename either category**. The reviewer labels every "What to evaluate" line `E1`, `E2`, … and
every "Reject if" line `R1`, `R2`, … by position, and it locates the two blocks by matching the title
text (case-insensitively) starting with "what to evaluate" and "reject if". A renamed or reworded
block title (e.g. "Evaluation criteria", "Checklist") is invisible to the reviewer — its points are
silently dropped from the prompt. Use these two titles, exactly, every time.

## 3. Rules for writing an evaluate item

Each line in "What to evaluate" must be a single, self-contained, checkable statement:

- **One check per line.** "Has a working demo link and a screenshot of it" is two checks — split it.
  A line that bundles two things and only one is true still has to be marked passed or failed as one.
- **Name the evidence type.** Say whether the reviewer should be looking at a screenshot, a PDF, the
  text of an uploaded document, or a public web page. "Show that X is true" is not enough — "A
  screenshot showing X" or "The PDF states X" tells the reviewer where to look.
- **Give explicit quantities.** "Screenshots of the search results" is unbounded; "At least 2
  screenshots" is checkable — the reviewer is instructed to actually count evidence items.
- **State visibility requirements explicitly.** If the check depends on a date being visible, the URL
  bar being visible, an incognito/private-window indicator, or a username/account name in shot, say so
  in the line itself. The reviewer marks a criterion unmet (not "probably fine") when a stated
  visibility requirement isn't visible in the evidence.
- **Never phrase a check as a reviewer action.** "Click the link and check," "open it yourself,"
  "google it and compare," "log in and confirm" all assume the reviewer can act — it cannot. Rephrase
  as what the *evidence* must show, not what the reviewer must do.

## 4. What the reviewer cannot see

Ask for a substitute instead of any of these:

| Cannot see | Ask for instead |
|---|---|
| Video (mp4, mov, webm, avi, mkv) | Screenshots of the specific moments that matter |
| Private or login-walled links (Google Doc/Sheet not set to "anyone with the link", a dashboard behind auth) | Make the link public, or attach a PDF/screenshot export |
| Pages that only render with JavaScript (some SPA dashboards, some no-code site builders) | A screenshot or a PDF export of the page |
| Search-results URLs (`google.com/search?...`, `bing.com/search?...`, `duckduckgo.com/?q=...`) | A dated screenshot of the results — results differ per user, per time, and per location, so the URL alone proves nothing |
| HEIC images (iPhone default format) | Re-export as PNG or JPG before uploading |

## 5. Bad → good pairs

**Bad:** "Open incognito and Google it yourself."
**Good:** "≥2 screenshots showing the search query, a visible date, the incognito indicator and your
domain in positions 1–10. Reject if any screenshot lacks a date."

**Bad:** "Has a professional-looking landing page."
**Good:** "A screenshot or public URL of the landing page showing a headline, at least one call-to-
action button, and a way to contact the team (email or contact form)."

**Bad:** "Talked to at least 5 potential customers."
**Good:** "A document or spreadsheet listing at least 5 customer interviews, each with a name/initials,
a date, and one sentence of what was learned."

**Bad:** "Watch the pitch video and check it's under 3 minutes."
**Good:** "A screenshot of the video file's properties (or the hosting platform's duration display)
showing a runtime under 3 minutes, plus a PDF or text export of the script/slides used."

**Bad:** "Confirm the Stripe account is set up."
**Good:** "A screenshot of the Stripe dashboard showing the account status as 'active' with the
business name visible. Reject if the screenshot shows a test/sandbox banner."

## 6. Template to paste into the admin dialog

```
What to evaluate:
1. [Evidence type] shows [specific, countable fact], including [visibility requirement — date/URL/incognito indicator/username].
2. [Evidence type] shows [specific, countable fact].
3. ...

Reject if:
- [Hard fail condition stated as a fact about the evidence, not an instruction to the reviewer]
- [Hard fail condition]
```

## 7. Checklist before publishing a task

1. Does every "What to evaluate" line name an evidence type (screenshot / PDF / document text / public
   page) instead of assuming the reviewer can click or log in?
2. Does every quantity ("at least N", "all of", "each of") appear as a number, not a vague word?
3. Does every check that depends on a date, URL, incognito state, or username say so explicitly?
4. Are the two block titles exactly "What to evaluate" and "Reject if" — not renamed, not merged?
5. If the task's deliverable is naturally a video or a login-walled page, does the task's own
   instructions ask the student for a screenshot/PDF substitute instead of the thing itself?
