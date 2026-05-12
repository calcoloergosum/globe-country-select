import { afterEach, describe, expect, it, vi } from "vitest";

import { buildFlagPrompts, pickRandomFlagPrompt, type QuizCountry, type QuizFlagPrompt } from "./pickRandomFlagPrompt";

function makeCountry(isoAlpha2: string): QuizCountry {
  return {
    feature: {},
    isoAlpha2,
    lat: 0,
    lng: 0,
    name: isoAlpha2
  };
}

describe("buildFlagPrompts", () => {
  it("groups countries by shared flag and keeps the first country's flag code", () => {
    const countries: QuizCountry[] = [
      makeCountry("GP"),
      makeCountry("DE"),
      makeCountry("FR"),
      makeCountry("US"),
      makeCountry("UM"),
      makeCountry("ZZ")
    ];

    const prompts = buildFlagPrompts(countries);

    expect(prompts).toHaveLength(4);
    expect(prompts.map((prompt) => prompt.flagCode)).toEqual(["GP", "DE", "US", "ZZ"]);

    expect(prompts[0].countries.map((country) => country.isoAlpha2)).toEqual(["GP", "FR"]);
    expect(prompts[1].countries.map((country) => country.isoAlpha2)).toEqual(["DE"]);
    expect(prompts[2].countries.map((country) => country.isoAlpha2)).toEqual(["US", "UM"]);
    expect(prompts[3].countries.map((country) => country.isoAlpha2)).toEqual(["ZZ"]);
  });
});

describe("pickRandomFlagPrompt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { random: 0, expected: "A" },
    { random: 0.34, expected: "B" },
    { random: 0.999, expected: "C" }
  ])("selects prompt $expected for Math.random()=$random", ({ random, expected }) => {
    const prompts: QuizFlagPrompt[] = [
      { flagCode: "A", countries: [makeCountry("AA")] },
      { flagCode: "B", countries: [makeCountry("BB")] },
      { flagCode: "C", countries: [makeCountry("CC")] }
    ];

    vi.spyOn(Math, "random").mockReturnValue(random);

    expect(pickRandomFlagPrompt(prompts).flagCode).toBe(expected);
  });
});