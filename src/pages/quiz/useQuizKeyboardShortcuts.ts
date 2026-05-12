import { useEffect } from "react";
import type { QuizResult } from "./types";

type UseQuizKeyboardShortcutsArgs = {
  hasPrompt: boolean;
  result: QuizResult;
  onSubmit: () => void;
  onSkip: () => void;
  onShowAnswer: () => void;
  onNextRound: () => void;
};

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (
    target instanceof HTMLButtonElement ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }

  return target.isContentEditable;
}

function isSpaceKey(event: KeyboardEvent) {
  return event.key === " " || event.code === "Space";
}

export function useQuizKeyboardShortcuts({
  hasPrompt,
  result,
  onSubmit,
  onSkip,
  onShowAnswer,
  onNextRound
}: UseQuizKeyboardShortcutsArgs) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isIgnoredTarget(event.target)) return;
      if (!hasPrompt) return;

      if (result !== null) {
        if (event.key === "Enter" || isSpaceKey(event)) {
          event.preventDefault();
          onNextRound();
        }

        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        onSkip();
      } else if (isSpaceKey(event)) {
        event.preventDefault();
        onShowAnswer();
      } else if (event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPrompt, result, onSubmit, onSkip, onShowAnswer, onNextRound]);
}
