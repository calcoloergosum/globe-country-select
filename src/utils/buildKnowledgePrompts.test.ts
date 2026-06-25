import { describe, expect, it } from "vitest";

import {
  buildKnowledgePromptGenerationResult,
  buildKnowledgePrompts,
  formatOrdinal
} from "./buildKnowledgePrompts";
import type { QuizCountry } from "./quizPrompts";

function makeCountry(isoAlpha2: string, name = isoAlpha2, lat = 10, lng = 10): QuizCountry {
  return { feature: {}, isoAlpha2, lat, lng, name };
}

const representativeCountries = [
  makeCountry("JP", "Japan", 36, 138),
  makeCountry("KE", "Kenya", 0.5, 38),
  makeCountry("TZ", "Tanzania", -6, 35),
  makeCountry("UG", "Uganda", 2, 33),
  makeCountry("CN", "China", 32, 106),
  makeCountry("NP", "Nepal", 28, 84),
  makeCountry("DE", "Germany", 51, 10),
  makeCountry("IT", "Italy", 45, 11),
  makeCountry("AT", "Austria", 47, 14),
  makeCountry("CH", "Switzerland", 47, 7),
  makeCountry("FR", "France", 47, 3),
  makeCountry("US", "United States", 40, -97),
  makeCountry("CA", "Canada", 56, -106),
  makeCountry("BR", "Brazil", -12, -50),
  makeCountry("NL", "Netherlands", 52, 5),
  makeCountry("IN", "India", 23, 79),
  makeCountry("ID", "Indonesia", -2, 118),
  makeCountry("PK", "Pakistan", 30, 70),
  makeCountry("RU", "Russia", 61, 96),
  makeCountry("DK", "Denmark", 56, 10),
  makeCountry("FI", "Finland", 64, 26),
  makeCountry("IS", "Iceland", 65, -19),
  makeCountry("NO", "Norway", 62, 10),
  makeCountry("SE", "Sweden", 62, 15),
  makeCountry("EE", "Estonia", 59, 26),
  makeCountry("LV", "Latvia", 57, 25),
  makeCountry("LT", "Lithuania", 56, 24)
];

describe("buildKnowledgePrompts", () => {
  it("builds sourced prompts from normalized geographic entities and relationships", () => {
    const prompts = buildKnowledgePrompts(representativeCountries, { seed: "test" });

    expect(prompts.length).toBeGreaterThanOrEqual(10);
    expect(prompts).toEqual(buildKnowledgePrompts(representativeCountries, { seed: "test" }));

    const lakeVictoria = prompts.find((prompt) => prompt.id.startsWith("knowledge:feature-country:feature-q5505"));
    expect(lakeVictoria).toMatchObject({
      metadata: {
        topic: "feature-country",
        sourceIds: ["wikidata-geographic-entities"]
      }
    });
    expect(lakeVictoria?.countries.map((country) => country.isoAlpha2)).toEqual(["KE", "TZ", "UG"]);

    const berlin = prompts.find((prompt) => prompt.id === "knowledge:capital-country:settlement-q64:DE");
    expect(berlin).toMatchObject({
      question: expect.stringContaining("Berlin"),
      countries: [{ isoAlpha2: "DE", name: "Germany" }]
    });

    const borderIntersection = prompts.find((prompt) =>
      prompt.id.startsWith("knowledge:border-intersection:border-intersection-de-it")
    );
    expect(borderIntersection?.countries.map((country) => country.isoAlpha2)).toEqual(["AT", "CH", "FR"]);

    const population = prompts.find((prompt) =>
      prompt.id === "knowledge:country-ranking:country-ranking-sp-pop-totl-2024-descending-2:CN"
    );
    expect(population).toMatchObject({
      question: "Which country had the 2nd largest population in 2024?",
      countries: [{ isoAlpha2: "CN", name: "China" }],
      metadata: {
        topic: "country-ranking",
        year: 2024,
        indicator: { code: "SP.POP.TOTL" }
      }
    });
  });

  it("exposes rejection diagnostics for unsafe or underspecified source records", () => {
    const result = buildKnowledgePromptGenerationResult(representativeCountries);

    expect(result.rejections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recordId: "feature:Q6583", reason: "excluded-by-feature-answer-strategy" }),
        expect.objectContaining({ recordId: "settlement:Q1218", reason: "disputed-capital-status" }),
        expect.objectContaining({ recordId: "region:south-america-sample", reason: "incomplete-region-membership" }),
        expect.objectContaining({ recordId: "country-adjacency:RS:XK", reason: "disputed-adjacency-skipped" })
      ])
    );
  });
});

describe("formatOrdinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22.9, "22nd"],
    [-23, "-23rd"]
  ])("formats %s as %s", (value: number, expected: string) => {
    expect(formatOrdinal(value)).toBe(expected);
  });
});
