// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CountryFeature } from "../../components/InteractiveGlobe";
import type { QuizKnowledgePrompt } from "../../utils/quizPrompts";
import { QuizOverlay } from "./QuizOverlay";

const chinaFeature: CountryFeature = {
  type: "Feature",
  properties: { ADMIN: "China", ISO_A2: "CN" },
  geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }
};

const populationPrompt: QuizKnowledgePrompt<CountryFeature> = {
  id: "knowledge:population-total-2024-rank-2:CN",
  kind: "knowledge",
  question: "Which country had the 2nd largest population in 2024?",
  countries: [
    {
      feature: chinaFeature,
      isoAlpha2: "CN",
      name: "China",
      lat: 35,
      lng: 103
    }
  ],
  explanation: "China ranks 2nd after sorting the 2024 population values.",
  source: {
    name: "World Bank — Population, total (SP.POP.TOTL)",
    url: "https://data.worldbank.org/indicator/SP.POP.TOTL",
    license: "CC BY 4.0"
  },
  metadata: {
    topic: "ranking",
    year: 2024,
    indicator: { code: "SP.POP.TOTL", label: "Population, total" },
    transformation: "Sort values highest to lowest and select position 2.",
    coverage: "Top-five extract"
  }
};

afterEach(() => cleanup());

describe("QuizOverlay knowledge prompts", () => {
  it("renders a data question, switches question sets, and reveals its source", () => {
    const onQuestionSetChange = vi.fn();
    const commonProps = {
      page: "quiz" as const,
      onNavigate: vi.fn(),
      questionSet: "mixed" as const,
      onQuestionSetChange,
      currentPrompt: populationPrompt,
      promptCount: 2,
      selected: null,
      onSubmit: vi.fn(),
      onSkip: vi.fn(),
      onShowAnswer: vi.fn(),
      onNextRound: vi.fn()
    };

    const view = render(<QuizOverlay {...commonProps} result={null} />);

    expect(screen.queryByText(populationPrompt.question)).not.toBeNull();
    expect(screen.queryByText("Data year: 2024")).not.toBeNull();
    expect(screen.queryByRole("img", { name: "Flag to identify" })).toBeNull();
    expect(screen.queryByText(populationPrompt.explanation)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "World facts" }));
    expect(onQuestionSetChange).toHaveBeenCalledWith("knowledge");

    view.rerender(<QuizOverlay {...commonProps} result="revealed" />);

    expect(screen.queryByText("Answer:", { exact: false })).not.toBeNull();
    expect(screen.queryByText("China", { exact: false })).not.toBeNull();
    expect(screen.queryByText(populationPrompt.explanation)).not.toBeNull();
    expect(screen.getByRole("link", { name: /World Bank/ }).getAttribute("href")).toBe(populationPrompt.source.url);
    expect(screen.queryByText("How this question was built")).not.toBeNull();
    expect(screen.queryByText("Top-five extract")).not.toBeNull();
  });

  it("renders a sourced location question without a data-year badge", () => {
    const japanFeature: CountryFeature = {
      ...chinaFeature,
      properties: { ADMIN: "Japan", ISO_A2: "JP" }
    };
    const locationPrompt: QuizKnowledgePrompt<CountryFeature> = {
      id: "knowledge:lake-biwa-country:JP",
      kind: "knowledge",
      question: "In which country is Lake Biwa?",
      countries: [{ feature: japanFeature, isoAlpha2: "JP", name: "Japan", lat: 35, lng: 136 }],
      explanation: "Lake Biwa is in central Japan.",
      source: { name: "Lake Biwa Museum", url: "https://www.biwahaku.jp/english/facts/index.html" },
      metadata: {
        topic: "location",
        transformation: "Resolve JP against the globe dataset."
      }
    };

    render(
      <QuizOverlay
        page="quiz"
        onNavigate={vi.fn()}
        currentPrompt={locationPrompt}
        promptCount={1}
        selected={null}
        result="correct"
        onSubmit={vi.fn()}
        onSkip={vi.fn()}
        onShowAnswer={vi.fn()}
        onNextRound={vi.fn()}
      />
    );

    expect(screen.queryByText("Place")).not.toBeNull();
    expect(screen.queryByText("Data year:", { exact: false })).toBeNull();
    expect(screen.queryByText("Lake Biwa is in central Japan.")).not.toBeNull();
    expect(screen.queryByText("CC BY 4.0", { exact: false })).toBeNull();
  });
});
