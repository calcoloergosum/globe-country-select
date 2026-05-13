// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuizOverlay } from "./QuizOverlay";

const prompt = {
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
};

const promptWithMultipleCountries = {
  flagCode: "FR",
  countries: [
    ...prompt.countries,
    {
      feature: {
        type: "Feature",
        properties: { ADMIN: "Guadeloupe", ISO_A2: "GP" },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }
      },
      isoAlpha2: "GP",
      name: "Guadeloupe",
      lat: 16.3,
      lng: -61.5
    }
  ]
};

afterEach(() => {
  cleanup();
});

describe("QuizOverlay", () => {
  it("renders unavailable and preparing states when prompt data is missing", () => {
    const commonProps = {
      page: "quiz" as const,
      onNavigate: vi.fn(),
      selected: null,
      result: null,
      onSubmit: vi.fn(),
      onSkip: vi.fn(),
      onShowAnswer: vi.fn(),
      onNextRound: vi.fn()
    };

    const { rerender } = render(
      <QuizOverlay {...commonProps} currentPrompt={null} promptCount={0} />
    );
    expect(screen.queryByText("No quiz countries are currently available.")).not.toBeNull();

    rerender(<QuizOverlay {...commonProps} currentPrompt={null} promptCount={2} />);
    expect(screen.queryByText("Preparing quiz...")).not.toBeNull();
  });

  it("handles unresolved actions and result-next flow", () => {
    const onNavigate = vi.fn();
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    const onShowAnswer = vi.fn();
    const onNextRound = vi.fn();

    const view = render(
      <QuizOverlay
        page="quiz"
        onNavigate={onNavigate}
        currentPrompt={prompt}
        promptCount={1}
        selected={null}
        result={null}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onShowAnswer={onShowAnswer}
        onNextRound={onNextRound}
      />
    );

    const submitButton = view.getByRole("button", { name: "Submit" });
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(view.getByRole("button", { name: "Skip" }));
    fireEvent.click(view.getByRole("button", { name: "Show Answer" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onShowAnswer).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByRole("button", { name: "Explore" }));
    expect(onNavigate).toHaveBeenCalledWith("main");

    view.rerender(
      <QuizOverlay
        page="quiz"
        onNavigate={onNavigate}
        currentPrompt={prompt}
        promptCount={1}
        selected={{ lat: 48.8, lng: 2.3, label: "France (FR)", isoAlpha2: "FR" }}
        result={null}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onShowAnswer={onShowAnswer}
        onNextRound={onNextRound}
      />
    );

    expect(view.queryByText("Selected:", { exact: false })).not.toBeNull();
    expect((view.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(view.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    view.rerender(
      <QuizOverlay
        page="quiz"
        onNavigate={onNavigate}
        currentPrompt={prompt}
        promptCount={1}
        selected={null}
        result="correct"
        onSubmit={onSubmit}
        onSkip={onSkip}
        onShowAnswer={onShowAnswer}
        onNextRound={onNextRound}
      />
    );

    expect(view.queryByText("Correct!", { exact: false })).not.toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Next" }));
    expect(onNextRound).toHaveBeenCalledTimes(1);

    view.rerender(
      <QuizOverlay
        page="quiz"
        onNavigate={onNavigate}
        currentPrompt={promptWithMultipleCountries}
        promptCount={1}
        selected={null}
        result="incorrect"
        onSubmit={onSubmit}
        onSkip={onSkip}
        onShowAnswer={onShowAnswer}
        onNextRound={onNextRound}
      />
    );

    expect(view.queryByText("Incorrect!", { exact: false })).not.toBeNull();
    expect(view.queryByText("France, Guadeloupe", { exact: false })).not.toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Next" }));
    expect(onNextRound).toHaveBeenCalledTimes(2);

    view.rerender(
      <QuizOverlay
        page="quiz"
        onNavigate={onNavigate}
        currentPrompt={promptWithMultipleCountries}
        promptCount={1}
        selected={null}
        result="revealed"
        onSubmit={onSubmit}
        onSkip={onSkip}
        onShowAnswer={onShowAnswer}
        onNextRound={onNextRound}
      />
    );

    expect(view.queryByText("Valid countries for this flag:", { exact: false })).not.toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Next" }));
    expect(onNextRound).toHaveBeenCalledTimes(3);
  });
});
