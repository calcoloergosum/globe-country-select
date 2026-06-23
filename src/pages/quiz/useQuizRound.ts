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

type ReconciledRoundState = {
  selected: QuizSelection;
  highlightedCountry: QuizHighlightedCountry;
  result: QuizResult;
  // The globe holds its own selection; clearing it requires bumping a signal.
  clearGlobeSelection: boolean;
};

// When the dataset is replaced by an equivalent prompt with the same id (e.g.
// a re-parse produces fresh objects), the round should survive but any selected
// or highlighted country that no longer exists in the new prompt must be dropped.
// Pure so the reconciliation rules can be read and tested in isolation.
function reconcileSameIdPrompt(
  updatedPrompt: QuizPrompt,
  selected: QuizSelection,
  highlightedCountry: QuizHighlightedCountry,
  result: QuizResult
): ReconciledRoundState {
  const next: ReconciledRoundState = {
    selected,
    highlightedCountry,
    result,
    clearGlobeSelection: false
  };

  if (selected && !findPromptCountry(updatedPrompt, selected.isoAlpha2)) {
    next.selected = null;
    next.clearGlobeSelection = true;
  }

  if (highlightedCountry) {
    const updatedHighlightedCountry = findPromptCountry(updatedPrompt, highlightedCountry.isoAlpha2);
    if (updatedHighlightedCountry) {
      next.highlightedCountry = updatedHighlightedCountry;
    } else {
      next.highlightedCountry = null;
      if (result !== null) {
        next.result = null;
        next.clearGlobeSelection = true;
      }
    }
  }

  return next;
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

  // Reconciles the active round when the prompt dataset changes (e.g. a re-parse
  // hands back equivalent prompts as fresh objects). Deliberately depends only on
  // `quizFlagPrompts`: it reads the other state values but must not re-run when
  // they change, or selecting/submitting mid-round would re-trigger
  // reconciliation. The reads are intentional, so exhaustive-deps is not applied.
  //
  // React bails out of identical state updates, so the unconditional setters
  // below only re-render when reconciliation actually changes a value.
  useEffect(() => {
    const hadActiveRoundState =
      selected !== null || highlightedCountry !== null || result !== null;

    // Dataset emptied: tear the round down.
    if (quizFlagPrompts.length === 0) {
      if (current || hadActiveRoundState) {
        setCurrent(null);
        setSelected(null);
        setHighlightedCountry(null);
        setResult(null);
        if (hadActiveRoundState) {
          setQuizRound((round) => round + 1);
        }
      }
      return;
    }

    // No active prompt yet: start one.
    if (!current) {
      setCurrent(pickNextFlagPrompt(quizFlagPrompts));
      return;
    }

    // Current prompt is gone from the new dataset: advance to a fresh round.
    const updatedCurrent = quizFlagPrompts.find((prompt) => prompt.id === current.id) ?? null;
    if (!updatedCurrent) {
      setCurrent(pickNextFlagPrompt(quizFlagPrompts, { previousPrompt: current }));
      setSelected(null);
      setHighlightedCountry(null);
      setResult(null);
      if (hadActiveRoundState) {
        setQuizRound((round) => round + 1);
      }
      return;
    }

    // Same prompt survived (possibly as a new object): keep the round, drop any
    // selection/highlight that no longer exists in the refreshed prompt.
    const reconciled = reconcileSameIdPrompt(updatedCurrent, selected, highlightedCountry, result);
    setCurrent(updatedCurrent);
    setSelected(reconciled.selected);
    setHighlightedCountry(reconciled.highlightedCountry);
    setResult(reconciled.result);
    if (reconciled.clearGlobeSelection) {
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
