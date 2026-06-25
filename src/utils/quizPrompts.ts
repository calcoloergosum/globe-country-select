// Generic quiz prompt types, filtering, and family-balanced random selection.

export interface QuizCountry<TFeature = unknown> {
  name: string;
  isoAlpha2: string;
  lat: number;
  lng: number;
  feature: TFeature;
}

export interface QuizPromptSource {
  name: string;
  url: string;
  license?: string;
}

export interface QuizPromptIndicator {
  code: string;
  label: string;
}

export interface QuizPromptMetadata {
  topic:
    | "location"
    | "ranking"
    | "feature-country"
    | "capital-country"
    | "border-intersection"
    | "landlocked"
    | "region-membership"
    | "hemisphere"
    | "country-ranking";
  transformation: string;
  year?: number;
  indicator?: QuizPromptIndicator;
  coverage?: string;
  sourceIds?: readonly string[];
  recordIds?: readonly string[];
  templateId?: string;
}

interface QuizPromptBase<TFeature> {
  id: string;
  countries: QuizCountry<TFeature>[];
}

export interface QuizFlagPrompt<TFeature = unknown> extends QuizPromptBase<TFeature> {
  // Optional for backwards compatibility with existing flag-only fixtures.
  kind?: "flag";
  flagCode: string;
}

export interface QuizKnowledgePrompt<TFeature = unknown> extends QuizPromptBase<TFeature> {
  kind: "knowledge";
  question: string;
  explanation: string;
  source: QuizPromptSource;
  metadata: QuizPromptMetadata;
}

export type QuizPrompt<TFeature = unknown> =
  | QuizFlagPrompt<TFeature>
  | QuizKnowledgePrompt<TFeature>;

export type QuizPromptKind = "flag" | "knowledge";
export type QuizQuestionSet = "mixed" | "flags" | "knowledge";

type PromptLike = {
  id: string;
  kind?: QuizPromptKind;
};

type PromptPickerOptions<TPrompt extends PromptLike> = {
  previousPrompt?: TPrompt | null;
  rng?: () => number;
};

const PROMPT_KIND_ORDER: QuizPromptKind[] = ["flag", "knowledge"];

export function getQuizPromptKind(prompt: PromptLike): QuizPromptKind {
  return prompt.kind === "knowledge" ? "knowledge" : "flag";
}

function normalizeRandomValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1 - Number.EPSILON);
}

/**
 * Selects prompt families uniformly before selecting within a family. This keeps
 * a small knowledge-question bank discoverable beside a much larger flag bank.
 */
export function pickRandomQuizPrompt<TPrompt extends PromptLike>(
  prompts: readonly TPrompt[],
  rng: () => number = Math.random
): TPrompt | null {
  if (prompts.length === 0) return null;

  const groups = PROMPT_KIND_ORDER
    .map((kind) => prompts.filter((prompt) => getQuizPromptKind(prompt) === kind))
    .filter((group) => group.length > 0);
  const position = normalizeRandomValue(rng()) * groups.length;
  const groupIndex = Math.min(Math.floor(position), groups.length - 1);
  const group = groups[groupIndex];
  const withinGroup = position - groupIndex;
  const promptIndex = Math.min(Math.floor(withinGroup * group.length), group.length - 1);

  return group[promptIndex];
}

export function pickNextQuizPrompt<TPrompt extends PromptLike>(
  prompts: readonly TPrompt[],
  { previousPrompt = null, rng = Math.random }: PromptPickerOptions<TPrompt> = {}
): TPrompt | null {
  if (prompts.length === 0) return null;

  const candidates =
    prompts.length > 1 && previousPrompt
      ? prompts.filter((prompt) => prompt.id !== previousPrompt.id)
      : prompts;

  return pickRandomQuizPrompt(candidates.length > 0 ? candidates : prompts, rng);
}

export function filterQuizPrompts<TPrompt extends PromptLike>(
  prompts: readonly TPrompt[],
  questionSet: QuizQuestionSet
): TPrompt[] {
  if (questionSet === "mixed") return [...prompts];

  const kind: QuizPromptKind = questionSet === "flags" ? "flag" : "knowledge";
  return prompts.filter((prompt) => getQuizPromptKind(prompt) === kind);
}
