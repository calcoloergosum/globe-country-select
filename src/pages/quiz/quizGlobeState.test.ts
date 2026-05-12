import { describe, expect, it } from "vitest";

import type { CountryFeature } from "../../components/InteractiveGlobe";
import { deriveQuizGlobeState } from "./quizGlobeState";
import type { QuizPrompt, QuizResult } from "./types";

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
      expectedPinnedIso: "FR",
      expectedFocusLatLng: undefined,
      expectFocusCountry: false
    },
    {
      result: "incorrect",
      expectedPinnedIso: "FR",
      expectedFocusLatLng: { lat: 48.8, lng: 2.3 },
      expectFocusCountry: true
    },
    {
      result: "revealed",
      expectedPinnedIso: "FR",
      expectedFocusLatLng: { lat: 48.8, lng: 2.3 },
      expectFocusCountry: true
    }
  ])(
    "maps result=$result to globe state",
    ({ result, expectedPinnedIso, expectedFocusLatLng, expectFocusCountry }) => {
      const answerFeature = makeFeature("France");
      const current: QuizPrompt = {
        flagCode: "FR",
        countries: [
          {
            feature: answerFeature,
            isoAlpha2: "FR",
            lat: 48.8,
            lng: 2.3,
            name: "France"
          },
          {
            feature: makeFeature("Guadeloupe"),
            isoAlpha2: "GP",
            lat: 16.3,
            lng: -61.5,
            name: "Guadeloupe"
          }
        ]
      };

      const state = deriveQuizGlobeState(current, result);

      expect(state.pinnedIso).toBe(expectedPinnedIso);
      expect(state.focusLatLng).toEqual(expectedFocusLatLng);
      expect(state.focusCountry).toBe(expectFocusCountry ? answerFeature : undefined);
    }
  );

  it("returns undefined fields when current prompt is null", () => {
    const state = deriveQuizGlobeState(null, "incorrect");

    expect(state).toEqual({
      pinnedIso: undefined,
      focusLatLng: undefined,
      focusCountry: undefined
    });
  });
});