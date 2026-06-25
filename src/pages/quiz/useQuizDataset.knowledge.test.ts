// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useQuizDataset } from "./useQuizDataset";

function makeFeature(name: string, isoAlpha2: string, offset: number) {
  return {
    type: "Feature",
    properties: { ADMIN: name, ISO_A2: isoAlpha2, LABEL_X: offset, LABEL_Y: offset },
    geometry: {
      type: "Polygon",
      coordinates: [[[offset, offset], [offset + 1, offset], [offset, offset + 1], [offset, offset]]]
    }
  };
}

describe("useQuizDataset world knowledge", () => {
  it("builds location and ranked-population prompts from globe countries", () => {
    const raw = JSON.stringify({
      type: "FeatureCollection",
      features: [
        makeFeature("Japan", "JP", 0),
        makeFeature("India", "IN", 2),
        makeFeature("China", "CN", 4),
        makeFeature("United States", "US", 6),
        makeFeature("Indonesia", "ID", 8),
        makeFeature("Pakistan", "PK", 10)
      ]
    });

    const { result } = renderHook(() => useQuizDataset(raw));

    expect(result.current.quizCountries).toHaveLength(6);
    expect(result.current.quizKnowledgePrompts).toHaveLength(2);
    expect(result.current.quizKnowledgePrompts.map((prompt: { question: string }) => prompt.question)).toEqual([
      "In which country is Lake Biwa?",
      "Which country had the 2nd largest population in 2024?"
    ]);
    expect(result.current.quizKnowledgePrompts[1].countries.map((country: { isoAlpha2: string }) => country.isoAlpha2)).toEqual(["CN"]);
  });
});
