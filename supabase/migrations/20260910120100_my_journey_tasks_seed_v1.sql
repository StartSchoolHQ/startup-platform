-- My Journey task seed: 62 individual tasks from MyJourney_Suggested_Tasks CSV (2026-09-10).
-- Rollback: DELETE FROM public.tasks WHERE template_code LIKE 'MJ-%';
INSERT INTO public.tasks (template_code, activity_type, title, description, detailed_instructions, category, priority, difficulty_level,
  estimated_hours, base_xp_reward, base_points_reward, requires_review, review_instructions, peer_review_criteria, deliverables, resources,
  tags, sort_order, is_active, is_recurring, cooldown_days, recurring_type, is_confidential, achievement_id) VALUES
  ($mj$MJ-P0-01$mj$, 'individual', $mj$Name your current background$mj$, $mj$A quick, honest check-in on which background you're coming from. It can help you find teammates and make a complementary team.$mj$, $mj$# Name your current background

## Task Description
Write one or two sentences naming whether you currently lean more toward tech development, business/market development, or genuinely both — and why. There's no wrong answer, and it's expected to change.

## Requirements
- Be honest about where your energy and confidence actually sit today, not where you think you should be.

## Evidence Required
The one or two sentence self-assessment.$mj$, 'founder-mindset', 'medium', 1,
   0.25, 10, 8, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Picking the "better" answer. Both leans are equally valued — a team needs both.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states which way the student currently leans: tech development, business/market development, or both.", "2. The text gives at least one reason grounded in the student's own experience or confidence today."]}, {"category": "Reject if:**", "points": ["- No lean is named at all.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The one or two sentence self-assessment.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$self-assessment$mj$,$mj$track-universal$mj$,$mj$phase-p0$mj$]::text[], 1, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Make Your Profile$mj$ AND context = 'individual')),
  ($mj$MJ-P0-02$mj$, 'individual', $mj$Write a short founder bio: strengths, energy, and gaps$mj$, $mj$Write an honest short bio covering what energizes you, your existing skills, and what a complementary co-founder would bring.$mj$, $mj$# Write a short founder bio: strengths, energy, and gaps

## Task Description
Write a short founder bio for yourself: what energizes you, what skills you already bring, and what kind of co-founder would complement your gaps.

## Requirements
- Cover all three parts: what energizes you, existing skills, and complementary gaps.
- Be specific rather than generic ("good with people" is weaker than naming an actual skill or experience).
- Keep it honest about gaps, not just strengths.

## Evidence Required
The written bio (a paragraph or a few bullet lines is enough).$mj$, 'founder-mindset', 'medium', 2,
   1, 20, 16, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Sounding impressive. This is a working document for future team-matching, not a pitch.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text names what energizes the student.", "2. The text names at least one specific existing skill or experience, not a generic trait like 'good with people'.", "3. The text names at least one real gap and what a complementary co-founder would bring."]}, {"category": "Reject if:**", "points": ["- Any of the three parts (energy, skills, gaps) is missing.", "- Only strengths are listed and no gap is admitted.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The written bio (a paragraph or a few bullet lines is enough).$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$self-assessment$mj$,$mj$track-universal$mj$,$mj$phase-p0$mj$]::text[], 2, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Make Your Profile$mj$ AND context = 'individual')),
  ($mj$MJ-P1-01$mj$, 'individual', $mj$Read The Mom Test Book$mj$, $mj$Read Rob Fitzpatrick's short, practical guide to customer conversations that reveal the truth instead of comforting opinions.

[You can read the book and do other tasks in parallel]$mj$, $mj$# Read The Mom Test

## Task Description
Read Rob Fitzpatrick's The Mom Test. Why this book for Startup Mindset: it's the direct source for the Mom-Test interview technique this list already asks you to practice (the recurring "Have a Mom-Test conversation with a potential user" task in Talk to People) — a short, practical guide to asking questions that surface real past behavior instead of polite, hypothetical opinions, so you actually know the technique going in rather than improvising it live with a real person.

## Requirements
- Read the book in full (short — roughly 140 pages).
- Write 3-4 sentences on the single biggest mistake you'd likely have made in a customer conversation before reading this (e.g. pitching too early, asking "would you use this?", talking more than listening), and how you'll change your next conversation because of it.

## Evidence Required
The 3-4 sentence reflection naming a specific mistake, not a summary of the book's rules.$mj$, 'reading', 'medium', 3,
   3, 45, 36, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Producing a book report. One honest, specific reflection beats a full summary.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states the book was read in full, or names exactly which chapters were read.", "2. The text names one specific mistake the student would likely have made in a customer conversation (e.g. pitching too early, asking 'would you use this?', talking more than listening).", "3. The text states one concrete change to the student's next customer conversation."]}, {"category": "Reject if:**", "points": ["- The text restates the book's rules with no personal mistake named.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3-4 sentence reflection naming a specific mistake, not a summary of the book's rules.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 3, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-02$mj$, 'individual', $mj$Watch a grit/resilience primer and recall your own moment$mj$, $mj$Watch a short talk on grit and connect it to a real moment from your own life.$mj$, $mj$# Watch a grit/resilience primer and recall your own moment

## Task Description
Watch a short primer on grit and resilience (e.g. Angela Duckworth's TED talk, ~6 minutes) and write down one real moment where you kept going past the point most people would have quit.
- https://www.youtube.com/watch?v=H14bBuluwB8&vl=en

## Requirements
- Watch the full talk (or an equivalent short primer, ~5-10 minutes).
- Write one specific real memory — not a hypothetical — of persisting through something difficult.
- Note briefly why that instinct will matter during the Startup Module.

## Evidence Required
A short written note describing the moment and its relevance, kept with your other pre-program notes.$mj$, 'founder-mindset', 'medium', 1,
   0.5, 10, 8, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Finding the "perfect" story. An ordinary moment is fine.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text names the talk or primer watched.", "2. The text describes one specific, real moment from the student's own life of persisting past the point most people would quit.", "3. The text connects that moment to what startups demand, in at least one sentence."]}, {"category": "Reject if:**", "points": ["- The moment is hypothetical or generic rather than a real personal memory.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$A short written note describing the moment and its relevance, kept with your other pre-program notes.$mj$]::text[], $mj$[{"title": "Angela Duckworth — Grit: the power of passion and perseverance (TED)", "description": "The ~6 minute talk referenced by this task.", "type": "video", "url": "https://www.youtube.com/watch?v=H14bBuluwB8"}]$mj$::jsonb,
   ARRAY[$mj$mindset-practice$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 4, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-03$mj$, 'individual', $mj$Read Mindset: The New Psychology of Success$mj$, $mj$Read Carol Dweck's Mindset and reflect on where you default to fixed vs. growth mindset.

[You can read the book and do other tasks in parallel]$mj$, $mj$# Read Mindset: The New Psychology of Success

## Task Description
Read Carol Dweck's Mindset: The New Psychology of Success. Why this book for Startup Mindset: it's the foundational case for treating ability as something built through effort and feedback rather than fixed at birth — the psychological groundwork for treating failed experiments, harsh user feedback, and repeated pivots as normal information rather than a verdict on you. Almost everything else in this reading list (grit, hard decisions, contrarian thinking) assumes this underlying stance.

## Requirements
- Read the book in full.
- Write 3-4 sentences identifying one real situation — school, a past project, anything — where you noticed yourself defaulting to fixed-mindset thinking (avoiding a challenge, treating a failure as identity rather than data).

## Evidence Required
The 3-4 sentence reflection naming a specific real situation, not a general summary of the book's argument.$mj$, 'reading', 'medium', 4,
   5, 75, 60, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Producing a book report. One honest, specific reflection beats a full summary.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states the book was read in full, or names exactly which chapters were read.", "2. The text names one specific real situation (school, a past project, anything) where the student defaulted to fixed-mindset thinking.", "3. The text says what the fixed-mindset reaction was (avoiding a challenge, treating a failure as identity rather than data)."]}, {"category": "Reject if:**", "points": ["- The text is a summary of the book's argument with no personal, specific reflection.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3-4 sentence reflection naming a specific real situation, not a general summary of the book's argument.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 5, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-04$mj$, 'individual', $mj$Write about a time you failed and what it taught you$mj$, $mj$Normalize failure as information, not identity, by writing honestly about a real one of your own.$mj$, $mj$# Write about a time you failed and what it taught you

## Task Description
Write 4-6 sentences about a real time something you tried failed or didn't work out, and what you actually learned from it. This is a direct, personal counterpart to the Mindset and Grit reading tasks — the Y Combinator and Techstars culture of treating failure as a normal, even expected, part of building rather than something to hide.

## Requirements
- The failure must be real and specific — not a humble-brag ("I worked too hard") and not something vague.
- Name what actually went wrong, plainly, without over-explaining it away.
- Name one concrete thing you changed or would change because of it.

## Evidence Required
The 4-6 sentence reflection.$mj$, 'founder-mindset', 'medium', 1,
   0.5, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Making yourself look good. An honest, unflattering account is worth more here than a redemption story.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text describes one specific, real failure and plainly names what went wrong.", "2. The text names one concrete thing the student changed or would change because of it.", "3. The reflection is roughly 4-6 sentences long."]}, {"category": "Reject if:**", "points": ["- The 'failure' is a disguised brag (e.g. 'I worked too hard') or a vague generality.", "- The only lesson is generic ('be more resilient') with no concrete change.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 4-6 sentence reflection.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$mindset-practice$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 6, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-05$mj$, 'individual', $mj$Do one thing this month that scares you$mj$, $mj$Once a month, deliberately do something outside your comfort zone as a builder, on purpose.$mj$, $mj$# Do one thing this month that scares you

## Task Description
Once a month, deliberately do one thing that genuinely makes you uncomfortable as a builder or founder — cold-emailing a stranger, presenting in front of people, posting something publicly you could be wrong about, asking for money, admitting you don't know something. Pick something that actually costs you something to do, not a token gesture. This is the direct, repeatable action version of the Grit and Mindset reading tasks — building comfort with discomfort as a monthly habit rather than a one-time realization.

## Requirements
- The thing must genuinely make you uncomfortable — if it felt easy, it doesn't count.
- It must be a real action with a real outcome (sent, posted, said out loud to a real person), not a private plan.
- Write 2-3 sentences on what you did and what actually happened when you did it.
- Pick something different from last month — the goal is expanding the zone, not repeating the same rep.

## Evidence Required
The 2-3 sentence account of what you did and what happened.$mj$, 'founder-mindset', 'medium', 2,
   1.5, 35, 28, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Doing something impressive-looking. A small, honest stretch that actually scared you beats a big showy gesture that didn't. Recurring task: compare against previous submissions and reject a copy-paste repeat.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text names one specific action taken that was genuinely uncomfortable (cold email, public post, presenting, asking for money, admitting not knowing).", "2. The text states the action actually happened with a real outcome (sent, posted, said to a real person) and what happened next.", "3. The text says why this was uncomfortable for this student."]}, {"category": "Reject if:**", "points": ["- The action is only planned or decided privately, not done.", "- For a repeat submission, the entry repeats a previous submission instead of being a new one.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 2-3 sentence account of what you did and what happened.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$mindset-practice$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 7, true, true, 28, 'monthly', false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-06$mj$, 'individual', $mj$List three problems you've personally felt strongly about$mj$, $mj$Name three problems you care enough about to want to fix, as a starting point for idea direction.$mj$, $mj$# List three problems you've personally felt strongly about

## Task Description
List three problems you've personally felt strongly enough about to want to fix.

## Requirements
- Each problem should be one you've personally experienced or witnessed closely — not a problem you've only read about.
- Write one sentence per problem on why it bothers you.

## Evidence Required
The list of three problems with the one-sentence "why" for each.$mj$, 'business-fundamentals', 'medium', 1,
   0.5, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Picking "fundable" problems. Personal conviction is what this list is for — feasibility comes later.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Exactly three problems are listed.", "2. Each problem has a one-sentence reason it bothers the student personally.", "3. For each problem, the text shows the student experienced or witnessed it closely."]}, {"category": "Reject if:**", "points": ["- Fewer than three problems are listed.", "- Reasons are market-size or 'fundable' justifications rather than personal conviction.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The list of three problems with the one-sentence "why" for each.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-business$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 8, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-07$mj$, 'individual', $mj$Write a one-sentence problem statement without mentioning a solution$mj$, $mj$Describe a real problem in one sentence, with zero mention of how you'd solve it.$mj$, $mj$# Write a one-sentence problem statement without mentioning a solution

## Task Description
Write a single sentence describing a real problem you're exploring — who has it, and why it matters to them — with absolutely no mention of a solution, product, or feature.

## Requirements
- One sentence only.
- Must name who has the problem, specifically.
- Zero solution language ("app," "platform," "tool," "using AI to...") allowed anywhere in the sentence.

## Evidence Required
The one sentence.$mj$, 'founder-mindset', 'medium', 1,
   0.25, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Making the problem sound big or exciting. Precision beats drama here.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submission contains a single-sentence problem statement.", "2. The sentence names specifically who has the problem.", "3. The sentence says why the problem matters to those people."]}, {"category": "Reject if:**", "points": ["- The sentence contains solution language: app, platform, tool, product, feature, 'using AI to', or any description of how it would be solved.", "- The statement runs to more than one sentence.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The one sentence.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$problem-framing$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 9, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-08$mj$, 'individual', $mj$Practice the 5 Whys on a problem you care about$mj$, $mj$Take one of your three problems and dig underneath it — ask "why" five times to find the real root cause.$mj$, $mj$# Practice the 5 Whys on a problem you care about

## Task Description
Pick one of the three problems from "List three problems you've personally felt strongly about" and apply the "5 Whys" technique: ask "why does this happen" about your own answer, five times in a row, to get from the surface symptom to something closer to the root cause.
## Requirements
- Start from one specific problem, not a vague category.
- Write out all 5 "why" steps, each answer feeding the next question — not 5 disconnected reasons.
- The 5th answer should feel meaningfully deeper than the 1st, not just a rephrasing of it.

## Evidence Required
The written 5-Whys chain, from the original problem to the 5th answer.$mj$, 'business-fundamentals', 'medium', 1,
   0.5, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Landing on the "correct" root cause. This is a habit of digging deeper, not a diagnosis that has to be perfectly right.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text starts from one specific, named problem.", "2. All five 'why' steps are written out.", "3. Each answer responds to the previous answer, forming a chain rather than five disconnected reasons.", "4. The fifth answer is meaningfully deeper than the first, not a rephrasing of it."]}, {"category": "Reject if:**", "points": ["- Fewer than five 'why' steps are written.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The written 5-Whys chain, from the original problem to the 5th answer.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-business$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 10, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-09$mj$, 'individual', $mj$Turn your unfair advantages into startup problems$mj$, $mj$List what you know unusually well, who you can reach easily, then generate a real problem from each.$mj$, $mj$# Turn your unfair advantages into startup problems

## Task Description
List 10 things you know unusually well because of your work, hobbies, family, community, or life experience. Then list 5 groups of people you can reach more easily than the average person. Finally, generate one real startup problem from each of those 5 groups.

## Requirements
- The 10-item list must be genuinely specific to your life, not generic knowledge.
- The 5 reachable groups must be real — people you could actually message or meet, not abstract categories.
- Each of the 5 problems must come from something that group actually experiences, not a problem you're assuming they have.

## Evidence Required
The 10-item list, the 5 groups, and the 5 problems.$mj$, 'founder-mindset', 'medium', 2,
   1.5, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Finding your "big idea." This connects lived experience to real problems — the point of the exercise is the connection itself, not landing on a winner.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. A list of 10 things the student knows unusually well, each specific to their own life.", "2. A list of 5 groups of people the student can reach more easily than average, described as real people they could message or meet.", "3. Five problems, one per group, each tied to something that group actually experiences."]}, {"category": "Reject if:**", "points": ["- Fewer than 10 items, 5 groups, or 5 problems.", "- The 10 items are generic knowledge anyone could list.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 10-item list, the 5 groups, and the 5 problems.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$founder-market-fit$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 11, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-10$mj$, 'individual', $mj$Ask 3 past collaborators what you should improve before co-founding with you$mj$, $mj$Ask three people you've worked with what they'd want you to improve before starting a company with you.$mj$, $mj$# Ask 3 past collaborators what you should improve before co-founding with you

## Task Description
Ask three people you've genuinely worked with before — a project, a job, a team — this exact question: "What would you want me to improve before starting a company with me?" Write down their honest answers, even the uncomfortable ones.

## Requirements
- All 3 must be people you've actually worked with, not just know socially.
- Ask the question close to verbatim — don't soften it into "any feedback for me?"
- Write down what they actually said, without editing out the parts that sting.

## Evidence Required
The three answers, as close to verbatim as you can manage.$mj$, 'founder-mindset', 'medium', 2,
   1, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Hearing that you're great to work with. Co-founder fit is a consequential, long-term decision — the honest, specific critiques are what actually make this task worth doing.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text identifies three people (name, initials or role) and how the student worked with each.", "2. The text confirms the question asked was close to 'What would you want me to improve before starting a company with me?'.", "3. Each of the three answers is recorded, and at least one is critical or uncomfortable."]}, {"category": "Reject if:**", "points": ["- Fewer than three answers are recorded.", "- All answers are praise with nothing to improve.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The three answers, as close to verbatim as you can manage.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$team-collaboration$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 12, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-11$mj$, 'individual', $mj$Run a self-timed 2-hour sprint from idea to shareable link$mj$, $mj$Give yourself a hard 2-hour limit to go from a blank idea to something you can share, then reflect on where AI helped and where it didn't.

[Can submit hackathon experience]$mj$, $mj$# Run a self-timed 2-hour sprint from idea to shareable link

## Task Description
Set a 2-hour timer and go from idea to a shareable link. Afterward, write two sentences on where AI actually saved you time and where it created cleanup work.

## Requirements
- Start the clock only once you have picked the idea — the 2 hours covers building, not deciding what to build.
- End with a link, even a rough one, that another person could open.
- Write the two-sentence reflection immediately after, while it's fresh.

## Evidence Required
The shareable link plus the two-sentence reflection.$mj$, 'building', 'medium', 3,
   2, 35, 28, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Building something impressive. The speed and the honest reflection are the actual task.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. A shareable link is included that another person could open (a hackathon submission link also counts).", "2. The text names the idea and states the build was held to about 2 hours.", "3. A two-sentence reflection names one concrete thing AI saved time on and one where it created cleanup work."]}, {"category": "Reject if:**", "points": ["- No link is included.", "- The reflection is missing either the 'AI helped' or the 'AI didn't help' half.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The shareable link plus the two-sentence reflection.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-tech$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 13, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-12$mj$, 'individual', $mj$Vibe-code one tiny tool that fixes a personal annoyance$mj$, $mj$Use an AI coding assistant to build one small working tool that removes friction from your own life.$mj$, $mj$# Vibe-code one tiny tool that fixes a personal annoyance

## Task Description
Use an AI coding assistant to "vibe-code" one tiny working tool — a script, a small automation, a scraper — that fixes something that bugs you personally, in a single sitting.

## Requirements
- The tool must actually run and do the thing, even in a minimal way.
- Scope it to something you can finish in one sitting.
- It's fine if you don't fully understand every line the assistant wrote — the goal is proving you can direct AI to working software.

## Evidence Required
A short description of what the tool does, plus the code or link to a screen recording/screenshot of it running.$mj$, 'building', 'medium', 3,
   2, 40, 32, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Code quality or elegance. A messy script that works beats a clean one that doesn't exist.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text describes what the tool does and the personal annoyance it fixes.", "2. Evidence the tool ran is included: the code, a screenshot, or a link to a recording or repository.", "3. The text names the AI coding assistant used."]}, {"category": "Reject if:**", "points": ["- No evidence of the tool running, only a description.", "- The tool is a generic tutorial exercise rather than a personal annoyance.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$A short description of what the tool does, plus the code or link to a screen recording/screenshot of it running.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-tech$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 14, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P1-13$mj$, 'individual', $mj$Run a monthly founder retrospective$mj$, $mj$Once a month, honestly review what went well, what genuinely failed, and what you're changing next.$mj$, $mj$# Run a monthly founder retrospective

## Task Description
Once a month, write a short retrospective on yourself as a builder: one real thing that went well, one real failure or setback and what it taught you, and one specific thing you're changing next month because of it. This is the compounding habit version of the Mindset and Grit reading tasks and the one-off failure-reflection task — treating regular, honest self-review as a normal monthly rhythm rather than a one-time exercise.

## Requirements
- Must cover all three parts: a real win, a real failure/setback with the lesson, and one specific change for next month.
- The failure must be genuine, not a humble-brag — if nothing clearly failed this month, write about what you avoided or didn't attempt, honestly.
- The "change for next month" must be specific enough to check next time, not "try harder."
- Do this again next month — the value is in the pattern across months, not any single entry.

## Evidence Required
The written retrospective (win / failure+lesson / next change), dated.$mj$, 'founder-mindset', 'medium', 2,
   1, 50, 40, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Sounding productive. An honest account of what didn't work is worth more than a polished highlight reel. Recurring task: compare against previous submissions and reject a copy-paste repeat.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The entry is dated.", "2. One real thing that went well.", "3. One real failure or setback and what it taught, or an honest note on what was avoided or not attempted.", "4. One specific change for next month, concrete enough to check next time."]}, {"category": "Reject if:**", "points": ["- The change is 'try harder' or similar.", "- For a repeat submission, the entry repeats a previous submission instead of being a new one.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The written retrospective (win / failure+lesson / next change), dated.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$mindset-practice$mj$,$mj$track-universal$mj$,$mj$phase-p1$mj$]::text[], 15, true, true, 28, 'monthly', false,
   (SELECT id FROM public.achievements WHERE name = $mj$Know Yourself & Experiment$mj$ AND context = 'individual')),
  ($mj$MJ-P2-01$mj$, 'individual', $mj$Get to know someone tackling a similar problem$mj$, $mj$Find and connect with a person working on a similar problem to yours — a potential peer, collaborator, or future co-founder.$mj$, $mj$# Get to know someone tackling a similar problem

## Task Description
Find one person — a student, builder, or founder — who's interested in or already working on a problem similar to yours, and have a real conversation with them. This is about building the peer network 500 Global and Y Combinator both point to as one of the highest-value things a founder can have early — people solving adjacent problems who you can trade notes and encouragement with, not a customer and not a mentor.

## Requirements
- The person should be a peer working on or genuinely interested in a similar problem space — not a customer, not a mentor, not someone unrelated.
- Have a real conversation (call, video, or in person) about what they're building or exploring and why.
- Write 2-3 sentences on one thing you have in common and one thing you'd do differently from each other.

## Evidence Required
The 2-3 sentence reflection on the conversation.$mj$, 'customer-discovery', 'medium', 2,
   1, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Finding your exact clone. An adjacent problem or a different angle on the same one still counts.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text identifies the person (name, initials or role) and the problem they are working on or exploring.", "2. The text confirms a real conversation happened (call, video or in person).", "3. A 2-3 sentence reflection names one thing in common and one thing the two would do differently."]}, {"category": "Reject if:**", "points": ["- The person is a customer or a mentor rather than a peer.", "- The reflection is vague ('nice to connect') with no specific difference named.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 2-3 sentence reflection on the conversation.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-talk-to-people$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 16, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-02$mj$, 'individual', $mj$Look at market trends and rules, and find three surprises$mj$, $mj$Look at a few sources on market shifts or regulation and write down what actually surprised you.$mj$, $mj$# Skim current market trend and regulation sources for three surprises

## Task Description
Skim two or three sources on current market trends — e.g. a recent industry trends report, or a regulation tracker relevant to a field you're curious about. Note three things that surprised you.

## Requirements
- Use at least two distinct sources.
- The three notes must be genuine surprises to you, not things you already knew.

## Evidence Required
The three surprise notes, with which source each came from.$mj$, 'business-fundamentals', 'medium', 2,
   1, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Picking the "right" trends. Curiosity and honest surprise are the point, not prediction accuracy.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. At least two distinct sources are named (title, publisher or URL).", "2. Three surprises are listed.", "3. Each surprise says which source it came from."]}, {"category": "Reject if:**", "points": ["- Fewer than two sources or fewer than three surprises.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The three surprise notes, with which source each came from.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-business$mj$,$mj$track-business$mj$,$mj$phase-p2$mj$]::text[], 17, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-03$mj$, 'individual', $mj$Surface an underserved need from outside your usual circle$mj$, $mj$Talk to someone outside your normal circle about a daily frustration they've stopped noticing.$mj$, $mj$# Surface an underserved need from outside your usual circle

## Task Description
Find one underserved need by talking to someone outside your usual circle — a parent, a relative, someone in a completely different industry — about a daily frustration they've stopped noticing because it's normal to them.

## Requirements
- The person must be outside your usual circle (not another student, not someone in tech/startups).
- Ask about their day-to-day frustrations, not their opinion of your ideas.
- Write down the specific frustration they described, in their own words if possible.

## Evidence Required
One written note describing the person's context and the frustration they named.$mj$, 'business-fundamentals', 'medium', 2,
   1, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Finding a "good idea." Noticing a real, unglamorous frustration is the actual skill.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text describes the person's context and why they are outside the student's usual circle (not a student, not in tech or startups).", "2. The text records the specific daily frustration they described, in their own words where possible."]}, {"category": "Reject if:**", "points": ["- The person is a classmate or someone in tech or startups.", "- The note is a business-opportunity pitch instead of the person's frustration.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$One written note describing the person's context and the frustration they named.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-business$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 18, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-04$mj$, 'individual', $mj$Cold-message 5 potential users you don't know$mj$, $mj$Reach out to 5 strangers who might have the problem you're exploring, and ask to talk.$mj$, $mj$# Cold-message 5 potential users you don't know

## Task Description
Cold-message 5 people you have no prior relationship with — not friends, not classmates — who might plausibly have the problem you're exploring, and ask if they'd talk to you for 10-15 minutes.

## Requirements
- All 5 must be strangers before this task — no friends, family, or existing acquaintances.
- Use any real channel (LinkedIn, email, a DM, a community forum) — a real message sent to a real account.
- Write down how many replied and how many said yes to talking.

## Evidence Required
The 5 messages (or a description of each), plus the reply/yes count.$mj$, 'customer-discovery', 'medium', 2,
   1, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Getting all 5 to say yes. Sending 5 genuine cold messages is the actual skill — a low reply rate is normal, useful information.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Five messages are pasted or described, each to a named or described stranger.", "2. The channel used for each is stated (LinkedIn, email, DM, forum).", "3. The reply count and the yes-to-talking count are stated."]}, {"category": "Reject if:**", "points": ["- Fewer than five messages.", "- Any recipient is a friend, classmate or existing acquaintance.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 5 messages (or a description of each), plus the reply/yes count.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$customer-discovery$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 19, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-05$mj$, 'individual', $mj$Find evidence that your idea is wrong$mj$, $mj$Write your strongest assumption, then interview 3 people specifically looking for evidence that it's false.$mj$, $mj$# Find evidence that your idea is wrong

## Task Description
Write down your single strongest assumption about a problem or idea. Then interview 3 people specifically hunting for evidence that contradicts it — not evidence that confirms it. Report honestly what you learned, even if it means the assumption held up.

## Requirements
- State the assumption in one sentence before you talk to anyone.
- Go into each conversation explicitly trying to disprove it, not confirm it.
- Report what you actually found, including if the assumption survived intact.

## Evidence Required
The assumption, and an honest report of what the 3 conversations turned up.$mj$, 'customer-discovery', 'medium', 2,
   1.5, 40, 32, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Proving yourself wrong. Genuinely trying to is what shifts you from "validate my idea" to "discover reality" — the outcome either way is useful.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The assumption is stated in one sentence.", "2. Three conversations are described (who, roughly when).", "3. For each conversation, the text says what contradicting evidence was looked for and what was found.", "4. An honest conclusion states whether the assumption weakened, broke, or survived."]}, {"category": "Reject if:**", "points": ["- Fewer than three conversations.", "- The text only confirms the assumption with no visible attempt to disprove it.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The assumption, and an honest report of what the 3 conversations turned up.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$customer-discovery$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 20, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-06$mj$, 'individual', $mj$Run a 3-conversation Mom-Test sequence on one problem$mj$, $mj$Have 3 Mom-Test conversations about the same problem, including at least one stranger, and track how your belief changes.$mj$, $mj$# Run a 3-conversation Mom-Test sequence on one problem

## Task Description
Have 3 separate Mom-Test conversations about the same specific problem — including at least one person you did not know before this task. Use the standard interview guidance: ask about the hardest part of the problem, the last time it happened, why it was hard, what they've already tried, and what they dislike about their current solution — focus on specific past behavior, not hypothetical future intentions. After each conversation, write down what changed in your belief about the problem.

## Requirements
- All 3 conversations must be about the same problem, not three different topics.
- At least one of the 3 people must be someone you didn't know before this task.
- After each of the 3, write 1-2 sentences on what changed in your belief — not just notes on what they said.
- No pitching, same as the base Mom-Test task.

## Evidence Required
Notes from all 3 conversations, plus the after-each belief-change note.$mj$, 'customer-discovery', 'medium', 3,
   2, 60, 48, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: All 3 people agreeing with you. A belief that survives contact with 3 different people, including a stranger, means something; one that only survives with people who already like you doesn't.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. One problem is named and all three conversations are about it.", "2. Notes from each of the three conversations cover past behaviour (last time it happened, what they tried, what they dislike about the current solution).", "3. At least one interviewee is identified as someone the student did not know before this task.", "4. After each conversation there is a 1-2 sentence note on what changed in the student's belief."]}, {"category": "Reject if:**", "points": ["- Fewer than three conversations.", "- None of the three people was a stranger.", "- The notes show the student pitched a solution.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$Notes from all 3 conversations, plus the after-each belief-change note.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$customer-discovery$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 21, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-07$mj$, 'individual', $mj$Get one stranger onto a 15-minute user interview$mj$, $mj$Go beyond messaging — get one person you didn't know before onto a real 15-minute conversation.$mj$, $mj$# Get one stranger onto a 15-minute user interview

## Task Description
Recruit one person you didn't know before this task started onto an actual 15-minute interview (call, video, or in person) about a problem you're exploring.

## Requirements
- The person must be someone you had no relationship with before you reached out for this task.
- The conversation must actually happen and last at least 15 minutes.
- Use the Mom-Test approach: ask about their real past experience, not hypothetical opinions.

## Evidence Required
Who the person was, how you found them, and 2-3 things you learned.$mj$, 'customer-discovery', 'medium', 2,
   1, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: A polished interview. Successfully recruiting and running it with someone new is the real skill here.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text says who the person was and how they were found.", "2. The text confirms the interview happened and lasted at least 15 minutes.", "3. 2-3 things learned about the person's real past experience are listed."]}, {"category": "Reject if:**", "points": ["- The person was known to the student before this task.", "- The learnings are hypothetical opinions rather than past experience.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$Who the person was, how you found them, and 2-3 things you learned.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$customer-discovery$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 22, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-08$mj$, 'individual', $mj$Find out what budget the problem already comes from$mj$, $mj$Ask a real person what budget or spending category their problem already falls under, and what would make them pay for a solution.$mj$, $mj$# Find out what budget the problem already comes from

## Task Description
Ask someone with the problem you're exploring what budget or spending category the problem already falls under (a team budget, a personal expense, "nothing — we just live with it"), and what would have to be true for them to pay a specific amount (name a real number, €X) for a solution.

## Requirements
- Ask specifically about an existing budget or spending category, not a hypothetical one.
- Name a real, specific €X amount when asking what it would take for them to pay.
- Write down their honest answer, including "I wouldn't" or "nothing would convince me."

## Evidence Required
What budget category they named (or didn't have), and their answer to the €X question.$mj$, 'customer-discovery', 'medium', 1,
   0.5, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Getting a "yes, I'd pay." A clear "no, and here's why" is just as valuable as a yes.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text says who was asked and about which problem.", "2. The budget or spending category they named is recorded (or 'nothing, we just live with it').", "3. The specific euro amount the student named is stated.", "4. Their answer to the euro-amount question is recorded, including a no."]}, {"category": "Reject if:**", "points": ["- No euro amount was named in the ask.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$What budget category they named (or didn't have), and their answer to the €X question.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$willingness-to-pay$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 23, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-09$mj$, 'individual', $mj$Tell 5 people about your idea and gather their feedback$mj$, $mj$Unlike the Mom-Test task, this one is about actually pitching — tell 5 people your idea and see how they react.$mj$, $mj$# Tell 5 people about your idea and gather their feedback

## Task Description
Tell 5 different people about your idea and ask for honest feedback. This is the deliberate opposite of the Mom-Test task above: there, you don't pitch; here, you do — because sharing your idea out loud, hearing real reactions, and not being precious about it is its own skill (the Y Combinator instinct of not being a stealth founder). Both matter; they're not the same conversation.

## Requirements
- Tell 5 different people — friends, family, classmates, strangers, any mix is fine here (unlike the Mom-Test task, which needs real potential users).
- Actually describe your idea and what it does, rather than just the problem.
- Ask directly for their honest reaction, including what confused them or what they didn't buy.
- Write down one specific piece of feedback from each of the 5 that you didn't expect.

## Evidence Required
The 5 specific, unexpected pieces of feedback, one per person.$mj$, 'customer-discovery', 'medium', 2,
   1, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Getting praise. An honest reaction that stings a little is worth more than 5 polite thumbs-ups.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Five different people are identified.", "2. The text confirms the idea itself (what it does) was described, not only the problem.", "3. One specific, unexpected piece of feedback per person is recorded (five total)."]}, {"category": "Reject if:**", "points": ["- Fewer than five people.", "- The feedback is generic ('they liked it', 'good luck') rather than specific reactions.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 5 specific, unexpected pieces of feedback, one per person.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-talk-to-people$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 24, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-10$mj$, 'individual', $mj$Pitch your idea to someone in 60 seconds, then ask them what they think it does$mj$, $mj$Give a 60-second pitch, then immediately ask the listener to explain it back to you.$mj$, $mj$# Pitch your idea to someone in 60 seconds, then ask them what they think it does

## Task Description
Pitch your idea to a real person in 60 seconds or less, then immediately ask them to explain back to you, in their own words, what they think it does.

## Requirements
- Time-box the pitch to 60 seconds.
- Ask them to explain it back immediately afterward, before you clarify anything.
- Write down what they said it does, word for word if you can.

## Evidence Required
What you pitched (briefly) and what they said it does.$mj$, 'founder-mindset', 'medium', 1,
   0.5, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Them getting it exactly right. A gap between what you meant and what they heard is exactly the useful information here.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. A brief summary of what was pitched.", "2. Who listened is stated.", "3. What the listener said the idea does is recorded, as close to verbatim as possible."]}, {"category": "Reject if:**", "points": ["- The listener's own explanation is missing.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$What you pitched (briefly) and what they said it does.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$communication$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 25, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-11$mj$, 'individual', $mj$Ask a founder a tactical business question$mj$, $mj$Message a founder and ask one concrete question about GTM, fundraising, or early hiring. Repeatable every two weeks.$mj$, $mj$# Ask a founder a tactical business question

## Task Description
Message one founder or upperclassman running a startup and ask them one specific, tactical question about the business side — how they found their first customers, how a fundraising conversation actually went, how they made an early hire — not "any advice?" but something concrete you actually want to know.

## Requirements
- The question must be specific enough that a generic answer wouldn't satisfy it.
- Send the message — this task is complete on send, not on reply.
- Ask a different person or a different question each time you repeat this task.

## Evidence Required
The question you sent, and the reply if you received one.$mj$, 'customer-discovery', 'medium', 1,
   0.5, 20, 16, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Getting a reply. Sending a sharp, specific business question is the actual skill being practiced. Recurring task: compare against previous submissions and reject a copy-paste repeat.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text says who was messaged (a founder or upperclassman running a startup) and what they run.", "2. The exact question sent is pasted or closely quoted.", "3. The question is specific and tactical (first customers, a fundraising conversation, an early hire) so a generic answer would not satisfy it.", "4. The text confirms the message was sent; the reply is included if one was received."]}, {"category": "Reject if:**", "points": ["- The question is 'any advice?'-style generic.", "- For a repeat submission, the same person and the same question as a previous submission.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The question you sent, and the reply if you received one.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-talk-to-people$mj$,$mj$track-business$mj$,$mj$phase-p2$mj$]::text[], 26, true, true, 14, 'biweekly', false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-12$mj$, 'individual', $mj$Ask a technical builder a tactical question$mj$, $mj$Message someone building real technical products and ask one concrete, tactical question. Repeatable every two weeks.$mj$, $mj$# Ask a technical builder a tactical question

## Task Description
Message one developer, technical founder, or upperclassman building real software or hardware, and ask them one specific, tactical question about how they actually build — not "any advice?" but something concrete you actually want to know (tool choices, how they shipped fast, how they debug, how they picked their stack).

## Requirements
- The question must be specific enough that a generic answer wouldn't satisfy it.
- Send the message — this task is complete on send, not on reply.
- Ask a different person or a different question each time you repeat this task.

## Evidence Required
The question you sent, and the reply if you received one.$mj$, 'customer-discovery', 'medium', 1,
   0.5, 20, 16, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Getting a reply. Sending a sharp, specific technical question is the actual skill being practiced. Recurring task: compare against previous submissions and reject a copy-paste repeat.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text says who was messaged (a developer, technical founder or upperclassman building real software or hardware).", "2. The exact question sent is pasted or closely quoted.", "3. The question is specific and tactical (tool choices, shipping fast, debugging, stack) so a generic answer would not satisfy it.", "4. The text confirms the message was sent; the reply is included if one was received."]}, {"category": "Reject if:**", "points": ["- The question is 'any advice?'-style generic.", "- For a repeat submission, the same person and the same question as a previous submission.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The question you sent, and the reply if you received one.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-talk-to-people$mj$,$mj$track-tech$mj$,$mj$phase-p2$mj$]::text[], 27, true, true, 14, 'biweekly', false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-13$mj$, 'individual', $mj$Ask someone for hard, critical feedback this month$mj$, $mj$Once a month, deliberately ask a person you trust to tell you the hardest thing they think you need to hear.$mj$, $mj$# Ask someone for hard, critical feedback this month

## Task Description
Once a month, ask a mentor, peer, teammate, or user to give you honest, critical feedback on your biggest current weakness or blind spot as a builder — not general encouragement. Write down the hardest piece of feedback you received and what, specifically, you're going to do about it. This builds the muscle of seeking out discomfort on purpose, rather than only hearing hard truths by accident.

## Requirements
- Explicitly ask for critical feedback, not general encouragement — say so directly to the person.
- The person must know you well enough to say something real (not a stranger giving generic advice).
- Write down the actual hardest thing they said, even if it stings, not a softened version.
- Name one specific action you're taking because of it.
- Ask a different person, or dig into a different weakness, each time you repeat this task.

## Evidence Required
The hardest feedback point, verbatim or close to it, plus the specific action you're taking.$mj$, 'customer-discovery', 'medium', 1,
   0.5, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Feeling good afterward. If it didn't sting at least a little, it probably wasn't hard enough feedback. Recurring task: compare against previous submissions and reject a copy-paste repeat.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text says who was asked and how they know the student.", "2. The text confirms critical feedback was explicitly asked for, not general encouragement.", "3. The hardest piece of feedback is recorded verbatim or close to it.", "4. One specific action the student is taking because of it is named."]}, {"category": "Reject if:**", "points": ["- The action is vague ('I'll keep it in mind').", "- For a repeat submission, the same person and the same weakness as a previous submission.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The hardest feedback point, verbatim or close to it, plus the specific action you're taking.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-talk-to-people$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 28, true, true, 28, 'monthly', false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-14$mj$, 'individual', $mj$Practice ruthless scoping: cut 80% of an idea and defend what's left$mj$, $mj$Take an idea with a long feature list, pick one thing to build in 8 hours, then cut 80% of the scope and defend what remains.$mj$, $mj$# Practice ruthless scoping: cut 80% of an idea and defend what's left

## Task Description
Take an idea — real or hypothetical — with a long list of possible features (aim for around 20), and imagine you have 8 hours to build something. Pick exactly one feature to build and explain why. Then, separately, take a full idea's scope and delete 80% of it while explaining why what remains still delivers the core value.

## Requirements
- Start from a real list of at least ~15-20 possible features or scope items, not a pre-trimmed list.
- Name exactly one feature you'd build in 8 hours, with a specific reason.
- For the 80%-cut exercise, explicitly state what you removed and why what's left is still the core value, not a diminished version of it.

## Evidence Required
The original feature list, the one 8-hour pick with reasoning, and the 80%-cut scope with reasoning.$mj$, 'founder-mindset', 'medium', 2,
   1, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: The final scope looking impressive. Making yourself actually cut, and defending the cut in words, is the skill — founders drown in possibilities, and this is the muscle for getting out.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. An original list of at least 15 features or scope items is included.", "2. Exactly one feature is picked to build in 8 hours, with a specific reason.", "3. The 80%-cut version lists what was removed and explains why what remains still delivers the core value."]}, {"category": "Reject if:**", "points": ["- Fewer than 15 items in the original list.", "- No single 8-hour pick is named.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The original feature list, the one 8-hour pick with reasoning, and the 80%-cut scope with reasoning.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$prioritization$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 29, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-15$mj$, 'individual', $mj$Do one thing that doesn't scale to delight or acquire a user$mj$, $mj$Do something manual and personal — that could never scale — to win over one specific user.$mj$, $mj$# Do one thing that doesn't scale to delight or acquire a user

## Task Description
Do one deliberately unscalable thing — the Paul Graham "do things that don't scale" idea — to delight or win over a single specific user: hand-deliver something, personally onboard them, build them a one-off customization, write them a personal note.

## Requirements
- Must be something a large company could never bother doing for one person.
- Must target one specific, real person.
- Write down what you did and how they reacted.

## Evidence Required
What you did, for whom, and their reaction.$mj$, 'business-fundamentals', 'medium', 2,
   1, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: How clever the gesture was. Actually doing something disproportionate for one real person is the point.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. What was done is described concretely.", "2. One specific, real person it was done for is named or described.", "3. Their reaction is recorded.", "4. The text explains why a large company would never do this for one person."]}, {"category": "Reject if:**", "points": ["- The action is a plan, not something already done.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$What you did, for whom, and their reaction.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$distribution$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 30, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-16$mj$, 'individual', $mj$Get 10 people to visit something you created, with no paid ads$mj$, $mj$Drive 10 real visits to something you built, using only free channels.$mj$, $mj$# Get 10 people to visit something you created, with no paid ads

## Task Description
Get 10 real people to visit or view something you've created — a page, a prototype, a post — using only free methods. No paid advertising of any kind.

## Requirements
- Zero paid promotion — organic outreach only (messages, posts, communities, personal network).
- Must be 10 genuinely separate people, not the same person refreshing the page.
- Track how you found each visitor, even roughly (which channel).

## Evidence Required
The visit count and a rough breakdown of which channels produced them.$mj$, 'business-fundamentals', 'medium', 3,
   2, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Getting more than 10. Ten real, organically-driven visits, honestly tracked, is the whole task.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. A link to or description of what was created.", "2. A visit count of at least 10 is stated, with its source (an analytics screenshot, a tool's counter, or a manual list of people).", "3. A rough breakdown of which channel produced which visitors.", "4. The text confirms zero paid promotion was used."]}, {"category": "Reject if:**", "points": ["- Any paid promotion was used.", "- Fewer than 10 visits.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The visit count and a rough breakdown of which channels produced them.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$distribution$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 31, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-17$mj$, 'individual', $mj$Try to sell something before you feel ready$mj$, $mj$Directly ask someone: would you pay €10, €50, or €100 for me to make this work for you?$mj$, $mj$# Try to sell something before you feel ready

## Task Description
Take something you've built — even a rough 2-3 hour prototype — and ask a real potential customer directly: "Would you pay €10, €50, or €100 for me to make this work for you?" Ask before you feel ready. They don't have to say yes — the task is making the ask.

## Requirements
- Must be a direct ask naming at least one real euro amount.
- Must happen before you feel fully ready — that discomfort is part of the task.
- Write down exactly what they said, yes or no.

## Evidence Required
What you asked, the amount(s) named, and their real response.$mj$, 'customer-discovery', 'medium', 2,
   1, 40, 32, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: A yes. Making yourself do the uncomfortable ask, and recording the honest result, is the actual founder skill being built here.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. What was built or offered is described or linked.", "2. Who was asked is described as a real potential customer.", "3. The exact ask is recorded with at least one euro amount.", "4. Their real response is recorded, yes or no."]}, {"category": "Reject if:**", "points": ["- No euro amount in the ask.", "- The person is a friend doing a favour rather than a potential customer.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$What you asked, the amount(s) named, and their real response.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$willingness-to-pay$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 32, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P2-18$mj$, 'individual', $mj$Collect three real no's$mj$, $mj$Make ambitious asks — for interviews, meetings, tests, sales, intros, or help — until you get three genuine no's.$mj$, $mj$# Collect three real no's

## Task Description
Deliberately collect three real rejections. Ask for things ambitious enough that a "no" is a genuine possibility — a customer interview, a founder meeting, someone to test your product, a sale, an introduction, or help. The task is not to get three yeses; it's to make asks ambitious enough that you receive three genuine no's.

## Requirements
- The asks must be real, sent to real people, with a real chance of rejection.
- A "no" only counts if the ask was genuinely ambitious — an easy ask that gets declined doesn't count.
- Write down all 3 no's, what you asked for, and how it felt.

## Evidence Required
The three asks, the three no's, and a short note on how each felt.$mj$, 'founder-mindset', 'medium', 2,
   1, 40, 32, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Getting the three no's over with quickly. The discomfort of making the ask, and staying in it, is what this task is actually building.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Three asks are described, each made to a real person.", "2. Each ask is ambitious enough that a no was a real possibility (an interview, a meeting, a sale, an intro, help).", "3. Three actual no's are recorded, not silence or near-misses.", "4. A short note on how each no felt."]}, {"category": "Reject if:**", "points": ["- Any of the three is a non-response or near-miss rather than a stated no.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The three asks, the three no's, and a short note on how each felt.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$mindset-practice$mj$,$mj$track-universal$mj$,$mj$phase-p2$mj$]::text[], 33, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Get Outside the Building$mj$ AND context = 'individual')),
  ($mj$MJ-P3-01$mj$, 'individual', $mj$Compare ways to build an MVP, then pick one$mj$, $mj$Look at no-code tools, AI coding, and building from scratch — then practice picking one for a made-up idea.$mj$, $mj$# Compare ways to build an MVP, then pick one

## Task Description
Look at a short primer comparing ways to build an MVP — no-code tools, AI coding, and building from scratch — then practice picking one for a made-up idea, with a reason why.

## Requirements
- Cover all three ways, at least briefly (no-code, AI coding, from scratch).
- Pick any idea, real or made up.
- Write 1-2 sentences on which one you'd start with and why (speed, what you'd learn, or what the idea actually needs).

## Evidence Required
- The 1-2 sentence decision and reason.$mj$, 'building', 'medium', 1,
   0.5, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Picking the "most technical" option to look impressive. The fastest path to a working prototype usually wins.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text mentions all three ways to build (no-code tools, AI coding, from scratch) at least briefly.", "2. The idea used for the exercise is named (real or made up).", "3. A 1-2 sentence decision names which way to start with and why (speed, what you'd learn, or what the idea needs)."]}, {"category": "Reject if:**", "points": ["- Only one approach is considered.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 1-2 sentence decision and reason.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-tech$mj$,$mj$track-tech$mj$,$mj$phase-p3$mj$]::text[], 34, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-02$mj$, 'individual', $mj$Explore new AI or developer tools you haven't used$mj$, $mj$Try two or three AI tools, APIs, or frameworks that are new to you and note what they newly make possible.$mj$, $mj$# Explore new AI or developer tools you haven't used

## Task Description
Explore two or three AI tools, developer frameworks, or APIs you haven't used before — e.g. YC's public "Requests for Startups" for where the frontier is heading, or a new model/tool release — and note what each newly makes possible that wasn't practical before.

## Requirements
- Try or read hands-on documentation for at least two distinct tools — not just headlines about them.
- Write one note per tool on a concrete thing it now makes possible or easy.

## Evidence Required
The notes on each tool and what it newly enables.$mj$, 'building', 'medium', 2,
   1, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Picking the most hyped tools. Genuinely useful and quietly useful both count.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. At least two distinct tools, frameworks or APIs are named.", "2. For each, the text says how it was tried or which documentation was read hands-on.", "3. One note per tool names a concrete thing it now makes possible or easy."]}, {"category": "Reject if:**", "points": ["- Notes only say the tool is impressive without naming a capability.", "- The only source is a headline or summary article.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The notes on each tool and what it newly enables.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-tech$mj$,$mj$track-tech$mj$,$mj$phase-p3$mj$]::text[], 35, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-03$mj$, 'individual', $mj$Find 3 existing solutions to one problem and explain why users still tolerate the problem$mj$, $mj$Research 3 ways people currently deal with a problem, and explain why none of them have fully solved it.$mj$, $mj$# Find 3 existing solutions to one problem and explain why users still tolerate the problem

## Task Description
Pick one problem you're exploring, find 3 different existing ways people currently deal with it — real products, services, or manual workarounds ("doing nothing" or "using a spreadsheet" both count) — and explain why people still tolerate the problem despite these existing options.

## Requirements
- All 3 must be real, currently-used solutions — not hypothetical ones you invented.
- At least one can be a non-product workaround (a spreadsheet, a habit, doing nothing).
- Write one specific reason each solution falls short, in the user's terms, not yours.

## Evidence Required
The 3 solutions and the reason each still leaves the problem unsolved.$mj$, 'customer-discovery', 'medium', 2,
   1.5, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Proving your idea is better. Understanding why the status quo persists is the actual goal.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. One problem is named.", "2. Three real, currently used solutions are listed (products, services or manual workarounds).", "3. One specific reason each falls short, in the user's terms.", "4. An explanation of why people still tolerate the problem despite these options."]}, {"category": "Reject if:**", "points": ["- Any solution is invented or hypothetical.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3 solutions and the reason each still leaves the problem unsolved.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$competitive-analysis$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 36, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-04$mj$, 'individual', $mj$Use 3 competing products and compare what each does best$mj$, $mj$Sign up for and use three products competing in one category, and note what each understands about its customer better than the others.$mj$, $mj$# Use 3 competing products and compare what each does best

## Task Description
Sign up for and actually use three products that compete in one category relevant to your interests. For each one, write down one specific thing it understands about its customer better than the other two.

## Requirements
- Must actually sign up and use each product, not just read the marketing page.
- Exactly one specific customer-understanding insight per product — not a general feature list.
- The three insights must be genuinely different from each other.

## Evidence Required
The three products and their three distinct insights.$mj$, 'customer-discovery', 'medium', 3,
   2, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Picking a "winner." Understanding what each one gets right about its customer is the actual skill.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Three products competing in one category are named.", "2. Evidence of actual use of each: a screenshot from inside the product, or a specific detail only a user would know.", "3. One distinct customer-understanding insight per product."]}, {"category": "Reject if:**", "points": ["- The insights are feature lists.", "- Two or more insights are the same observation restated.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The three products and their three distinct insights.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$competitive-analysis$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 37, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-05$mj$, 'individual', $mj$Pick one startup idea and write: user / problem / existing workaround / why now$mj$, $mj$Break one idea down into its four core parts: who it's for, what problem, what people do today, and why now.$mj$, $mj$# Pick one startup idea and write: user / problem / existing workaround / why now

## Task Description
Pick one startup idea (yours or hypothetical) and write four short, separate answers: who the user is, what problem they have, what they currently do about it (the existing workaround), and why this idea makes more sense now than it would have a few years ago.

## Requirements
- Each of the 4 parts gets its own clear, specific answer — no combining them into one paragraph.
- The user must be specific (not "everyone" or "businesses").
- The "why now" answer must name something that's actually changed recently (technology, cost, behavior, regulation).

## Evidence Required
The four written answers.$mj$, 'business-fundamentals', 'medium', 2,
   1, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: A polished pitch. Four honest, specific answers matter more than how it reads.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Four separate answers: user, problem, existing workaround, why now.", "2. The user is a specific segment, not 'everyone' or 'businesses'.", "3. The existing workaround is described.", "4. The 'why now' names something that actually changed recently (technology, cost, behaviour, regulation)."]}, {"category": "Reject if:**", "points": ["- The answers are merged into one paragraph.", "- The 'why now' is only 'the market is growing'.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The four written answers.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$idea-evaluation$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 38, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-06$mj$, 'individual', $mj$Design an MVP you could launch tomorrow without writing any code$mj$, $mj$Design the smallest version of your idea that could go live tomorrow, using no code at all.$mj$, $mj$# Design an MVP you could launch tomorrow without writing any code

## Task Description
Design an MVP for an idea — real or hypothetical — that you could realistically launch tomorrow using zero code: a form, a spreadsheet, a manual process, a landing page built with a no-code tool, a phone number you personally respond to.

## Requirements
- Must involve genuinely zero code — no-code tools, manual processes, and existing platforms are all fine.
- Must be launchable within roughly 24 hours, not a multi-week no-code build.
- Explain what value it delivers despite having no real "product" behind it yet.

## Evidence Required
The MVP design and the one-paragraph explanation of the value it delivers.$mj$, 'building', 'medium', 2,
   1, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: How clever the no-code workaround is. Separating the value proposition from the technology is the actual lesson — the smallest thing that can deliver value and produce learning.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The MVP design is described with the tools or processes used (form, spreadsheet, manual process, no-code landing page, a phone number).", "2. The text states it could realistically go live within about 24 hours.", "3. One paragraph explains what value it delivers with no real product behind it."]}, {"category": "Reject if:**", "points": ["- Any custom code is required.", "- The design is a multi-week build.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The MVP design and the one-paragraph explanation of the value it delivers.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$prototyping$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 39, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-07$mj$, 'individual', $mj$Ship an AI-built prototype in under 3 hours$mj$, $mj$Use an AI builder to turn a small personal annoyance into a rough, clickable prototype in one sitting.$mj$, $mj$# Ship an AI-built prototype in under 3 hours

## Task Description
Pick any small personal annoyance and use an AI builder or coding assistant to produce a rough, clickable prototype or landing page in under 3 hours, then publish it somewhere — even if it's ugly.

## Requirements
- Time-box the build to a single sitting, 3 hours or less.
- The output must be reachable by a link (deployed page, shared prototype tool, etc.) — not just a local file.
- Rough and ugly is fine and expected; a finished-looking product is not the goal.

## Evidence Required
The live link to the published prototype.$mj$, 'building', 'medium', 3,
   3, 60, 48, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Design quality or feature completeness. Proving to yourself that "build" is fast now is the whole point — this applies whether you think of yourself as technical or not.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. A public link to the deployed prototype or landing page is included.", "2. The text names the personal annoyance it addresses and the AI builder or assistant used.", "3. The text states it was built in one sitting of 3 hours or less.", "4. The linked page loads as a real page (fetched as text or screenshot) or a screenshot of the live page is attached."]}, {"category": "Reject if:**", "points": ["- The link is local (localhost, a file path) or missing.", "- The link requires a login to view.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The live link to the published prototype.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-tech$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 40, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-08$mj$, 'individual', $mj$Build something with a stranger in 90 minutes$mj$, $mj$Find someone you've never worked with and build something real together in 90 minutes, then reflect on what made the collaboration easier or harder.$mj$, $mj$# Build something with a stranger in 90 minutes

## Task Description
Find someone you have never worked with before and build something together in 90 minutes — a tiny prototype, a piece of content, anything real and finished. Afterward, write down what made the collaboration easier or harder.

## Requirements
- The collaborator must be someone you've genuinely never worked with before.
- Actually build something together, in the same session, within 90 minutes.
- Write 2-3 sentences on what specifically made working together easier or harder.

## Evidence Required
What you built, who you built it with, and the reflection on the collaboration.$mj$, 'founder-mindset', 'medium', 2,
   1.5, 35, 28, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: What you built being impressive. Learning something real about how you work with an unfamiliar person under time pressure is the actual task.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The collaborator is identified and the text confirms the two had never worked together before.", "2. What was built is shown or described (link, screenshot or description).", "3. The text confirms it was built together in one session of about 90 minutes.", "4. A 2-3 sentence reflection names something specific that made the collaboration easier or harder."]}, {"category": "Reject if:**", "points": ["- The collaborator is a previous teammate.", "- The reflection is 'it went well' with no specifics.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$What you built, who you built it with, and the reflection on the collaboration.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$team-collaboration$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 41, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-09$mj$, 'individual', $mj$Ask someone to try your prototype while you watch silently$mj$, $mj$Hand your prototype to a real person and watch them use it without helping or explaining.$mj$, $mj$# Ask someone to try your prototype while you watch silently

## Task Description
Give a real prototype (yours or an early build) to someone who hasn't seen it before, and watch them try to use it — without explaining how it works, without helping, and without talking unless they're totally stuck.

## Requirements
- Say nothing to guide them beyond the bare minimum to get started.
- Watch what they actually do, not what they say they'd do.
- Write down every point where they got confused, stuck, or did something you didn't expect.

## Evidence Required
The list of confusion/stuck points, and what actually happened at each.$mj$, 'building', 'medium', 2,
   1, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: The prototype performing well. The confusion points are the actual data you're collecting.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The tester and the prototype are identified.", "2. The text confirms the student stayed silent beyond the minimum needed to get started.", "3. A list of the points where the tester got confused, stuck, or did something unexpected, with what happened at each."]}, {"category": "Reject if:**", "points": ["- The notes are about what the tester said afterwards rather than what they did.", "- The list of observed points is missing entirely.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The list of confusion/stuck points, and what actually happened at each.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$prototyping$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 42, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-10$mj$, 'individual', $mj$Try to get one real user for something you built$mj$, $mj$Get one person who wasn't involved in building it to actually start using what you made.$mj$, $mj$# Try to get one real user for something you built

## Task Description
Get one real person — who had no part in building it — to actually start using something you've made, even in a small way.

## Requirements
- The person must actually use it, not just say they will.
- You choose the outreach method — direct message, in person, a post, anything real.
- Write down how you found them and what "using it" looked like.

## Evidence Required
Who the user is, how you reached them, and evidence they actually used it.$mj$, 'business-fundamentals', 'medium', 2,
   1.5, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: A large number of users. One real user, honestly gained, is the whole task.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The user is identified and was not involved in building the thing.", "2. The text says how they were reached.", "3. Evidence they actually used it: a screenshot, a log, a message, or a specific action they took."]}, {"category": "Reject if:**", "points": ["- The user only agreed to look at it.", "- The user helped build it.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$Who the user is, how you reached them, and evidence they actually used it.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$distribution$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 43, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-11$mj$, 'individual', $mj$Test 3 different channels for finding users and track the funnel$mj$, $mj$Try three different ways of finding users for the same thing, and record each channel's funnel.$mj$, $mj$# Test 3 different channels for finding users and track the funnel

## Task Description
Try three different channels for finding users for the same thing you're building or exploring — for example outreach on a professional network, a community post, and cold email. For each channel, record the funnel: people contacted, responses, conversations, and users gained.

## Requirements
- All 3 channels must be genuinely different types (not three variations of the same DM).
- Track the same 4 numbers for each: contacted → responses → conversations → users.
- Note which channel performed best and your best guess at why.

## Evidence Required
The 3-channel funnel table and your one-line takeaway on which worked best.$mj$, 'business-fundamentals', 'medium', 3,
   2, 35, 28, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Every channel working. Seeing which one performs, and by how much, is the actual point of running three in parallel.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Three genuinely different channel types are named.", "2. For each channel, four numbers: contacted, responses, conversations, users.", "3. A one-line takeaway on which channel performed best and why."]}, {"category": "Reject if:**", "points": ["- Fewer than three channels or missing funnel numbers.", "- The channels are variations of the same DM.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3-channel funnel table and your one-line takeaway on which worked best.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$distribution$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 44, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P3-12$mj$, 'individual', $mj$Run a weekend founder sprint on your most promising idea$mj$, $mj$Spend a full weekend pushing one idea further than a quick prototype can — build, test, and come back with a real next step.$mj$, $mj$# Run a weekend founder sprint on your most promising idea

## Task Description
Pick the single idea you're most drawn to right now and give it a real weekend (roughly 8-16 hours across 2 days), inspired by the Y Combinator / Techstars culture of short, intense building sprints before committing further. Build past your first rough prototype, show it to at least 2 people outside your own head, and end the weekend with a specific, written next step.

## Requirements
- Pick one specific idea before the weekend starts — this is depth on one thing, not breadth across several.
- Spend real, blocked time across the weekend (not scattered 10-minute sessions) — roughly 8-16 hours total.
- Show the work-in-progress to at least 2 people outside your own head before the weekend ends, and note their reactions.
- End with a one-paragraph, specific next step — not "keep working on it."

## Evidence Required
A link or screenshots of what you built, notes from the 2+ reactions you gathered, and the written next-step paragraph.$mj$, 'building', 'medium', 5,
   12, 90, 72, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Finishing something polished. Getting further than your first rough version, with real reactions in hand, is the actual goal.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. One idea is named as chosen before the weekend.", "2. A link or screenshots of what was built.", "3. Rough hours spent across the weekend (about 8-16) are stated.", "4. Reactions from at least two people outside the student's own head are noted.", "5. A one-paragraph next step specific enough to check next week."]}, {"category": "Reject if:**", "points": ["- Fewer than two reactions.", "- The next step is 'keep working on it' or similar.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$A link or screenshots of what you built, notes from the 2+ reactions you gathered, and the written next-step paragraph.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-tech$mj$,$mj$track-universal$mj$,$mj$phase-p3$mj$]::text[], 45, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Become a Builder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-01$mj$, 'individual', $mj$Explain in one sentence why 3 ideas make sense now, not years ago$mj$, $mj$For three startup ideas, explain in one sentence why 2026 makes more sense than a few years earlier.$mj$, $mj$# Explain in one sentence why 3 ideas make sense now, not years ago

## Task Description
Take three startup ideas (yours or hypothetical) and explain, in one sentence each, why the idea would make more sense as a company today than it would have a few years earlier. Point to something concrete that's changed — AI capability, regulation, behavior, falling technology costs, new APIs, demographics.

## Requirements
- One sentence per idea, three total.
- Each must name something concrete that changed, not a vague "the market is bigger now."
- If you genuinely can't find a real "why now" for one idea, say so rather than inventing one.

## Evidence Required
The three ideas with their one-sentence "why now" answers.$mj$, 'business-fundamentals', 'medium', 2,
   1, 20, 16, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Every idea having a great "why now" story. This exercise is meant to separate an interesting problem from an actual startup opportunity — sometimes the honest answer is that it doesn't have one yet.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Three ideas are named.", "2. One sentence per idea.", "3. Each sentence names something concrete that changed (AI capability, regulation, behaviour, cost, new APIs, demographics), or honestly says there is no real 'why now'."]}, {"category": "Reject if:**", "points": ["- Any answer is a vague 'the market is bigger now'.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The three ideas with their one-sentence "why now" answers.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$idea-evaluation$mj$,$mj$track-universal$mj$,$mj$phase-p4$mj$]::text[], 46, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-02$mj$, 'individual', $mj$Write down your unfair advantages for three different startup ideas$mj$, $mj$For three different ideas, name the specific advantage you personally have that most people attempting it wouldn't.$mj$, $mj$# Write down your unfair advantages for three different startup ideas

## Task Description
Pick three different startup ideas (yours or hypothetical) and, for each one, write down your specific unfair advantage — something about your background, skills, network, or experience that most people attempting this idea wouldn't have.

## Requirements
- Three different ideas, three separate advantages.
- Each advantage must be specific to you, not generic ("I'm hardworking").
- If you genuinely have no real advantage for one of the three, say so honestly rather than inventing one.

## Evidence Required
The three ideas paired with their advantages (or honest "none" answers).$mj$, 'founder-mindset', 'medium', 2,
   1, 20, 16, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Having an advantage for every idea. Noticing where you don't is just as useful as where you do.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Three different ideas are named.", "2. One advantage per idea, specific to the student's background, skills, network or experience, or an honest 'none'."]}, {"category": "Reject if:**", "points": ["- The advantages are generic traits ('hardworking', 'passionate').", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The three ideas paired with their advantages (or honest "none" answers).$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$founder-market-fit$mj$,$mj$track-universal$mj$,$mj$phase-p4$mj$]::text[], 47, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-03$mj$, 'individual', $mj$Talk to someone who picked a competitor over your idea, and ask why$mj$, $mj$Find a person using a competing solution and ask them why they chose it.$mj$, $mj$# Talk to someone who picked a competitor over your idea, and ask why

## Task Description
Find one person who is currently using a competing product, service, or workaround instead of what you're building, and ask them why they chose it.

## Requirements
- The person must be an actual current user of the alternative, not someone speculating.
- Ask specifically why they chose that option over others, in their own words.
- Write down their actual reason, even if it's mundane ("it was already installed").

## Evidence Required
Who they are, what they use, and their stated reason.$mj$, 'customer-discovery', 'medium', 2,
   1, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Their reason being flattering to your idea. Your competitor usually isn't another startup — it's the current behavior — and this task is about understanding that behavior honestly.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The person is identified and the alternative they currently use is named.", "2. Their stated reason for choosing it is recorded in their own words."]}, {"category": "Reject if:**", "points": ["- The person is speculating rather than currently using the alternative.", "- The reason is the student's interpretation, not what the person said.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$Who they are, what they use, and their stated reason.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$competitive-analysis$mj$,$mj$track-universal$mj$,$mj$phase-p4$mj$]::text[], 48, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-04$mj$, 'individual', $mj$Try naming a beachhead market for a hypothetical idea$mj$, $mj$Skim MIT's beachhead-market concept and practice applying it to any idea, real or made up.$mj$, $mj$# Try naming a beachhead market for a hypothetical idea

## Task Description
Skim a short explainer on MIT's Disciplined Entrepreneurship "beachhead market" concept, then practice naming a specific beachhead customer for any idea you're curious about — it does not need to be your real idea.
- https://www.votito.com/methods/beachhead-market/

## Requirements
- Read a 10-minute overview of the beachhead-market concept (e.g. the Disciplined Entrepreneurship framework overview).
- Pick any idea, real or hypothetical.
- Write one sentence naming a specific first customer segment — not "everyone," a specific slice of people.

## Evidence Required
The one-sentence beachhead statement, plus which idea it's attached to.$mj$, 'business-fundamentals', 'medium', 1,
   0.5, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Landing on the "right" answer. This is a rehearsal of the skill, not a real segmentation decision.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text says which idea the exercise is attached to.", "2. One sentence names a specific, narrow first customer segment.", "3. The text mentions the beachhead explainer that was read."]}, {"category": "Reject if:**", "points": ["- The segment is broad ('small businesses', 'students').", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The one-sentence beachhead statement, plus which idea it's attached to.$mj$]::text[], $mj$[{"title": "Beachhead market explained", "description": "Short overview of MIT's Disciplined Entrepreneurship beachhead concept.", "type": "article", "url": "https://www.votito.com/methods/beachhead-market/"}]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-business$mj$,$mj$track-business$mj$,$mj$phase-p4$mj$]::text[], 49, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-05$mj$, 'individual', $mj$Sketch a Business Model Canvas for a hypothetical idea$mj$, $mj$Skim the Business Model Canvas and fill one out for any idea, to practice thinking in business-model terms early.$mj$, $mj$# Sketch a Business Model Canvas for a hypothetical idea

## Task Description
Skim a short overview of the Business Model Canvas and sketch a rough version of it for any idea — real or hypothetical.
- https://deckary.com/blog/business-model-canvas-examples

## Requirements
- Fill in at least the core blocks: value proposition, customer segment, and revenue.
- It's fine to leave weaker blocks vague — the point is practicing the shape of the thinking, not a finished plan.

## Evidence Required
A photo, screenshot, or written version of the filled-in canvas (rough is fine).$mj$, 'business-fundamentals', 'medium', 2,
   1, 20, 16, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Completeness. A canvas with three solid blocks and four vague ones is a normal first attempt.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. A photo, screenshot or written version of the canvas is included.", "2. Value proposition, customer segment and revenue blocks are filled with specific content."]}, {"category": "Reject if:**", "points": ["- The core blocks are placeholders or empty.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$A photo, screenshot, or written version of the filled-in canvas (rough is fine).$mj$]::text[], $mj$[{"title": "Business Model Canvas examples", "description": "Overview and filled-in examples of the canvas.", "type": "article", "url": "https://deckary.com/blog/business-model-canvas-examples"}]$mj$::jsonb,
   ARRAY[$mj$practical-tasks-business$mj$,$mj$track-business$mj$,$mj$phase-p4$mj$]::text[], 50, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-06$mj$, 'individual', $mj$Estimate the market size from the bottom up$mj$, $mj$Estimate a real market size using your own assumptions and simple math, then place it inside the bigger picture — not a Googled market report.$mj$, $mj$# Estimate the market size from the bottom up

## Task Description
Pick a market relevant to an idea you're exploring and estimate its size from the bottom up, without Googling a market-size report. Start from a real, countable quantity in your own context (Latvian or Baltic, if that's what you know best — e.g. number of SMEs) and multiply by a plausible number (e.g. annual spend), showing your assumptions. Then zoom out: estimate roughly how much bigger the same market is at a wider scale (EU-wide, or global, whichever makes sense for the idea) using the same kind of simple multiplication, not a lookup. Finally, change one assumption in your original local estimate and see how much your answer moves.
- Resource: https://www.hackingthecaseinterview.com/pages/market-sizing

## Requirements
- No copying a number from a market report — build both estimates from a countable starting quantity and your own assumptions.
- Show your math for both the local number and the wider-scale number.
- Change one assumption in the local estimate (the count, or the price) and note how much the final estimate shifts.

## Evidence Required
- Both bottom-up calculations (local and wider-scale), assumptions shown, and the sensitivity check.$mj$, 'customer-discovery', 'medium', 2,
   1, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Landing on an impressively large number. Showing your reasoning, and knowing which assumption the answer is most sensitive to, is the actual skill.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. A local estimate built from a countable starting quantity and a stated assumption, with the math shown.", "2. A wider-scale estimate (EU or global) with the math shown.", "3. A sensitivity check: one assumption changed and the resulting shift stated."]}, {"category": "Reject if:**", "points": ["- A figure copied from a market report is used instead of a built estimate.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$Both bottom-up calculations (local and wider-scale), assumptions shown, and the sensitivity check.$mj$]::text[], $mj$[{"title": "Market sizing walkthrough", "description": "How to build a bottom-up estimate from countable quantities.", "type": "article", "url": "https://www.hackingthecaseinterview.com/pages/market-sizing"}]$mj$::jsonb,
   ARRAY[$mj$market-research$mj$,$mj$track-universal$mj$,$mj$phase-p4$mj$]::text[], 51, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-07$mj$, 'individual', $mj$Choose one metric that would tell you whether your hypothetical startup is working$mj$, $mj$Pick the single number that would tell you if this idea is actually working — and say why that one, not another.$mj$, $mj$# Choose one metric that would tell you whether your hypothetical startup is working

## Task Description
Pick a hypothetical or real startup idea and choose exactly one metric that would tell you whether it's actually working — not a vanity metric, the one number that matters most right now — and explain why you picked that one over other plausible options.
To learn more about B2B metrics watch: https://www.ycombinator.com/library/KR-key-startup-metrics

To learn more about B2C metrics watch: https://www.ycombinator.com/library/KT-consumer-startup-metrics

## Requirements
- Exactly one metric, not a list.
- Name at least one other metric you considered and explain why you didn't pick it.
- The metric must be something you could actually measure soon, not a long-term outcome like "revenue in year 3."

## Evidence Required
The chosen metric and the reasoning, including the rejected alternative.$mj$, 'business-fundamentals', 'medium', 1,
   0.5, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Picking the most impressive-sounding metric. The one that's actually measurable and decision-relevant right now is what matters.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. Exactly one metric is chosen.", "2. At least one alternative metric is named with the reason it was rejected.", "3. The chosen metric can be measured soon, not a long-term outcome like year-3 revenue."]}, {"category": "Reject if:**", "points": ["- Several metrics are chosen instead of one.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The chosen metric and the reasoning, including the rejected alternative.$mj$]::text[], $mj$[{"title": "YC — Key startup metrics (B2B)", "description": "Which numbers matter for B2B startups.", "type": "video", "url": "https://www.ycombinator.com/library/KR-key-startup-metrics"}, {"title": "YC — Consumer startup metrics (B2C)", "description": "Which numbers matter for consumer startups.", "type": "video", "url": "https://www.ycombinator.com/library/KT-consumer-startup-metrics"}]$mj$::jsonb,
   ARRAY[$mj$metrics$mj$,$mj$track-universal$mj$,$mj$phase-p4$mj$]::text[], 52, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-08$mj$, 'individual', $mj$Ask someone to pay for something you built$mj$, $mj$Directly ask a real person if they'd pay for something you've made — a real ask, not a hypothetical question.$mj$, $mj$# Ask someone to pay for something you built

## Task Description
Show someone something you've actually built (a prototype, a mockup, a service) and directly ask them to pay for it — a real ask with a real number, not "would you use this?"

## Requirements
- Must be a direct ask with an actual price attached (any amount).
- The person must be a real potential user, not a friend doing you a favor.
- Write down exactly what they said, including if they said no.

## Evidence Required
What you asked, the price, and their real response.$mj$, 'customer-discovery', 'medium', 1,
   0.5, 30, 24, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Getting a yes. Making the actual ask is the skill — a clear no is a completely valid, useful outcome.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. What was shown is described (a prototype, mockup or service).", "2. The person asked is described as a real potential user.", "3. The direct ask is recorded with an actual price.", "4. Their exact response is recorded, including a no."]}, {"category": "Reject if:**", "points": ["- No price was attached to the ask.", "- The ask was for feedback or interest only.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$What you asked, the price, and their real response.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$willingness-to-pay$mj$,$mj$track-universal$mj$,$mj$phase-p4$mj$]::text[], 53, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-09$mj$, 'individual', $mj$Run one tiny acquisition experiment with a €0–20 budget$mj$, $mj$Run one small, real experiment to get people's attention — spend at most €20.$mj$, $mj$# Run one tiny acquisition experiment with a €0–20 budget

