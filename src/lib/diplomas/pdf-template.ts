// Handlebars template replicating the approved "Supplement to Diploma"
// layout (diploma.png). Renders ONLY from the frozen DiplomaSnapshot.

import Handlebars from "handlebars";
import { PROGRAMME_STATIC } from "./constants";
import type { DiplomaSnapshot } from "./types";

Handlebars.registerHelper("fmtDate", (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
});

Handlebars.registerHelper("dash", (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : v
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
    font-size: 9.5px; color: #111; line-height: 1.35;
  }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .supp { font-size: 10px; letter-spacing: 0.02em; }
  .supp .no { font-size: 13px; margin-top: 2px; }
  .brand {
    background: #ff8ad4; color: #111; font-weight: 700; font-size: 18px;
    padding: 8px 22px; border-radius: 22px;
  }
  h1 { font-size: 26px; font-weight: 400; margin: 14px 0 10px; }
  .facts { display: flex; gap: 24px; margin-bottom: 14px; }
  .facts .col { flex: 1; }
  .fact { margin-bottom: 4px; }
  .fact .label { color: #b58900; }
  .fact b { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { text-align: left; font-size: 9.5px; padding: 4px 6px; border-bottom: 1px solid #111; }
  td { border: 1px solid #999; padding: 5px 6px; vertical-align: top; }
  td.num { text-align: center; width: 60px; }
  td.name { width: 150px; }
  .section-title { font-weight: 700; margin: 14px 0 4px; }
  .total-row td { border: none; font-weight: 700; padding-top: 4px; }
  .footer-block { margin-top: 14px; }
  .footer-block p { margin-bottom: 3px; }
  .sig { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; }
  .sig .date { font-size: 10px; }
  .sig .ceo { text-align: right; font-size: 10px; }
  .desc { font-size: 8.5px; color: #333; }
</style>
</head>
<body>
  <div class="top">
    <div class="supp">
      {{static.supplementLabel}}
      <div class="no">{{snapshot.diploma_number}}</div>
    </div>
    <div class="brand">StartSchool&trade;</div>
  </div>

  <h1>{{snapshot.student.name}}</h1>

  <div class="facts">
    <div class="col">
      <div class="fact"><span class="label">Date of birth:</span> <b>{{snapshot.student.personal_code}}</b></div>
      <div class="fact"><span class="label">Title conferred:</span> <b>{{static.titleConferred}}</b></div>
      <div class="fact"><span class="label">Type of programme:</span> <b>{{static.programmeType}}</b></div>
      <div class="fact"><span class="label">Length of programme:</span> <b>{{static.programmeLength}}</b></div>
      <div class="fact"><span class="label">Type of study:</span> <b>{{static.typeOfStudy}}</b></div>
      <div class="fact"><span class="label">Field of study:</span> <b>{{static.fieldOfStudy}}</b></div>
    </div>
    <div class="col">
      <div class="fact"><span class="label">Academic status:</span> <b>{{static.academicStatus}}</b></div>
      <div class="fact"><span class="label">Professional status:</span> <b>{{static.professionalStatus}}</b></div>
      <div class="fact"><span class="label">Date of admission:</span> <b>{{fmtDate snapshot.batch.admission_date}}</b></div>
      <div class="fact"><span class="label">Date of completion of course programme:</span> <b>{{fmtDate snapshot.batch.completion_date}}</b></div>
    </div>
  </div>

  <div class="section-title">Tech Module</div>
  <table>
    <tr>
      <th>Track</th><th>Weeks</th><th>% completed</th><th>Description</th>
    </tr>
    {{#each snapshot.tech_modules}}
    <tr>
      <td class="name">{{display_name}}</td>
      <td class="num">{{dash weeks}}</td>
      <td class="num">{{dash percent}}</td>
      <td class="desc">{{dash description}}</td>
    </tr>
    {{/each}}
    <tr class="total-row">
      <td>Total</td><td class="num">{{techWeeksTotal}}</td><td></td><td></td>
    </tr>
  </table>

  {{#if isFull}}
  <div class="section-title">Startup Module</div>
  <table>
    <tr>
      <th>Category</th><th>Hours</th><th>% completed</th><th>Description</th>
    </tr>
    {{#each snapshot.startup_modules}}
    <tr>
      <td class="name">{{displayName}}</td>
      <td class="num">{{hours}}</td>
      <td class="num">{{percent}}</td>
      <td class="desc">{{description}}</td>
    </tr>
    {{/each}}
    <tr class="total-row">
      <td>Total</td><td class="num">{{startupHoursTotal}}</td><td></td><td></td>
    </tr>
  </table>
  {{/if}}

  <div class="footer-block">
    <p><span class="label">Type of establishment:</span> <b>{{static.establishmentNote}}</b></p>
    <p><span class="label">Entrance requirements:</span> <b>{{static.entranceRequirements}}</b></p>
    <p><span class="label">Programme requirements:</span> <b>{{static.programmeRequirements}}</b></p>
    <p><span class="label">Language of instruction:</span> <b>{{static.languageOfInstruction}}</b></p>
    <p><span class="label">Workload:</span> <b>{{static.workload}}</b></p>
    <p><span class="label">System of examination:</span> <b>{{static.examinationSystem}}</b></p>
    {{#if snapshot.startup_name}}
    <p style="margin-top:10px;"><span class="label">Title of Startup created with the team during Startup Module:</span><br /><b>{{snapshot.startup_name}}</b></p>
    {{/if}}
  </div>

  <div class="sig">
    <div class="date">Date:<br />{{fmtDate snapshot.issued_date}}</div>
    <div class="ceo">{{static.ceoTitle}}:<br />{{static.ceoName}}</div>
  </div>
</body>
</html>`;

const compiled = Handlebars.compile(TEMPLATE);

export function renderDiplomaHtml(snapshot: DiplomaSnapshot): string {
  const techWeeksTotal = snapshot.tech_modules.reduce(
    (sum, m) => sum + (m.weeks ?? 0),
    0
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
    startupHoursTotal,
  });
}
