import { describe, expect, it } from "vitest";
import {
  buildDataIssues,
  checkCohortSize,
} from "@/lib/program-assistant/checks";
import { parseProgramAssistantSettings } from "@/lib/program-assistant/settings";
import type {
  SnapshotRow,
  StudentTrackRow,
} from "@/lib/program-assistant/types";

function row(id: number, name: string): SnapshotRow {
  return {
    qwasar_user_id: id,
    login: name.toLowerCase(),
    name,
    email: `${name.toLowerCase()}@startschool.org`,
    status: "active",
    cohort: "Triffid Nebula - Andromeda",
    last_login_at: null,
    module: "Preseason Web",
    percent: 0,
  };
}

function track(id: number, status: string | null): StudentTrackRow {
  return {
    qwasar_user_id: id,
    email: null,
    name: `S${id}`,
    tech_track: "FS",
    study_type: "full-time",
    sheet_status: status,
  };
}

describe("checkCohortSize", () => {
  it("passes inside the bounds and fails outside with a message", () => {
    expect(checkCohortSize(88, [85, 95]).ok).toBe(true);
    const bad = checkCohortSize(12, [85, 95]);
    expect(bad.ok).toBe(false);
    expect(bad.message).toContain("12");
  });
});

describe("buildDataIssues", () => {
  it("flags unmapped, dropout-but-active and sheet-active-but-missing", () => {
    const rows = [row(1, "Ann"), row(1, "Ann"), row(2, "Bob"), row(3, "Cid")];
    const tracks = [
      track(1, "Active"),
      track(3, "Dropout"),
      track(9, "Active"),
      track(8, "Will drop out"),
    ];
    const out = buildDataIssues(rows, tracks);
    const kinds = out.issues.map((i) => `${i.kind}:${i.qwasar_user_id}`).sort();
    expect(kinds).toEqual([
      "active_no_track_row:2",
      "dropout_but_active:3",
      "import_warning:9",
    ]);
    expect(out.unmapped).toBe(1);
    expect(out.unmappedPct).toBe(33.3);
  });

  it("treats a null sheet status as Active", () => {
    const out = buildDataIssues([row(1, "Ann")], [track(1, null)]);
    expect(out.issues).toEqual([]);
  });
});

describe("parseProgramAssistantSettings", () => {
  it("applies defaults and normalises the bounds and base url", () => {
    const s = parseProgramAssistantSettings({
      enabled: true,
      expected_cohort_rows: [95, 85],
      n8n_webhook_base: "https://x.test/webhook/",
      unmapped_fail_pct: "10",
    });
    expect(s.enabled).toBe(true);
    expect(s.expectedCohortRows).toEqual([85, 95]);
    expect(s.n8nWebhookBase).toBe("https://x.test/webhook");
    expect(s.unmappedFailPct).toBe(10);
    expect(s.cadence).toBe("daily");
  });

  it("is disabled when the row is missing", () => {
    expect(parseProgramAssistantSettings(null).enabled).toBe(false);
  });
});