## Task Description
Run one small, real experiment to get people's attention for an idea or something you built, spending no more than €20 total (€0 is fine).

## Requirements
- Must be a real experiment with a real outcome you can measure (clicks, replies, signups, visits).
- €20 maximum spend — note clearly if you spent €0.
- Write down what you tried and what actually happened, numbers included.

## Evidence Required
What the experiment was, the spend, and the measured result.$mj$, 'business-fundamentals', 'medium', 2,
   1.5, 25, 20, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: A big result. Running one real, measured experiment — even one with a disappointing number — is the actual task.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The experiment is described.", "2. The spend is stated (zero is fine) and is 20 euros or less.", "3. The measured result is a number (clicks, replies, signups, visits)."]}, {"category": "Reject if:**", "points": ["- Spend over 20 euros.", "- No number as the result.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$What the experiment was, the spend, and the measured result.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$distribution$mj$,$mj$track-universal$mj$,$mj$phase-p4$mj$]::text[], 54, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-P4-10$mj$, 'individual', $mj$48-Hour Founder Challenge$mj$, $mj$The full founder loop in 48 hours: find a new problem, talk to people, build the smallest solution, get a real user, ask for commitment, and write it up.

[Can submit hackathon experience]$mj$, $mj$# 48-Hour Founder Challenge

