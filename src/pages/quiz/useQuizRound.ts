// Quiz round state machine hook for selection, submission, reveal, and progression.
import { useCallback, useEffect, useState } from "react";
import type { CountryFeature, GlobeEventData } from "../../components/InteractiveGlobe";
import { pickNextFlagPrompt, type QuizFlagPrompt } from "../../utils/pickRandomFlagPrompt";
import type { QuizHighlightedCountry, QuizPrompt, QuizResult, QuizSelection } from "./types";

type UseQuizRoundResult = {
  current: QuizPrompt | null;
  quizRound: number;
  selected: QuizSelection;
  highlightedCountry: QuizHighlightedCountry;
  result: QuizResult;
  startNextRound: () => void;
  selectCountry: (data: GlobeEventData | null) => void;
  submitAnswer: () => void;
  skipRound: () => void;
  showAnswer: () => void;
};

function getDefaultHighlightedCountry(current: QuizPrompt): QuizHighlightedCountry {
  return current.countries[0] ?? null;
}

function findPromptCountry(current: QuizPrompt, isoAlpha2: string | undefined | null) {
  return current.countries.find((country) => country.isoAlpha2 === isoAlpha2) ?? null;
}

export function useQuizRound(
  quizFlagPrompts: QuizFlagPrompt<CountryFeature>[]
): UseQuizRoundResult {
  const [current, setCurrent] = useState<QuizPrompt | null>(() =>
    pickNextFlagPrompt(quizFlagPrompts)
  );
  const [quizRound, setQuizRound] = useState(0);
  const [selected, setSelected] = useState<QuizSelection>(null);
  const [highlightedCountry, setHighlightedCountry] = useState<QuizHighlightedCountry>(null);
  const [result, setResult] = useState<QuizResult>(null);

  // Reconciles the active round when the prompt dataset changes (e.g. dataset
  // reload). Deliberately depends only on `quizFlagPrompts`: it reads the other
  // state values but must not re-run when they change, or selecting/submitting
  // mid-round would re-trigger reconciliation. The reads are intentional, so the
  // exhaustive-deps lint is not applied here.
  useEffect(() => {
    if (quizFlagPrompts.length === 0) {
      if (current || selected || highlightedCountry || result !== null) {
        setCurrent(null);
        setSelected(null);
        setHighlightedCountry(null);
        setResult(null);
        if (selected || highlightedCountry || result !== null) {
          setQuizRound((round) => round + 1);
        }
      }
      return;
    }

    if (!current) {
      setCurrent(pickNextFlagPrompt(quizFlagPrompts));
      return;
    }

    const updatedCurrent = quizFlagPrompts.find((prompt) => prompt.id === current.id) ?? null;
    if (!updatedCurrent) {
      setCurrent(pickNextFlagPrompt(quizFlagPrompts, { previousPrompt: current }));
      setSelected(null);
      setHighlightedCountry(null);
      setResult(null);
      if (selected || highlightedCountry || result !== null) {
        setQuizRound((round) => round + 1);
      }
      return;
    }

    setCurrent(updatedCurrent);

    let shouldClearGlobeSelection = false;
    if (selected && !findPromptCountry(updatedCurrent, selected.isoAlpha2)) {
      setSelected(null);
      shouldClearGlobeSelection = true;
    }

    if (highlightedCountry) {
      const updatedHighlightedCountry = findPromptCountry(
        updatedCurrent,
        highlightedCountry.isoAlpha2
      );

      if (updatedHighlightedCountry) {
        setHighlightedCountry(updatedHighlightedCountry);
      } else {
        setHighlightedCountry(null);
        if (result !== null) {
          setResult(null);
          shouldClearGlobeSelection = true;
        }
      }
    }

    if (shouldClearGlobeSelection) {
      setQuizRound((round) => round + 1);
    }
  }, [quizFlagPrompts]);

  const startNextRound = useCallback(() => {
    if (quizFlagPrompts.length === 0) return;

    setCurrent(pickNextFlagPrompt(quizFlagPrompts, { previousPrompt: current }));
    setSelected(null);
    setHighlightedCountry(null);
    setResult(null);
    setQuizRound((round) => round + 1);
  }, [current, quizFlagPrompts]);

  const selectCountry = useCallback(
    (data: GlobeEventData | null) => {
      if (result !== null) return;
      setSelected(data);
    },
    [result]
  );

  const submitAnswer = useCallback(() => {
    if (!current || !selected || result !== null) return;

    const selectedCountry = current.countries.find((country) => country.isoAlpha2 === selected.isoAlpha2);
    const isCorrect = !!selectedCountry;

    setHighlightedCountry(isCorrect ? selectedCountry : getDefaultHighlightedCountry(current));
    setResult(isCorrect ? "correct" : "incorrect");
    setSelected(null);
  }, [current, result, selected]);

  const skipRound = useCallback(() => {
    if (result !== null) return;
    startNextRound();
  }, [result, startNextRound]);

  const showAnswer = useCallback(() => {
    if (!current || result !== null) return;
    setHighlightedCountry(getDefaultHighlightedCountry(current));
    setResult("revealed");
    setSelected(null);
  }, [current, result]);

  return {
    current,
    quizRound,
    selected,
    highlightedCountry,
    result,
    startNextRound,
    selectCountry,
    submitAnswer,
    skipRound,
    showAnswer
  };
}
