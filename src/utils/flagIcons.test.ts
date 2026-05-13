import { describe, expect, it } from "vitest";

import { hasFlagIcon } from "./flagIcons";

describe("hasFlagIcon", () => {
  it("returns true for supported codes regardless of case/whitespace", () => {
    expect(hasFlagIcon(" us ")).toBe(true);
    expect(hasFlagIcon("FR")).toBe(true);
  });

  it("returns false for missing or unsupported codes", () => {
    expect(hasFlagIcon()).toBe(false);
    expect(hasFlagIcon(null)).toBe(false);
    expect(hasFlagIcon("   ")).toBe(false);
    expect(hasFlagIcon("1A")).toBe(false);
  });
});