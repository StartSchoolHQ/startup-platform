/**
 * Unit tests for the agreement filename builder.
 *
 * The naming pattern (Firstname_Lastname_Startschool_Agreement.ext) appears
 * in user-visible places: the Dokobit hosted-signing UI title and the
 * signing UI's "download" button. Regressions here would be visible but
 * silent — a fixture lock-in helps catch them.
 */
import { describe, expect, it } from "vitest";
import { buildAgreementFilename } from "@/lib/scholarship/filename";

describe("buildAgreementFilename", () => {
  it("produces Firstname_Lastname_Startschool_Agreement.pdf for ASCII names", () => {
    expect(
      buildAgreementFilename({
        name: "John",
        surname: "Doe",
        ext: "pdf",
      })
    ).toBe("John_Doe_Startschool_Agreement.pdf");
  });

  it("preserves Latvian diacritics", () => {
    expect(
      buildAgreementFilename({
        name: "Jānis",
        surname: "Bērziņš",
        ext: "pdf",
      })
    ).toBe("Jānis_Bērziņš_Startschool_Agreement.pdf");
  });

  it("uses the .edoc extension for archived signed containers", () => {
    expect(
      buildAgreementFilename({
        name: "Anna",
        surname: "Liepa",
        ext: "edoc",
      })
    ).toBe("Anna_Liepa_Startschool_Agreement.edoc");
  });

  it("ignores agreement_type — same filename for full and partial", () => {
    const full = buildAgreementFilename({
      name: "John",
      surname: "Doe",
      agreement_type: "full",
      ext: "edoc",
    });
    const partial = buildAgreementFilename({
      name: "John",
      surname: "Doe",
      agreement_type: "partial",
      ext: "edoc",
    });
    expect(full).toBe(partial);
    expect(full).toBe("John_Doe_Startschool_Agreement.edoc");
  });

  it("strips file-system-illegal characters", () => {
    expect(
      buildAgreementFilename({
        name: 'John/<>"',
        surname: "Doe\\?:*",
        ext: "pdf",
      })
    ).toBe("John_Doe_Startschool_Agreement.pdf");
  });

  it("collapses internal whitespace to single underscores", () => {
    expect(
      buildAgreementFilename({
        name: "Mary   Jane",
        surname: "Van Der Berg",
        ext: "pdf",
      })
    ).toBe("Mary_Jane_Van_Der_Berg_Startschool_Agreement.pdf");
  });
});