## Task Description
Over 48 hours, run the entire founder loop on one problem you did NOT start with (pick something new, not your existing idea). Talk to at least 3 people who experience the problem and identify their current workaround. Build the smallest possible solution. Put it in front of at least one real user and ask them to actually use it. Ask for money or another meaningful commitment (a signed intent, an introduction, a public endorsement — something real). Finish with a one-page post-mortem: what you believed at the start, what evidence you found, what changed your mind, and what you'd do next.

## Requirements
- The problem must be new to you — not the idea you've already been working on throughout this list.
- All 6 steps must happen for real within the 48-hour window: talk to 3+ people, identify their workaround, build something, get it in front of a real user, ask for a real commitment, write the post-mortem.
- The post-mortem must be honest about what changed your mind, not a summary written to make the 48 hours look successful.

## Evidence Required
Notes from the 3+ conversations, what you built (link or description), evidence of the real user interaction, what you asked for and what happened, and the one-page post-mortem.$mj$, 'business-fundamentals', 'medium', 5,
   16, 120, 96, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Ending up with a great idea. This is the single task that compresses the whole My Journey list — noticing, talking, testing, building, selling, reflecting — into one 48-hour stretch; the honest post-mortem matters more than the outcome.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The problem is stated as new, not the idea the student was already working on.", "2. Notes from at least three conversations, including each person's current workaround.", "3. What was built is shown or described (link or description).", "4. Evidence of a real user interaction.", "5. The commitment asked for and what happened.", "6. A one-page post-mortem covering: what was believed at the start, evidence found, what changed the student's mind, what to do next."]}, {"category": "Reject if:**", "points": ["- Any of the six steps is missing.", "- The post-mortem has no 'what changed my mind'.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$Notes from the 3+ conversations, what you built (link or description), evidence of the real user interaction, what you asked for and what happened, and the one-page post-mortem.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$capstone$mj$,$mj$track-universal$mj$,$mj$phase-p4$mj$]::text[], 55, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Think Like a Founder$mj$ AND context = 'individual')),
  ($mj$MJ-READ-01$mj$, 'individual', $mj$Read Grit: Why Passion and Resilience Are the Secrets to Success$mj$, $mj$Read Angela Duckworth's full book and extend the short grit primer already in this list.$mj$, $mj$# Read Grit: Why Passion and Resilience Are the Secrets to Success

## Task Description
Read Angela Duckworth's Grit. Why this book for Startup Mindset: it makes the full, evidence-based case (beyond the short TED-talk primer already in this list) that sustained passion and effort over years — not raw talent — predicts who actually finishes what they start. A startup rarely fails from a single bad decision; it erodes from quitting one week too early, and this book is the deepest treatment of why that happens and what counteracts it.

## Requirements
- Read the book in full.
- Write 3-4 sentences on one long-running thing (a project, a skill, a habit) you either stuck with past the point it stopped being fun, or abandoned when it got hard — and what that tells you.

## Evidence Required
The 3-4 sentence reflection.$mj$, 'reading', 'medium', 4,
   6, 90, 72, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Producing a book report. One honest, specific reflection beats a full summary.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states the book was read in full, or names exactly which chapters were read.", "2. A 3-4 sentence reflection on one long-running thing (project, skill, habit) the student stuck with past the fun point or abandoned when it got hard.", "3. The reflection says what that tells the student about themselves."]}, {"category": "Reject if:**", "points": ["- The text is a summary of the book's argument with no personal, specific reflection.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3-4 sentence reflection.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-universal$mj$,$mj$phase-read$mj$]::text[], 56, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Founder Reading List$mj$ AND context = 'individual')),
  ($mj$MJ-READ-02$mj$, 'individual', $mj$Read Mapping the Uncharted: how eazyBI was built$mj$, $mj$Read the eazyBI founder story — a close-to-home account of bootstrapping a SaaS company.$mj$, $mj$# Read Mapping the Uncharted: how eazyBI was built

## Task Description
Read Mapping the Uncharted, the story of how eazyBI was built. Why this book for Startup Mindset: it's a real, close-to-home founder story — an internal tool that grew into an independent, bootstrapped SaaS company — without the Silicon-Valley-unicorn framing most startup books default to. It's a useful counterweight for calibrating what a realistic, non-hyped founder journey actually looks like. Source: https://eazybi.com/book

## Requirements
- Read the book in full.
- Write 3-4 sentences on one specific decision point in the eazyBI story that felt most different from the "raise big, move fast" startup narrative, and what you take from it.

## Evidence Required
The 3-4 sentence reflection naming a specific decision point from the book.$mj$, 'reading', 'medium', 3,
   3, 45, 36, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Producing a book report. One honest, specific reflection beats a full summary.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states the book was read in full, or names exactly which chapters were read.", "2. A 3-4 sentence reflection names one specific decision point in the eazyBI story.", "3. The reflection says how that decision differed from the 'raise big, move fast' narrative and what the student takes from it."]}, {"category": "Reject if:**", "points": ["- The text is a summary of the book's argument with no personal, specific reflection.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3-4 sentence reflection naming a specific decision point from the book.$mj$]::text[], $mj$[{"title": "Mapping the Uncharted (eazyBI)", "description": "The book's official page.", "type": "article", "url": "https://eazybi.com/book"}]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-universal$mj$,$mj$phase-read$mj$]::text[], 57, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Founder Reading List$mj$ AND context = 'individual')),
  ($mj$MJ-READ-03$mj$, 'individual', $mj$Read No Rules Rules: Netflix and the Culture of Reinvention$mj$, $mj$Read Erin Meyer and Reed Hastings' book on Netflix's freedom-and-responsibility culture model.$mj$, $mj$# Read No Rules Rules: Netflix and the Culture of Reinvention

## Task Description
Read Erin Meyer and Reed Hastings' No Rules Rules. Why this book for Startup Mindset: it's a detailed account of building a culture on candor and trust instead of process and rules — relevant once you're thinking not just about what to build, but what kind of team and working culture you want to build it inside, long before you have the headcount for a formal culture. Source: https://www.janisroze.lv/en/books/field-literature/economy-business/f0ju-no-rules-rules-netflix-and-the-culture-of-reinvention.html

## Requirements
- Read the book in full.
- Write 3-4 sentences on one specific Netflix practice from the book (e.g. radical candor, no vacation policy, the "keeper test") and whether you'd actually want it in a team you led, and why or why not.

## Evidence Required
The 3-4 sentence reflection taking a real position, not just summarizing the practice.$mj$, 'reading', 'medium', 4,
   6, 90, 72, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Producing a book report. One honest, specific reflection beats a full summary.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states the book was read in full, or names exactly which chapters were read.", "2. A 3-4 sentence reflection names one specific Netflix practice from the book.", "3. The reflection takes a position: whether the student would want it in a team they led, and why or why not."]}, {"category": "Reject if:**", "points": ["- The reflection is a neutral summary with no position taken.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3-4 sentence reflection taking a real position, not just summarizing the practice.$mj$]::text[], $mj$[{"title": "No Rules Rules — Jānis Roze", "description": "Where to get the book locally.", "type": "article", "url": "https://www.janisroze.lv/en/books/field-literature/economy-business/f0ju-no-rules-rules-netflix-and-the-culture-of-reinvention.html"}]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-business$mj$,$mj$phase-read$mj$]::text[], 58, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Founder Reading List$mj$ AND context = 'individual')),
  ($mj$MJ-READ-04$mj$, 'individual', $mj$Read Paul Graham on ideas and unscalable actions$mj$, $mj$Read two short PG essays and turn them into one concrete action you'll actually try.$mj$, $mj$# Read Paul Graham on ideas and unscalable actions

## Task Description
Read "How to Get Startup Ideas" and "Do Things That Don't Scale" (~20 minutes combined) and write three sentences connecting them to your own situation.

## Requirements
- Read both essays in full (links provided in the program's pre-program reading list).
- Write 2-3 sentences: one idea-generation habit from the first essay you could try, and one deliberately "unscalable" action from the second essay you could actually do this month.
- Keep it personal and specific — not a summary of the essays.

## Evidence Required
The 2-3 sentence reflection, saved anywhere you're already keeping pre-program notes (doc, Notion, plain text).$mj$, 'reading', 'medium', 2,
   1, 15, 12, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Polished writing. A rough, honest three sentences counts.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The text confirms both essays were read.", "2. One specific idea-generation habit from 'How to Get Startup Ideas' the student could try.", "3. One specific unscalable action from 'Do Things That Don't Scale' the student could do this month."]}, {"category": "Reject if:**", "points": ["- The reflection is a summary of the essays with no personal habit or action.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 2-3 sentence reflection, saved anywhere you're already keeping pre-program notes (doc, Notion, plain text).$mj$]::text[], $mj$[{"title": "Paul Graham — How to Get Startup Ideas", "description": "Essay one.", "type": "article", "url": "https://paulgraham.com/startupideas.html"}, {"title": "Paul Graham — Do Things That Don't Scale", "description": "Essay two.", "type": "article", "url": "https://paulgraham.com/ds.html"}]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-universal$mj$,$mj$phase-read$mj$]::text[], 59, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Founder Reading List$mj$ AND context = 'individual')),
  ($mj$MJ-READ-05$mj$, 'individual', $mj$Read The Bezos Blueprint: Communication Secrets that Power Amazon's Success$mj$, $mj$Read Carmine Gallo's book on Amazon's narrative-driven communication culture.$mj$, $mj$# Read The Bezos Blueprint: Communication Secrets that Power Amazon's Success

## Task Description
Read Carmine Gallo's The Bezos Blueprint. Why this book for Startup Mindset: it unpacks Amazon's memo-first, narrative-driven communication habits (six-page memos over slide decks, working backwards from the customer) — a concrete, practiced model for how founders get buy-in from investors, teammates, and customers through clear writing instead of relying on charisma or a polished deck. Source: https://www.janisroze.lv/en/books/field-literature/economy-business/ejzl-bezos-blueprint-communication-secrets-that-power-amazon-s-success.html

## Requirements
- Read the book in full.
- Write one short paragraph (3-5 sentences) you draft in the "working backwards" or narrative-memo style described in the book, about any idea — practicing the technique, not just describing it.

## Evidence Required
The short practice paragraph written in the book's own style.$mj$, 'reading', 'medium', 4,
   4, 60, 48, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Producing a book report. One honest, specific reflection beats a full summary.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states the book was read in full, or names exactly which chapters were read.", "2. A 3-5 sentence paragraph written in the working-backwards or narrative-memo style, about any idea.", "3. The paragraph practices the technique rather than describing what the book says about it."]}, {"category": "Reject if:**", "points": ["- The submission describes the technique instead of practising it.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The short practice paragraph written in the book's own style.$mj$]::text[], $mj$[{"title": "The Bezos Blueprint — Jānis Roze", "description": "Where to get the book locally.", "type": "article", "url": "https://www.janisroze.lv/en/books/field-literature/economy-business/ejzl-bezos-blueprint-communication-secrets-that-power-amazon-s-success.html"}]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-business$mj$,$mj$phase-read$mj$]::text[], 60, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Founder Reading List$mj$ AND context = 'individual')),
  ($mj$MJ-READ-06$mj$, 'individual', $mj$Read The Hard Thing About Hard Things$mj$, $mj$Read Ben Horowitz's unflinching account of the genuinely hard decisions in running a company.$mj$, $mj$# Read The Hard Thing About Hard Things

## Task Description
Read Ben Horowitz's The Hard Thing About Hard Things. Why this book for Startup Mindset: it's an unusually honest account of the decisions that don't show up in most startup advice — layoffs, cofounder conflict, near-failure, firing a friend — a direct counterweight to survivorship-bias startup narratives and useful for setting realistic expectations about what "hard" actually means before you're in it.

## Requirements
- Read the book in full.
- Write 3-4 sentences on which specific hard decision described in the book you'd find hardest personally, and why.

## Evidence Required
The 3-4 sentence reflection naming a specific decision from the book.$mj$, 'reading', 'medium', 4,
   5, 75, 60, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Producing a book report. One honest, specific reflection beats a full summary.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states the book was read in full, or names exactly which chapters were read.", "2. A 3-4 sentence reflection names one specific hard decision described in the book.", "3. The reflection says why that decision would be hardest for the student personally."]}, {"category": "Reject if:**", "points": ["- The text is a summary of the book's argument with no personal, specific reflection.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3-4 sentence reflection naming a specific decision from the book.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-business$mj$,$mj$phase-read$mj$]::text[], 61, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Founder Reading List$mj$ AND context = 'individual')),
  ($mj$MJ-READ-07$mj$, 'individual', $mj$Read Zero to One$mj$, $mj$Read Peter Thiel's case for building something genuinely new rather than competing incrementally.$mj$, $mj$# Read Zero to One

## Task Description
Read Peter Thiel's Zero to One: Notes on Startups, or How to Build the Future. Why this book for Startup Mindset: it's the clearest, most widely-referenced argument for why building something genuinely new ("zero to one") beats incrementally competing in an existing market ("one to n") — a useful lens to apply early, before you've locked into an idea, for judging whether what you're building is actually differentiated or just another entrant in a crowded space.

## Requirements
- Read the book in full.
- Write 3-4 sentences applying the zero-to-one to any idea — yours or hypothetical — and which side it currently falls on.

## Evidence Required
The 3-4 sentence reflection applying the distinction to a real or hypothetical idea.$mj$, 'reading', 'medium', 4,
   4, 60, 48, true, $mj$AI review of a My Journey reflection task. Grade only the submitted text and any attached evidence against the criteria. Judge specificity and honesty, not writing quality or whether the outcome was a success. Not the point: Producing a book report. One honest, specific reflection beats a full summary.$mj$, $mj$[{"category": "What to evaluate:**", "points": ["1. The submitted text states the book was read in full, or names exactly which chapters were read.", "2. A 3-4 sentence reflection applies the zero-to-one vs one-to-n distinction to a specific idea (real or hypothetical).", "3. The reflection says which side the idea currently falls on and why."]}, {"category": "Reject if:**", "points": ["- The reflection restates Thiel's thesis without applying it to an idea.", "- The submission is empty, a placeholder, or clearly written for a different task."]}]$mj$::jsonb, ARRAY[$mj$The 3-4 sentence reflection applying the distinction to a real or hypothetical idea.$mj$]::text[], $mj$[]$mj$::jsonb,
   ARRAY[$mj$reading$mj$,$mj$track-universal$mj$,$mj$phase-read$mj$]::text[], 62, true, false, 7, NULL, false,
   (SELECT id FROM public.achievements WHERE name = $mj$Founder Reading List$mj$ AND context = 'individual'));
