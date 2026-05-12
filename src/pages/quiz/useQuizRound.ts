import { useCallback, useEffect, useState } from "react";
import type { CountryFeature, GlobeEventData } from "../../components/InteractiveGlobe";
import { pickRandomFlagPrompt, type QuizFlagPrompt } from "../../utils/pickRandomFlagPrompt";
import type { QuizPrompt, QuizResult, QuizSelection } from "./types";

type UseQuizRoundResult = {
  current: QuizPrompt | null;
  quizRound: number;
  selected: QuizSelection;
  result: QuizResult;
  startNextRound: () => void;
  selectCountry: (data: GlobeEventData | null) => void;
  submitAnswer: () => void;
  skipRound: () => void;
  showAnswer: () => void;
};

export function useQuizRound(
  quizFlagPrompts: QuizFlagPrompt<CountryFeature>[]
): UseQuizRoundResult {
  const [current, setCurrent] = useState<QuizPrompt | null>(() =>
    quizFlagPrompts.length > 0 ? pickRandomFlagPrompt(quizFlagPrompts) : null
  );
  const [quizRound, setQuizRound] = useState(0);
  const [selected, setSelected] = useState<QuizSelection>(null);
  const [result, setResult] = useState<QuizResult>(null);

  useEffect(() => {
    if (!current && quizFlagPrompts.length > 0) {
      setCurrent(pickRandomFlagPrompt(quizFlagPrompts));
    }
  }, [current, quizFlagPrompts]);

  const startNextRound = useCallback(() => {
    if (quizFlagPrompts.length === 0) return;

    setCurrent(pickRandomFlagPrompt(quizFlagPrompts));
    setSelected(null);
    setResult(null);
    setQuizRound((round) => round + 1);
  }, [quizFlagPrompts]);

  const selectCountry = useCallback(
    (data: GlobeEventData | null) => {
      if (result !== null) return;
      setSelected(data);
    },
    [result]
  );

  const submitAnswer = useCallback(() => {
    if (!current || !selected || result !== null) return;

    const validIsoAlpha2 = new Set(current.countries.map((country) => country.isoAlpha2));
    setResult(selected.isoAlpha2 && validIsoAlpha2.has(selected.isoAlpha2) ? "correct" : "incorrect");
    setSelected(null);
  }, [current, result, selected]);

  const skipRound = useCallback(() => {
    if (result !== null) return;
    startNextRound();
  }, [result, startNextRound]);

  const showAnswer = useCallback(() => {
    if (!current || result !== null) return;
    setResult("revealed");
    setSelected(null);
  }, [current, result]);

  return {
    current,
    quizRound,
    selected,
    result,
    startNextRound,
    selectCountry,
    submitAnswer,
    skipRound,
    showAnswer
  };
}
