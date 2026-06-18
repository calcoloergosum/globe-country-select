import { describe, expect, it } from "vitest";

import type { CountryFeature } from "../../components/InteractiveGlobe";
import { deriveQuizGlobeState } from "./quizGlobeState";
import type { QuizHighlightedCountry, QuizResult } from "./types";

function makeFeature(name: string): CountryFeature {
  return {
    type: "Feature",
    properties: {
      ADMIN: name,
      ISO_A2: name.slice(0, 2).toUpperCase()
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 1], [2, 2]]]
    }
  };
}

describe("deriveQuizGlobeState", () => {
  it.each<{
    result: QuizResult;
    expectedPinnedIso: string | undefined;
    expectedFocusLatLng: { lat: number; lng: number } | undefined;
    expectFocusCountry: boolean;
  }>([
    {
      result: null,
      expectedPinnedIso: undefined,
      expectedFocusLatLng: undefined,
      expectFocusCountry: false
    },
    {
      result: "correct",
      expectedPinnedIso: "GP",
      expectedFocusLatLng: { lat: 16.3, lng: -61.5 },
      expectFocusCountry: true
    },
    {
      result: "incorrect",
      expectedPinnedIso: "GP",
      expectedFocusLatLng: { lat: 16.3, lng: -61.5 },
      expectFocusCountry: true
    },
    {
      result: "revealed",
      expectedPinnedIso: "GP",
      expectedFocusLatLng: { lat: 16.3, lng: -61.5 },
      expectFocusCountry: true
    }
  ])(
    "maps result=$result to globe state for an explicit highlighted country",
    ({ result, expectedPinnedIso, expectedFocusLatLng, expectFocusCountry }) => {
      const highlightedFeature = makeFeature("Guadeloupe");
      const highlightedCountry: QuizHighlightedCountry = {
        feature: highlightedFeature,
        isoAlpha2: "GP",
        lat: 16.3,
        lng: -61.5,
        name: "Guadeloupe"
      };

      const state = deriveQuizGlobeState(highlightedCountry, result);

      expect(state.pinnedIso).toBe(expectedPinnedIso);
      expect(state.focusLatLng).toEqual(expectedFocusLatLng);
      expect(state.focusCountry).toBe(expectFocusCountry ? highlightedFeature : undefined);
    }
  );

  it("returns undefined fields when highlighted country is null", () => {
    const state = deriveQuizGlobeState(null, "incorrect");

    expect(state).toEqual({
      pinnedIso: undefined,
      focusLatLng: undefined,
      focusCountry: undefined
    });
  });
});
