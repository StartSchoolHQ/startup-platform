import { describe, expect, it } from "vitest";
import { ScholarshipFormSchema } from "@/lib/validation-schemas";

describe("ScholarshipFormSchema", () => {
  const valid = {
    agreement_type: "full" as const,
    email: "test_student@example.com",
    confirm_email: "test_student@example.com",
    phone: "+371 20000000",
    address: "Brīvības iela 1, Rīga, LV-1010",
    language: "en" as const,
  };

  it("accepts a valid full-scholarship submission", () => {
    const result = ScholarshipFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts a valid partial-scholarship submission", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      agreement_type: "partial",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched emails with an error on confirm_email", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      confirm_email: "different@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const onConfirm = result.error.issues.some((i) =>
        i.path.includes("confirm_email")
      );
      expect(onConfirm).toBe(true);
    }
  });

  it("rejects an invalid email", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      email: "not-an-email",
      confirm_email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects email longer than 320 chars", () => {
    const long = `${"a".repeat(311)}@example.com`; // 311 + 12 = 323
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      email: long,
      confirm_email: long,
    });
    expect(result.success).toBe(false);
  });

  it("rejects phone with invalid characters", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      phone: "letters-not-allowed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects phone shorter than 4 chars", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      phone: "+12",
    });
    expect(result.success).toBe(false);
  });

  it("rejects address shorter than 4 chars", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      address: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects address longer than 500 chars", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      address: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("defaults language to 'en' when omitted", () => {
    const { language, ...rest } = valid;
    void language;
    const result = ScholarshipFormSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("en");
    }
  });

  it("rejects unknown agreement_type", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      agreement_type: "freebie",
    });
    expect(result.success).toBe(false);
  });

  it("rejects 'part_time' agreement_type (dormant DB enum value, not exposed)", () => {
    const result = ScholarshipFormSchema.safeParse({
      ...valid,
      agreement_type: "part_time",
    });
    expect(result.success).toBe(false);
  });
});
