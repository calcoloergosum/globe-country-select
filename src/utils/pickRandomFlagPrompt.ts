// Flag-prompt construction plus backwards-compatible flag-only random selection.

import flagGroups from "./flag-groups.json";
import {
  pickNextQuizPrompt,
  pickRandomQuizPrompt,
  type QuizCountry,
  type QuizFlagPrompt
} from "./quizPrompts";

export type { QuizCountry, QuizFlagPrompt } from "./quizPrompts";

type PromptPickerOptions<TFeature> = {
  previousPrompt?: QuizFlagPrompt<TFeature> | null;
  rng?: () => number;
};

/**
 * Maps each ISO alpha-2 code to the shasum of its SVG asset.
 * Codes that share a shasum render the same flag image.
 */
const isoToShasum = new Map<string, string>(
  flagGroups.flatMap(({ shasum, isoAlpha2List }) =>
    isoAlpha2List.map((iso) => [iso, shasum] as [string, string])
  )
);

function buildPromptId<TFeature>(flagCode: string, countries: QuizCountry<TFeature>[]) {
  const normalizedFlagCode = flagCode.trim().toUpperCase();
  const groupedIsoCodes = countries
    .map((country) => country.isoAlpha2.trim().toUpperCase())
    .sort();
  const canonicalFlagCode = groupedIsoCodes.includes(normalizedFlagCode)
    ? groupedIsoCodes[0]
    : normalizedFlagCode;
  return `${canonicalFlagCode}:${groupedIsoCodes.join("-")}`;
}

/**
 * Groups a list of QuizCountry entries by their canonical flag (SVG shasum),
 * so countries that display the same flag image appear in the same prompt.
 *
 * Countries whose ISO code has no shasum entry are grouped individually.
 */
export function buildFlagPrompts<TFeature>(countries: QuizCountry<TFeature>[]): QuizFlagPrompt<TFeature>[] {
  const byShasum = new Map<string, { flagCode: string; countries: QuizCountry<TFeature>[] }>();

  for (const country of countries) {
    // Use shasum as the grouping key; fall back to the ISO code itself.
    const key = isoToShasum.get(country.isoAlpha2) ?? country.isoAlpha2;

    const existing = byShasum.get(key);
    if (existing) {
      existing.countries.push(country);
    } else {
      byShasum.set(key, { flagCode: country.isoAlpha2, countries: [country] });
    }
  }

  return Array.from(byShasum.values()).map((prompt) => ({
    id: buildPromptId(prompt.flagCode, prompt.countries),
    kind: "flag",
    ...prompt
  }));
}

export function pickRandomFlagPrompt<TFeature>(
  prompts: QuizFlagPrompt<TFeature>[],
  rng: () => number = Math.random
): QuizFlagPrompt<TFeature> | null {
  return pickRandomQuizPrompt(prompts, rng);
}

export function pickNextFlagPrompt<TFeature>(
  prompts: QuizFlagPrompt<TFeature>[],
  { previousPrompt = null, rng = Math.random }: PromptPickerOptions<TFeature> = {}
): QuizFlagPrompt<TFeature> | null {
  return pickNextQuizPrompt(prompts, { previousPrompt, rng });
}
