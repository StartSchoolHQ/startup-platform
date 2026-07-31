/**
 * Unit tests for the per-agreement-type school signer selection.
 *
 * Why this matters: scholarship contracts (full/partial/part_time) are
 * countersigned by the board member (SCHOOL_SIGNER_*), while equipment
 * agreements (laptop/keycard) are countersigned by the campus manager
 * (EQUIPMENT_SIGNER_*). Picking the wrong identity bakes the wrong
 * co-signer into the Dokobit document at creation — unrecoverable without
 * re-creating the signing. So we lock the mapping in.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  schoolSignerConfig,
  signerGroupFor,
} from "@/lib/scholarship/school-signer";

const ENV_KEYS = [
  "SCHOOL_SIGNER_NAME",
  "SCHOOL_SIGNER_SURNAME",
  "SCHOOL_SIGNER_PERSONAL_CODE",
  "SCHOOL_SIGNER_COUNTRY_CODE",
  "EQUIPMENT_SIGNER_NAME",
  "EQUIPMENT_SIGNER_SURNAME",
  "EQUIPMENT_SIGNER_PERSONAL_CODE",
  "EQUIPMENT_SIGNER_COUNTRY_CODE",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.SCHOOL_SIGNER_NAME = "test_Anna";
  process.env.SCHOOL_SIGNER_SURNAME = "test_Andersone";
  process.env.SCHOOL_SIGNER_PERSONAL_CODE = "111111-11111";
  process.env.SCHOOL_SIGNER_COUNTRY_CODE = "LV";
  process.env.EQUIPMENT_SIGNER_NAME = "test_Janis";
  process.env.EQUIPMENT_SIGNER_SURNAME = "test_Altgauzens";
  process.env.EQUIPMENT_SIGNER_PERSONAL_CODE = "222222-22222";
  process.env.EQUIPMENT_SIGNER_COUNTRY_CODE = "LV";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("signerGroupFor", () => {
  it.each(["full", "partial", "part_time"] as const)(
    "maps %s to the board group",
    (type) => {
      expect(signerGroupFor(type)).toBe("board");
    }
  );

  it.each(["laptop", "keycard"] as const)(
    "maps %s to the equipment group",
    (type) => {
      expect(signerGroupFor(type)).toBe("equipment");
    }
  );
});

describe("schoolSignerConfig", () => {
  it("returns the board identity for scholarship contracts", () => {
    expect(schoolSignerConfig("full")).toEqual({
      name: "test_Anna",
      surname: "test_Andersone",
      code: "111111-11111",
      country_code: "LV",
    });
  });

  it("returns the equipment identity for laptop and keycard agreements", () => {
    for (const type of ["laptop", "keycard"] as const) {
      expect(schoolSignerConfig(type)).toEqual({
        name: "test_Janis",
        surname: "test_Altgauzens",
        code: "222222-22222",
        country_code: "LV",
      });
    }
  });

  it("throws loudly when an equipment signer variable is missing", () => {
    delete process.env.EQUIPMENT_SIGNER_PERSONAL_CODE;
    expect(() => schoolSignerConfig("laptop")).toThrow(
      "EQUIPMENT_SIGNER_PERSONAL_CODE is not set"
    );
  });

  it("does not require equipment variables for scholarship contracts", () => {
    delete process.env.EQUIPMENT_SIGNER_NAME;
    expect(() => schoolSignerConfig("partial")).not.toThrow();
  });
});
