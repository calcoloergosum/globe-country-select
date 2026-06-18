// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const countryFeature = {
    type: "Feature",
    properties: { ADMIN: "France", ISO_A2: "FR" },
    geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }
  };

  return {
    interactiveGlobeProps: null as null | {
      countries: unknown[];
      highlightOnHover: boolean;
      pinnedCountryIsoA2?: string;
      clearSelectionSignal?: number;
      focusLatLng?: { lat: number; lng: number };
      focusCountry?: unknown;
      enableProximityPicking?: boolean;
      onPointClick?: ((data: { lat: number; lng: number; label: string; isoAlpha2?: string } | null) => void) | undefined;
    },
    quizOverlayProps: null as null | {
      promptCount: number;
      result: "correct" | "incorrect" | "revealed" | null;
    },
    roundResult: null as "correct" | "incorrect" | "revealed" | null,
    selectCountry: vi.fn(),
    submitAnswer: vi.fn(),
    skipRound: vi.fn(),
    showAnswer: vi.fn(),
    startNextRound: vi.fn(),
    useQuizKeyboardShortcuts: vi.fn(),
    deriveQuizGlobeState: vi.fn(() => ({
      pinnedIso: "FR",
      focusLatLng: { lat: 48.8, lng: 2.3 },
      focusCountry: countryFeature
    })),
    useQuizDataset: vi.fn(() => ({
      countries: [countryFeature],
      quizFlagPrompts: [
        {
          id: "FR:FR",
          flagCode: "FR",
          countries: [
            {
              feature: countryFeature,
              isoAlpha2: "FR",
              name: "France",
              lat: 48.8,
              lng: 2.3
            }
          ]
        }
      ]
    }))
  };
});

vi.mock("../components/InteractiveGlobe", () => ({
  InteractiveGlobe: (props: {
    countries: unknown[];
    highlightOnHover: boolean;
    pinnedCountryIsoA2?: string;
    clearSelectionSignal?: number;
    focusLatLng?: { lat: number; lng: number };
    focusCountry?: unknown;
    enableProximityPicking?: boolean;
    onPointClick?: ((data: { lat: number; lng: number; label: string; isoAlpha2?: string } | null) => void) | undefined;
  }) => {
    mockState.interactiveGlobeProps = props;
    return <div data-testid="interactive-globe" />;
  }
}));

vi.mock("./quiz/QuizOverlay", () => ({
  QuizOverlay: (props: {
    promptCount: number;
    result: "correct" | "incorrect" | "revealed" | null;
  }) => {
    mockState.quizOverlayProps = props;
    return <div data-testid="quiz-overlay" />;
  }
}));

vi.mock("./quiz/useQuizDataset", () => ({
  useQuizDataset: mockState.useQuizDataset
}));

vi.mock("./quiz/useQuizKeyboardShortcuts", () => ({
  useQuizKeyboardShortcuts: mockState.useQuizKeyboardShortcuts
}));

vi.mock("./quiz/quizGlobeState", () => ({
  deriveQuizGlobeState: mockState.deriveQuizGlobeState
}));

vi.mock("./quiz/useQuizRound", () => ({
  useQuizRound: vi.fn(() => ({
    current: {
      id: "FR:FR",
      flagCode: "FR",
      countries: [
        {
          feature: {
            type: "Feature",
            properties: { ADMIN: "France", ISO_A2: "FR" },
            geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }
          },
          isoAlpha2: "FR",
          name: "France",
          lat: 48.8,
          lng: 2.3
        }
      ]
    },
    quizRound: 3,
    selected: null,
    highlightedCountry: {
      feature: {
        type: "Feature",
        properties: { ADMIN: "France", ISO_A2: "FR" },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }
      },
      isoAlpha2: "FR",
      name: "France",
      lat: 48.8,
      lng: 2.3
    },
    result: mockState.roundResult,
    startNextRound: mockState.startNextRound,
    selectCountry: mockState.selectCountry,
    submitAnswer: mockState.submitAnswer,
    skipRound: mockState.skipRound,
    showAnswer: mockState.showAnswer
  }))
}));

import { QuizPage } from "./QuizPage";

describe("QuizPage", () => {
  it("maps hook state into InteractiveGlobe and QuizOverlay props", () => {
    const { rerender } = render(<QuizPage page="quiz" onNavigate={vi.fn()} />);

    expect(mockState.useQuizDataset).toHaveBeenCalledTimes(1);
    expect(mockState.useQuizKeyboardShortcuts).toHaveBeenCalledWith(
      expect.objectContaining({ hasPrompt: true, result: null })
    );
    expect(mockState.deriveQuizGlobeState).toHaveBeenCalledWith(
      expect.objectContaining({ isoAlpha2: "FR" }),
      null
    );

    expect(mockState.interactiveGlobeProps).toMatchObject({
      highlightOnHover: true,
      pinnedCountryIsoA2: "FR",
      clearSelectionSignal: 3,
      focusLatLng: { lat: 48.8, lng: 2.3 },
      enableProximityPicking: false
    });

    mockState.interactiveGlobeProps?.onPointClick?.({
      lat: 48.8,
      lng: 2.3,
      label: "France (FR)",
      isoAlpha2: "FR"
    });
    expect(mockState.selectCountry).toHaveBeenCalledWith(
      expect.objectContaining({ isoAlpha2: "FR" })
    );

    expect(mockState.quizOverlayProps).toMatchObject({
      promptCount: 1,
      result: null
    });

    mockState.roundResult = "correct";
    rerender(<QuizPage page="quiz" onNavigate={vi.fn()} />);

    expect(mockState.interactiveGlobeProps?.highlightOnHover).toBe(false);
    expect(mockState.interactiveGlobeProps?.onPointClick).toBeUndefined();
  });
});
