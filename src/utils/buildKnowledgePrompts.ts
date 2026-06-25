// Converts source records and ranked indicator values into quiz-ready prompts.
import {
  KNOWLEDGE_QUESTION_DEFINITIONS,
  type KnowledgeQuestionDefinition,
  type LocationQuestionDefinition,
  type RankingQuestionDefinition
} from "../data/knowledgeQuestions";
import type { QuizCountry, QuizKnowledgePrompt } from "./quizPrompts";

export function formatOrdinal(value: number): string {
  const integer = Math.trunc(value);
  const absolute = Math.abs(integer);
  const lastTwoDigits = absolute % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${integer}th`;

  switch (absolute % 10) {
    case 1:
      return `${integer}st`;
    case 2:
      return `${integer}nd`;
    case 3:
      return `${integer}rd`;
    default:
      return `${integer}th`;
  }
}

function normalizeIsoAlpha2(value: string): string {
  return value.trim().toUpperCase();
}

function buildCountryMap<TFeature>(countries: QuizCountry<TFeature>[]) {
  return new Map(countries.map((country) => [normalizeIsoAlpha2(country.isoAlpha2), country]));
}

function resolveCountries<TFeature>(
  isoAlpha2List: string[],
  countryMap: Map<string, QuizCountry<TFeature>>
): QuizCountry<TFeature>[] {
  return isoAlpha2List
    .map((isoAlpha2) => countryMap.get(normalizeIsoAlpha2(isoAlpha2)) ?? null)
    .filter((country): country is QuizCountry<TFeature> => country !== null);
}

function buildPromptId<TFeature>(definitionId: string, countries: QuizCountry<TFeature>[]): string {
  const answerCodes = countries
    .map((country) => normalizeIsoAlpha2(country.isoAlpha2))
    .sort()
    .join("-");
  return `knowledge:${definitionId}:${answerCodes}`;
}

function buildLocationPrompt<TFeature>(
  definition: LocationQuestionDefinition,
  countryMap: Map<string, QuizCountry<TFeature>>
): QuizKnowledgePrompt<TFeature> | null {
  const countries = resolveCountries(definition.answerIsoAlpha2, countryMap);
  if (countries.length !== definition.answerIsoAlpha2.length) return null;

  return {
    id: buildPromptId(definition.id, countries),
    kind: "knowledge",
    question: definition.question,
    countries,
    explanation: definition.explanation,
    source: definition.source,
    metadata: {
      topic: "location",
      coverage: "Curated place-to-country record",
      transformation: "Resolve the record's accepted ISO alpha-2 country codes against the globe dataset."
    }
  };
}

function getRankingTargetValue(definition: RankingQuestionDefinition): number | null {
  if (!Number.isInteger(definition.rank) || definition.rank < 1) return null;

  const sortedValues = definition.values
    .map(({ value }) => value)
    .filter(Number.isFinite)
    .sort((left, right) =>
      definition.direction === "descending" ? right - left : left - right
    );

  return sortedValues[definition.rank - 1] ?? null;
}

function buildRankingPrompt<TFeature>(
  definition: RankingQuestionDefinition,
  countryMap: Map<string, QuizCountry<TFeature>>
): QuizKnowledgePrompt<TFeature> | null {
  const targetValue = getRankingTargetValue(definition);
  if (targetValue === null) return null;

  const answerIsoAlpha2 = definition.values
    .filter(({ value }) => Number.isFinite(value) && value === targetValue)
    .map(({ isoAlpha2 }) => isoAlpha2);
  const countries = resolveCountries(answerIsoAlpha2, countryMap);
  if (countries.length !== answerIsoAlpha2.length || countries.length === 0) return null;

  const ordinal = formatOrdinal(definition.rank);
  const directionLabel = definition.direction === "descending" ? "highest to lowest" : "lowest to highest";
  const sizeLabel = definition.direction === "descending" ? "largest" : "smallest";
  const countryNames = countries.map((country) => country.name).join(" and ");
  const formattedValue = new Intl.NumberFormat("en-US").format(targetValue);
  const rankVerb = countries.length > 1 ? "share" : "ranks";

  return {
    id: buildPromptId(definition.id, countries),
    kind: "knowledge",
    question: `Which country had the ${ordinal} ${sizeLabel} ${definition.questionNoun} in ${definition.year}?`,
    countries,
    explanation: `${countryNames} ${rankVerb} ${ordinal} after sorting ${definition.indicator.label} for ${definition.year} ${directionLabel} (${formattedValue}).`,
    source: definition.source,
    metadata: {
      topic: "ranking",
      year: definition.year,
      indicator: definition.indicator,
      coverage: definition.coverage,
      transformation: `Sort the supplied ${definition.year} ${definition.indicator.code} country values ${directionLabel}, select position ${definition.rank}, and accept every country tied at that value.`
    }
  };
}

export function buildKnowledgePrompts<TFeature>(
  countries: QuizCountry<TFeature>[],
  definitions: readonly KnowledgeQuestionDefinition[] = KNOWLEDGE_QUESTION_DEFINITIONS
): QuizKnowledgePrompt<TFeature>[] {
  const countryMap = buildCountryMap(countries);

  return definitions
    .map((definition) =>
      definition.kind === "location"
        ? buildLocationPrompt(definition, countryMap)
        : buildRankingPrompt(definition, countryMap)
    )
    .filter((prompt): prompt is QuizKnowledgePrompt<TFeature> => prompt !== null);
}
