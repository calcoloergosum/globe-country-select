import { describe, expect, it } from "vitest";

import type { KnowledgeQuestionDefinition } from "../data/knowledgeQuestions";
import { buildKnowledgePrompts, formatOrdinal } from "./buildKnowledgePrompts";
import type { QuizCountry } from "./quizPrompts";

function makeCountry(isoAlpha2: string, name = isoAlpha2): QuizCountry {
  return { feature: {}, isoAlpha2, lat: 0, lng: 0, name };
}

const source = { name: "Test source", url: "https://example.com" };

describe("buildKnowledgePrompts", () => {
  it("builds the Lake Biwa and 2024 population prompts from source records", () => {
    const prompts = buildKnowledgePrompts([
      makeCountry("JP", "Japan"),
      makeCountry("IN", "India"),
      makeCountry("CN", "China"),
      makeCountry("US", "United States"),
      makeCountry("ID", "Indonesia"),
      makeCountry("PK", "Pakistan")
    ]);

    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toMatchObject({
      id: "knowledge:lake-biwa-country:JP",
      question: "In which country is Lake Biwa?",
      countries: [{ isoAlpha2: "JP", name: "Japan" }],
      source: { name: "Lake Biwa Museum — Facts of Lake Biwa" },
      metadata: { topic: "location" }
    });
    expect(prompts[1]).toMatchObject({
      id: "knowledge:population-total-2024-rank-2:CN",
      question: "Which country had the 2nd largest population in 2024?",
      countries: [{ isoAlpha2: "CN", name: "China" }],
      source: { name: "World Bank — Population, total (SP.POP.TOTL)" },
      metadata: {
        topic: "ranking",
        year: 2024,
        indicator: { code: "SP.POP.TOTL" }
      }
    });
    expect(prompts[1].explanation).toContain("China ranks 2nd");
  });

  it("supports ascending rankings and accepts every country tied at the target value", () => {
    const definitions: KnowledgeQuestionDefinition[] = [
      {
        kind: "ranking",
        id: "smallest-test",
        questionNoun: "test value",
        indicator: { code: "TEST", label: "Test value" },
        year: 2020,
        rank: 2,
        direction: "ascending",
        values: [
          { isoAlpha2: "AA", value: 1 },
          { isoAlpha2: "BB", value: 2 },
          { isoAlpha2: "CC", value: 2 },
          { isoAlpha2: "DD", value: 4 }
        ],
        coverage: "Complete test fixture",
        source
      }
    ];

    const [prompt] = buildKnowledgePrompts(
      [makeCountry("AA"), makeCountry("BB"), makeCountry("CC"), makeCountry("DD")],
      definitions
    );

    expect(prompt.question).toBe("Which country had the 2nd smallest test value in 2020?");
    expect(prompt.countries.map((country) => country.isoAlpha2)).toEqual(["BB", "CC"]);
    expect(prompt.explanation).toContain("BB and CC share 2nd");
    expect(prompt.metadata.transformation).toContain("lowest to highest");
  });

  it("skips definitions with invalid ranks or unavailable accepted answers", () => {
    const definitions: KnowledgeQuestionDefinition[] = [
      {
        kind: "location",
        id: "missing-location",
        question: "Where?",
        answerIsoAlpha2: ["AA", "ZZ"],
        explanation: "Missing answer",
        source
      },
      {
        kind: "ranking",
        id: "invalid-rank",
        questionNoun: "value",
        indicator: { code: "TEST", label: "Test" },
        year: 2020,
        rank: 0,
        direction: "descending",
        values: [{ isoAlpha2: "AA", value: 10 }],
        coverage: "Fixture",
        source
      },
      {
        kind: "ranking",
        id: "out-of-range",
        questionNoun: "value",
        indicator: { code: "TEST", label: "Test" },
        year: 2020,
        rank: 3,
        direction: "descending",
        values: [
          { isoAlpha2: "AA", value: Number.NaN },
          { isoAlpha2: "BB", value: 5 }
        ],
        coverage: "Fixture",
        source
      },
      {
        kind: "ranking",
        id: "missing-tied-answer",
        questionNoun: "value",
        indicator: { code: "TEST", label: "Test" },
        year: 2020,
        rank: 2,
        direction: "descending",
        values: [
          { isoAlpha2: "AA", value: 10 },
          { isoAlpha2: "BB", value: 5 },
          { isoAlpha2: "ZZ", value: 5 }
        ],
        coverage: "Fixture",
        source
      }
    ];

    expect(buildKnowledgePrompts([makeCountry("AA"), makeCountry("BB")], definitions)).toEqual([]);
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
