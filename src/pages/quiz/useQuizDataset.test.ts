// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useQuizDataset } from "./useQuizDataset";

function makeRawGeoJson(features: unknown[]) {
  return JSON.stringify({
    type: "FeatureCollection",
    features
  });
}

describe("useQuizDataset", () => {
  it("parses countries and filters quiz countries to supported flag codes", () => {
    const raw = makeRawGeoJson([
      {
        type: "Feature",
        properties: { ADMIN: "France", ISO_A2: "FR", LABEL_X: 2.3, LABEL_Y: 48.8 },
        geometry: {
          type: "Polygon",
          coordinates: [[[2, 47], [3, 47], [3, 48], [2, 47]]]
        }
      },
      {
        type: "Feature",
        properties: { ADMIN: "Unknown", ISO_A2: "1A", LABEL_X: 0, LABEL_Y: 0 },
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]]
        }
      },
      {
        type: "Feature",
        properties: { ADMIN: "NoISO" },
        geometry: {
          type: "Polygon",
          coordinates: [[[10, 10], [11, 10], [11, 11], [10, 10]]]
        }
      }
    ]);

    const { result } = renderHook(({ value }) => useQuizDataset(value), {
      initialProps: { value: raw }
    });

    expect(result.current.countries).toHaveLength(3);
    expect(result.current.quizCountries).toHaveLength(1);
    expect(result.current.quizCountries[0].isoAlpha2).toBe("FR");
    expect(result.current.quizFlagPrompts).toHaveLength(1);
    expect(result.current.quizFlagPrompts[0].flagCode).toBe("FR");
  });

  it("memoizes by raw geojson input value", () => {
    const rawA = makeRawGeoJson([
      {
        type: "Feature",
        properties: { ADMIN: "United States", ISO_A2: "US" },
        geometry: {
          type: "Polygon",
          coordinates: [[[-101, 40], [-100, 40], [-100, 41], [-101, 40]]]
        }
      }
    ]);
    const rawB = makeRawGeoJson([
      {
        type: "Feature",
        properties: { ADMIN: "France", ISO_A2: "FR" },
        geometry: {
          type: "Polygon",
          coordinates: [[[2, 47], [3, 47], [3, 48], [2, 47]]]
        }
      }
    ]);

    const { result, rerender } = renderHook(({ value }) => useQuizDataset(value), {
      initialProps: { value: rawA }
    });

    const firstCountriesRef = result.current.countries;
    const firstQuizCountriesRef = result.current.quizCountries;
    const firstPromptsRef = result.current.quizFlagPrompts;

    rerender({ value: rawA });
    expect(result.current.countries).toBe(firstCountriesRef);
    expect(result.current.quizCountries).toBe(firstQuizCountriesRef);
    expect(result.current.quizFlagPrompts).toBe(firstPromptsRef);

    rerender({ value: rawB });
    expect(result.current.countries).not.toBe(firstCountriesRef);
    expect(result.current.quizCountries[0].isoAlpha2).toBe("FR");
  });
});
