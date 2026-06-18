// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CountryFeature, GlobeEventData } from "../../components/InteractiveGlobe";
import type { QuizCountry, QuizFlagPrompt } from "../../utils/pickRandomFlagPrompt";
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

function makeCountry(isoAlpha2: string, lat = 10, lng = 20): QuizCountry<CountryFeature> {
  return {
    feature: makeFeature(`Country ${isoAlpha2}`, isoAlpha2),
    isoAlpha2,
    name: `Country ${isoAlpha2}`,
    lat,
    lng
  };
}

function makePrompt(flagCode: string, countries = [makeCountry(flagCode)]): QuizFlagPrompt<CountryFeature> {
  return {
    flagCode,
    countries
  };
}

describe("useQuizRound", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(result.current.highlightedCountry?.isoAlpha2).toBe("FR");
  });

  it("keeps the second shared-flag country highlighted after a correct submit", () => {
    const prompts = [makePrompt("GP", [makeCountry("GP", 16.3, -61.5), makeCountry("FR", 48.8, 2.3)])];
    const { result } = renderHook(() => useQuizRound(prompts));

    act(() => {
      result.current.selectCountry({
        lat: 48.8,
        lng: 2.3,
        label: "Country FR (FR)",
        isoAlpha2: "FR"
      });
    });

    act(() => {
      result.current.submitAnswer();
    });

    expect(result.current.result).toBe("correct");
    expect(result.current.selected).toBeNull();
    expect(result.current.highlightedCountry).toMatchObject({
      isoAlpha2: "FR",
      lat: 48.8,
      lng: 2.3
    });
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
    expect(result.current.highlightedCountry?.isoAlpha2).toBe("US");

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
    expect(result.current.highlightedCountry).toBeNull();
    expect(result.current.current).not.toBeNull();
  });

  it("does not pick the same prompt on the next round when alternatives exist", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const prompts = [makePrompt("FR"), makePrompt("US")];
    const { result } = renderHook(() => useQuizRound(prompts));

    expect(result.current.current?.flagCode).toBe("FR");

    act(() => {
      result.current.startNextRound();
    });

    expect(result.current.current?.flagCode).toBe("US");
  });

  it("highlights one valid country when the answer is revealed", () => {
    const prompts = [makePrompt("GP", [makeCountry("GP", 16.3, -61.5), makeCountry("FR", 48.8, 2.3)])];
    const { result } = renderHook(() => useQuizRound(prompts));

    act(() => {
      result.current.showAnswer();
    });

    expect(result.current.result).toBe("revealed");
    expect(result.current.highlightedCountry).toMatchObject({
      isoAlpha2: "GP",
      lat: 16.3,
      lng: -61.5
    });
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
    expect(result.current.highlightedCountry).toBeNull();
  });
});
