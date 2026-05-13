// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useQuizKeyboardShortcuts } from "./useQuizKeyboardShortcuts";

function dispatchKeyDown(target: EventTarget, key: string, code?: string) {
  const event = new KeyboardEvent("keydown", { key, code, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe("useQuizKeyboardShortcuts", () => {
  it("routes Enter/Backspace/Space actions while a prompt is active and unresolved", () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    const onShowAnswer = vi.fn();
    const onNextRound = vi.fn();

    renderHook(() =>
      useQuizKeyboardShortcuts({
        hasPrompt: true,
        result: null,
        onSubmit,
        onSkip,
        onShowAnswer,
        onNextRound
      })
    );

    expect(dispatchKeyDown(window, "Enter").defaultPrevented).toBe(true);
    expect(dispatchKeyDown(window, "Backspace").defaultPrevented).toBe(true);
    expect(dispatchKeyDown(window, " ", "Space").defaultPrevented).toBe(true);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onShowAnswer).toHaveBeenCalledTimes(1);
    expect(onNextRound).not.toHaveBeenCalled();
  });

  it("uses next-round shortcut when result is already resolved", () => {
    const onNextRound = vi.fn();

    renderHook(() =>
      useQuizKeyboardShortcuts({
        hasPrompt: true,
        result: "correct",
        onSubmit: vi.fn(),
        onSkip: vi.fn(),
        onShowAnswer: vi.fn(),
        onNextRound
      })
    );

    expect(dispatchKeyDown(window, "Enter").defaultPrevented).toBe(true);
    expect(dispatchKeyDown(window, " ", "Space").defaultPrevented).toBe(true);
    expect(onNextRound).toHaveBeenCalledTimes(2);
  });

  it("ignores editable/control targets and inactive prompts", () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    const onShowAnswer = vi.fn();
    const onNextRound = vi.fn();

    const { rerender } = renderHook(
      ({ hasPrompt }) =>
        useQuizKeyboardShortcuts({
          hasPrompt,
          result: null,
          onSubmit,
          onSkip,
          onShowAnswer,
          onNextRound
        }),
      {
        initialProps: { hasPrompt: true }
      }
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    dispatchKeyDown(input, "Enter");

    const button = document.createElement("button");
    document.body.appendChild(button);
    dispatchKeyDown(button, "Backspace");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
    expect(onShowAnswer).not.toHaveBeenCalled();

    rerender({ hasPrompt: false });
    dispatchKeyDown(window, "Enter");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onNextRound).not.toHaveBeenCalled();
  });
});
