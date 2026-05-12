// Flag-prompt construction and random prompt selection.

import flagGroups from "./flag-groups.json";

export interface QuizCountry<TFeature = unknown> {
  name: string;
  isoAlpha2: string;
  lat: number;
  lng: number;
  feature: TFeature;
}

export interface QuizFlagPrompt<TFeature = unknown> {
  flagCode: string;
  countries: QuizCountry<TFeature>[];
}

/**
 * Maps each ISO alpha-2 code to the shasum of its SVG asset.
 * Codes that share a shasum render the same flag image.
 */
const isoToShasum = new Map<string, string>(
  flagGroups.flatMap(({ shasum, isoAlpha2List }) =>
    isoAlpha2List.map((iso) => [iso, shasum] as [string, string])
  )
);

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

  return Array.from(byShasum.values());
}

export function pickRandomFlagPrompt<TFeature>(prompts: QuizFlagPrompt<TFeature>[]): QuizFlagPrompt<TFeature> {
  return prompts[Math.floor(Math.random() * prompts.length)];
}
