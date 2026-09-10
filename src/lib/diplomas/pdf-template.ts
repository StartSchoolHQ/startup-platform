// Handlebars template replicating the approved "Supplement to Diploma"
// light-v2 layout (diploma_resources/startschool-supplement-light-v2 (1).pdf).
// Renders ONLY from the frozen DiplomaSnapshot.

import Handlebars from "handlebars";
import { CEO_SIGNATURE_DATA_URI, STARTSCHOOL_LOGO_DATA_URI } from "./assets";
import { PROGRAMME_STATIC } from "./constants";
import type { DiplomaSnapshot } from "./types";

Handlebars.registerHelper("fmtDate", (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
});

Handlebars.registerHelper("dash", (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : v
);

Handlebars.registerHelper("pct", (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : `${v}%`
);

const TEMPLATE = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 1.2cm 1.4cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px; color: #1a1a1a; line-height: 1.4;
    padding-bottom: 26px;
  }
  .label {
    color: #9a9a9a; font-size: 7px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
  }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .top .no { font-size: 13px; font-weight: 700; margin-top: 3px; }
  .brand img { width: 130px; height: auto; display: block; }
  h1 { font-size: 22px; font-weight: 700; margin: 12px 0 2px; }
  .pcode { margin-bottom: 10px; }
  .pcode b { font-weight: 400; font-size: 9px; letter-spacing: 0.02em; }
  .row { display: flex; border-top: 1px solid #e2e2e2; padding: 4px 0; }
  .row .label { flex: 0 0 150px; padding-top: 1px; }
  .row .val { flex: 1; }
  .row .label.l2 { flex: 0 0 120px; }
  .row .val.v2 { flex: 0 0 150px; }
  .section {
    display: flex; justify-content: space-between; align-items: baseline;
    border-top: 1.5px solid #1a1a1a; margin-top: 12px; padding: 5px 0 3px;
  }
  .section .title {
    font-size: 10.5px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .section .summary {
    color: #9a9a9a; font-size: 7px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
  }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; color: #9a9a9a; font-size: 7px;
    letter-spacing: 0.12em; text-transform: uppercase;
    padding: 3px 8px 3px 0; border-bottom: 1px solid #e2e2e2;
  }
  td { padding: 4px 8px 4px 0; border-bottom: 1px solid #e2e2e2; vertical-align: top; }
  td.name { width: 130px; font-weight: 700; }
  td.num { width: 55px; text-align: center; }
  td.pct { width: 68px; text-align: center; font-weight: 700; }
  td.desc { color: #444; font-size: 8px; }
  tr.total td { border-top: 1.5px solid #1a1a1a; border-bottom: 1.5px solid #1a1a1a; font-weight: 700; }
  tr.total td:first-child { text-transform: uppercase; }
  tr.total td.ects { font-weight: 400; text-align: left; }
  .footnote { color: #9a9a9a; font-size: 7.5px; margin: 6px 0 10px; }
  .footnote b { color: #444; }
  .startup-title { display: flex; align-items: baseline; gap: 12px; border-top: 1px solid #e2e2e2; margin-top: 10px; padding: 7px 0; }
  .startup-title .val { font-weight: 700; font-size: 10px; }
  .sig { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 22px; }
  .sig .block { width: 40%; }
  .sig .line { border-top: 1.5px solid #1a1a1a; padding-top: 4px; }
  .sig .who { font-weight: 700; font-size: 9.5px; }
  .sig .caption { color: #9a9a9a; font-size: 8px; }
  .sig img.signature { width: 130px; height: auto; display: block; margin-bottom: 2px; }
  .pagefoot {
    position: fixed; bottom: 0; left: 0; right: 0;
    display: flex; justify-content: space-between;
    border-top: 1px solid #e2e2e2; padding-top: 5px;
    color: #9a9a9a; font-size: 6.5px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="label">{{static.supplementLabel}}</div>
      <div class="no">{{snapshot.diploma_number}}</div>
    </div>
    <div class="brand"><img src="{{logoDataUri}}" alt="StartSchool" /></div>
  </div>

  <h1>{{snapshot.student.name}}</h1>
  <div class="pcode"><span class="label">Personal code</span> <b>{{snapshot.student.personal_code}}</b></div>

  <div class="row"><div class="label">Title conferred</div><div class="val">{{static.titleConferred}}</div></div>
  <div class="row"><div class="label">Field of study</div><div class="val">{{static.fieldOfStudy}}</div></div>
  <div class="row"><div class="label">Type of programme</div><div class="val">{{static.programmeType}}</div></div>
  <div class="row"><div class="label">Academic status</div><div class="val">{{static.academicStatus}}</div></div>
  <div class="row"><div class="label">Professional status</div><div class="val">{{static.professionalStatus}}</div></div>
  <div class="row">
    <div class="label">Length of programme</div><div class="val">{{static.programmeLength}}</div>
    <div class="label l2">Type of study</div><div class="val v2">{{static.typeOfStudy}}</div>
  </div>
  <div class="row">
    <div class="label">Date of admission</div><div class="val">{{fmtDate snapshot.batch.admission_date}}</div>
    <div class="label l2">Date of completion</div><div class="val v2">{{fmtDate snapshot.batch.completion_date}}</div>
  </div>

  <div class="section">
    <div class="title">Tech Module</div>
    <div class="summary">{{techWeeksTotal}} weeks · {{techTrackCount}} tracks</div>
  </div>
  <table>
    <tr><th>Track</th><th style="text-align:center">Weeks</th><th style="text-align:center">Completed</th><th>Description</th></tr>
    {{#each snapshot.tech_modules}}
    <tr>
      <td class="name">{{display_name}}</td>
      <td class="num">{{dash weeks}}</td>
      <td class="pct">{{pct percent}}</td>
      <td class="desc">{{dash description}}</td>
    </tr>
    {{/each}}
    <tr class="total">
      <td>Total</td><td class="num">{{techWeeksTotal}} weeks</td><td class="pct">{{pct techPercentTotal}}</td><td></td>
    </tr>
  </table>

  {{#if isFull}}
  <div class="section">
    <div class="title">Startup Module</div>
    <div class="summary">{{startupHoursTotal}} hours · {{startupCatCount}} categories</div>
  </div>
  <table>
    <tr><th>Category</th><th style="text-align:center">Hours</th><th style="text-align:center">Completed</th><th>Description</th></tr>
    {{#each snapshot.startup_modules}}
    <tr>
      <td class="name">{{displayName}}</td>
      <td class="num">{{hours}}</td>
      <td class="pct">{{pct percent}}</td>
      <td class="desc">{{description}}</td>
    </tr>
    {{/each}}
    <tr class="total">
      <td>Total</td><td class="num">{{startupHoursTotal}} hours</td>
      <td class="ects" colspan="2">{{startupHoursTotal}} hours = {{startupCredits}} credits ≈ {{startupEcts}} ECTS at the conversion stated below</td>
    </tr>
  </table>
  {{/if}}

  <div class="footnote"><b>% completed</b> — the share of the track's assessed work submitted and accepted by the date of completion.</div>

  <div class="row"><div class="label">Type of establishment</div><div class="val">{{static.establishmentNote}}</div></div>
  <div class="row"><div class="label">Entrance requirements</div><div class="val">{{static.entranceRequirements}}</div></div>
  <div class="row"><div class="label">Programme requirements</div><div class="val">{{static.programmeRequirements}}</div></div>
  <div class="row"><div class="label">System of examination</div><div class="val">{{static.examinationSystem}}</div></div>
  <div class="row">
    <div class="label">Workload</div><div class="val">{{static.workload}}</div>
    <div class="label l2">Language of instruction</div><div class="val v2">{{static.languageOfInstruction}}</div>
  </div>

  {{#if snapshot.startup_name}}
  <div class="startup-title">
    <div class="label">Title of Startup created with the team during the Startup Module</div>
    <div class="val">{{snapshot.startup_name}}</div>
  </div>
  {{/if}}

  <div class="sig">
    <div class="block">
      <div class="line">
        <div class="who">{{fmtDate snapshot.issued_date}}</div>
        <div class="caption">Date and place of issue — {{static.issuePlace}}</div>
      </div>
    </div>
    <div class="block">
      <img class="signature" src="{{signatureDataUri}}" alt="signature" />
      <div class="line">
        <div class="who">{{static.ceoName}}</div>
        <div class="caption">{{static.ceoTitle}}</div>
      </div>
    </div>
  </div>

  <div class="pagefoot">
    <div>{{static.supplementLabel}} {{snapshot.diploma_number}} · {{snapshot.student.name}}</div>
    <div>StartSchool · Page 1 of 1</div>
  </div>
</body>
</html>`;

const compiled = Handlebars.compile(TEMPLATE);

const round1 = (n: number) => Math.round(n * 10) / 10;

export function renderDiplomaHtml(snapshot: DiplomaSnapshot): string {
  const techWeeksTotal = snapshot.tech_modules.reduce(
    (sum, m) => sum + (m.weeks ?? 0),
    0
  );
  // Weeks-weighted average completion; falls back to a simple mean when
  // no printed track has weeks assigned.
  const withPct = snapshot.tech_modules.filter((m) => m.percent !== null);
  const weightSum = withPct.reduce((s, m) => s + (m.weeks ?? 0), 0);
  const techPercentTotal =
    withPct.length === 0
      ? null
      : Math.round(
          weightSum > 0
            ? withPct.reduce(
                (s, m) => s + (m.percent ?? 0) * (m.weeks ?? 0),
                0
              ) / weightSum
            : withPct.reduce((s, m) => s + (m.percent ?? 0), 0) / withPct.length
        );
  const startupHoursTotal = snapshot.startup_modules.reduce(
    (sum, m) => sum + m.hours,
    0
  );
  return compiled({
    snapshot,
    static: PROGRAMME_STATIC,
    isFull: snapshot.diploma_type === "full",
    techWeeksTotal,
    techPercentTotal,
    techTrackCount: snapshot.tech_modules.length,
    startupHoursTotal,
    startupCatCount: snapshot.startup_modules.length,
    startupCredits: round1(startupHoursTotal / 40),
    startupEcts: round1((startupHoursTotal / 40) * 1.5),
    logoDataUri: STARTSCHOOL_LOGO_DATA_URI,
    signatureDataUri: CEO_SIGNATURE_DATA_URI,
  });
}
