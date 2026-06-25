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
  it("builds geographic knowledge prompts from globe countries", () => {
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
    expect(result.current.quizKnowledgePrompts.length).toBeGreaterThanOrEqual(3);
    expect(result.current.quizKnowledgePrompts.map((prompt: { metadata: { topic: string } }) => prompt.metadata.topic)).toEqual(
      expect.arrayContaining(["feature-country", "hemisphere", "country-ranking"])
    );

    const populationPrompt = result.current.quizKnowledgePrompts.find((prompt) =>
      prompt.id === "knowledge:country-ranking:country-ranking-sp-pop-totl-2024-descending-2:CN"
    );
    expect(populationPrompt?.countries.map((country: { isoAlpha2: string }) => country.isoAlpha2)).toEqual(["CN"]);
  });
});
