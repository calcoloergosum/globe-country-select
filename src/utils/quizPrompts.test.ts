import { describe, expect, it } from "vitest";

import {
  filterQuizPrompts,
  getQuizPromptKind,
  pickNextQuizPrompt,
  pickRandomQuizPrompt,
  type QuizKnowledgePrompt,
  type QuizPrompt
} from "./quizPrompts";

const country = {
  feature: {},
  isoAlpha2: "AA",
  lat: 0,
  lng: 0,
  name: "Country AA"
};

function makeFlag(id: string): QuizPrompt {
  return { id, flagCode: id, countries: [country] };
}

function makeKnowledge(id: string): QuizKnowledgePrompt {
  return {
    id,
    kind: "knowledge",
    question: id,
    countries: [country],
    explanation: id,
    source: { name: "Source", url: "https://example.com" },
    metadata: { topic: "location", transformation: "Lookup" }
  };
}

describe("quiz prompt selection", () => {
  const prompts = [makeFlag("flag-a"), makeFlag("flag-b"), makeKnowledge("fact-a"), makeKnowledge("fact-b")];

  it("treats legacy prompts without a kind as flag prompts", () => {
    expect(getQuizPromptKind(prompts[0])).toBe("flag");
    expect(getQuizPromptKind(prompts[2])).toBe("knowledge");
  });

  it.each([
    { random: 0, expected: "flag-a" },
    { random: 0.49, expected: "flag-b" },
    { random: 0.5, expected: "fact-a" },
    { random: 0.999, expected: "fact-b" }
  ])("balances families before choosing $expected", ({ random, expected }: { random: number; expected: string }) => {
    expect(pickRandomQuizPrompt(prompts, () => random)?.id).toBe(expected);
  });

  it("normalizes invalid and out-of-range random values", () => {
    expect(pickRandomQuizPrompt(prompts, () => Number.NaN)?.id).toBe("flag-a");
    expect(pickRandomQuizPrompt(prompts, () => -1)?.id).toBe("flag-a");
    expect(pickRandomQuizPrompt(prompts, () => 2)?.id).toBe("fact-b");
  });

  it("avoids an immediate repeat and falls back when every id matches", () => {
    expect(pickNextQuizPrompt(prompts, { previousPrompt: prompts[0], rng: () => 0 })?.id).toBe("flag-b");

    const duplicateIds = [makeFlag("same"), makeFlag("same")];
    expect(pickNextQuizPrompt(duplicateIds, { previousPrompt: duplicateIds[0], rng: () => 0 })).toBe(duplicateIds[0]);
  });

  it("filters question sets and handles empty input", () => {
    expect(filterQuizPrompts(prompts, "mixed")).toEqual(prompts);
    expect(filterQuizPrompts(prompts, "flags").map((prompt) => prompt.id)).toEqual(["flag-a", "flag-b"]);
    expect(filterQuizPrompts(prompts, "knowledge").map((prompt) => prompt.id)).toEqual(["fact-a", "fact-b"]);
    expect(pickRandomQuizPrompt([])).toBeNull();
    expect(pickNextQuizPrompt([])).toBeNull();
  });
});
