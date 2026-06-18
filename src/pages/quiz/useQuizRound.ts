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

  useEffect(() => {
    if (!current && quizFlagPrompts.length > 0) {
      setCurrent(pickNextFlagPrompt(quizFlagPrompts));
    }
  }, [current, quizFlagPrompts]);

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
