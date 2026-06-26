import { describe, expect, it } from "vitest";
import { renderContractHtml } from "@/lib/scholarship/pdf";

const sampleSigner = {
  name: "Jānis",
  surname: "Bērziņš",
  personal_code: "320198-12345",
  country_code: "LV",
};

describe("renderContractHtml", () => {
  it("renders the full-scholarship template with form + eID data", () => {
    const html = renderContractHtml({
      agreement_type: "full",
      signer: sampleSigner,
      recipient_email: "janis@example.com",
      recipient_phone: "+371 20000000",
      recipient_address: "Brīvības iela 1, Rīga, LV-1010",
      date_today: "20.05.2026",
      agreement_reference: "SS-2026-0001",
    });

    expect(html).toContain("StartSchool Student Agreement");
    expect(html).toContain("Full Scholarship");
    expect(html).toContain("Jānis");
    expect(html).toContain("Bērziņš");
    expect(html).toContain("320198-12345");
    expect(html).toContain("janis@example.com");
    expect(html).toContain("+371 20000000");
    expect(html).toContain("Brīvības iela 1");
    expect(html).toContain("Full Tuition Scholarship");
    expect(html).toContain("€5000");
    expect(html).toContain("LV90HABA0551055781933");
    expect(html).toContain("Anna Andersone");
    expect(html).toContain("SS-2026-0001");
  });

  it("renders the partial-scholarship template with €2000 obligation", () => {
    const html = renderContractHtml({
      agreement_type: "partial",
      signer: {
        name: "Anna",
        surname: "Liepa",
        personal_code: "150298-22222",
        country_code: "LV",
      },
      recipient_email: "anna@example.com",
      recipient_phone: "+371 22222222",
      recipient_address: "Rūpniecības iela 5, Rīga",
      date_today: "20.05.2026",
      agreement_reference: "SS-2026-0002",
    });

    expect(html).toContain("Partial Scholarship");
    expect(html).toContain("Partial Tuition Scholarship");
    expect(html).toContain("€2000");
    expect(html).toContain("€1000");
    expect(html).toContain("31 January 2027");
    expect(html).toContain("Anna");
    expect(html).toContain("Liepa");
    expect(html).toContain("150298-22222");
    expect(html).toContain("anna@example.com");
    expect(html).toContain("+371 22222222");
    expect(html).toContain("Rūpniecības iela 5");
  });

  it("renders the part-time template with birthdate, module tracks and Stripe links", () => {
    const html = renderContractHtml({
      agreement_type: "part_time",
      signer: {
        name: "Pēteris",
        surname: "Ozols",
        personal_code: "010300-33333",
        country_code: "LV",
      },
      recipient_email: "peteris@example.com",
      recipient_phone: "371 23456789",
      recipient_address: "Tērbatas iela 10, Rīga",
      birthdate: "15.05.2000",
      date_today: "26.06.2026",
      agreement_reference: "SS-2026-0003",
    });

    expect(html).toContain("part-time studies");
    expect(html).toContain("born on");
    expect(html).toContain("15.05.2000");
    expect(html).toContain("Pēteris");
    expect(html).toContain("Ozols");
    expect(html).toContain("010300-33333");
    expect(html).toContain("peteris@example.com");
    expect(html).toContain("+371 23456789");
    expect(html).toContain("Tērbatas iela 10");
    // Both module tracks rendered inline, verbatim (note the "€400 +VAT" typo).
    // Normalize whitespace the way the rendered PDF collapses it — the .hbs
    // wraps long lines, so the raw HTML has newlines mid-sentence.
    const flat = html.replace(/\s+/g, " ");
    expect(flat).toContain(
      "Tech Module Only — Monthly Tuition Fee: €200 + VAT"
    );
    expect(flat).toContain(
      "Tech + Startup Module — Monthly Tuition Fee: €400 +VAT"
    );
    expect(html).toContain("https://buy.stripe.com/fZu00k5PZgIbepy4fY6wE00");
    expect(html).toContain("https://buy.stripe.com/8x2dRa3HR77Bbdmh2K6wE01");
    // Verbatim typo preserved.
    expect(html).toContain("commitment to to increase wellbeing");
    expect(html).toContain("Anna Andersone");
  });

  it("HTML-escapes signer name to prevent template injection", () => {
    const html = renderContractHtml({
      agreement_type: "full",
      signer: {
        name: "<script>alert('xss')</script>",
        surname: "Bērziņš",
        personal_code: "320198-12345",
        country_code: "LV",
      },
      recipient_email: "test@example.com",
      recipient_phone: "+371 20000000",
      recipient_address: "Test address 1",
      date_today: "20.05.2026",
      agreement_reference: "SS-2026-XSS",
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders both templates with identical structural sections", () => {
    const sharedData = {
      signer: sampleSigner,
      recipient_email: "test@example.com",
      recipient_phone: "+371 20000000",
      recipient_address: "Test address",
      date_today: "20.05.2026",
      agreement_reference: "SS-2026-STRUCT",
    };
    const full = renderContractHtml({ ...sharedData, agreement_type: "full" });
    const partial = renderContractHtml({
      ...sharedData,
      agreement_type: "partial",
    });

    const expectedSections = [
      "1. Subject of the Agreement",
      "2. General Terms",
      "3. Tuition Fee, Scholarship, Enrolment Fee and Payment Terms",
      "4. Performance Reviews",
      "5. Consequences of Late or Non-Payment",
      "6. Suspension and Rejoining the Program",
      "7. Further Participation After First Year",
      "8. Effective Date and Termination",
      "9. Information and Confidentiality",
      "10. Final Provisions",
      "Particulars of the Parties",
      "Signatures of the Parties",
    ];
    for (const section of expectedSections) {
      expect(full).toContain(section);
      expect(partial).toContain(section);
    }
  });
});
