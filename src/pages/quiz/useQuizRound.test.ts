// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CountryFeature, GlobeEventData } from "../../components/InteractiveGlobe";
import type { QuizFlagPrompt } from "../../utils/pickRandomFlagPrompt";
import { useQuizRound } from "./useQuizRound";

function makeFeature(name: string, isoAlpha2: string): CountryFeature {
  return {
    type: "Feature",
    properties: {
      ADMIN: name,
      ISO_A2: isoAlpha2
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]]
    }
  };
}

function makePrompt(flagCode: string): QuizFlagPrompt<CountryFeature> {
  const feature = makeFeature(`Country ${flagCode}`, flagCode);
  return {
    flagCode,
    countries: [
      {
        feature,
        isoAlpha2: flagCode,
        name: `Country ${flagCode}`,
        lat: 10,
        lng: 20
      }
    ]
  };
}

describe("useQuizRound", () => {
  it("selects and submits a correct answer", () => {
    const prompts = [makePrompt("FR")];
    const { result } = renderHook(() => useQuizRound(prompts));

    const selected: GlobeEventData = {
      lat: 0,
      lng: 0,
      label: "France (FR)",
      isoAlpha2: "FR"
    };

    act(() => {
      result.current.selectCountry(selected);
    });
    expect(result.current.selected).toEqual(selected);

    act(() => {
      result.current.submitAnswer();
    });

    expect(result.current.result).toBe("correct");
    expect(result.current.selected).toBeNull();
  });

  it("marks incorrect answers and supports reveal", () => {
    const prompts = [makePrompt("US")];
    const { result } = renderHook(() => useQuizRound(prompts));

    act(() => {
      result.current.selectCountry({ lat: 0, lng: 0, label: "Wrong", isoAlpha2: "FR" });
    });

    expect(result.current.selected?.isoAlpha2).toBe("FR");

    act(() => {
      result.current.submitAnswer();
    });

    expect(result.current.result).toBe("incorrect");

    act(() => {
      result.current.showAnswer();
    });

    expect(result.current.result).toBe("incorrect");
  });

  it("reveals answer, blocks selection while resolved, and advances rounds", () => {
    const prompts = [makePrompt("FR"), makePrompt("US")];
    const { result } = renderHook(() => useQuizRound(prompts));

    act(() => {
      result.current.showAnswer();
    });

    expect(result.current.result).toBe("revealed");

    act(() => {
      result.current.selectCountry({ lat: 0, lng: 0, label: "Ignored", isoAlpha2: "US" });
    });

    expect(result.current.selected).toBeNull();

    const previousRound = result.current.quizRound;
    act(() => {
      result.current.startNextRound();
    });

    expect(result.current.quizRound).toBe(previousRound + 1);
    expect(result.current.result).toBeNull();
    expect(result.current.selected).toBeNull();
    expect(result.current.current).not.toBeNull();
  });

  it("returns empty state for no prompts and keeps actions safe", () => {
    const { result } = renderHook(() => useQuizRound([]));

    expect(result.current.current).toBeNull();
    expect(result.current.result).toBeNull();

    act(() => {
      result.current.submitAnswer();
      result.current.skipRound();
      result.current.showAnswer();
      result.current.startNextRound();
    });

    expect(result.current.current).toBeNull();
    expect(result.current.quizRound).toBe(0);
    expect(result.current.result).toBeNull();
  });
});
