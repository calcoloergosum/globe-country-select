// Adapts normalized geographic entities and relationships into quiz-ready prompts.
import {
  formatOrdinal,
  generateGeographicKnowledgeQuestions,
  type GeographicQuestionContext,
  type QuestionGenerationResult
} from "../data/geography";
import type { QuizCountry, QuizKnowledgePrompt } from "./quizPrompts";

export { formatOrdinal };

export interface BuildKnowledgePromptOptions {
  seed?: string | number;
}

export function buildKnowledgePromptGenerationResult<TFeature>(
  countries: readonly QuizCountry<TFeature>[],
  options: BuildKnowledgePromptOptions = {}
): QuestionGenerationResult<TFeature> {
  const context: GeographicQuestionContext<TFeature> = {
    countries,
    seed: options.seed
  };
  return generateGeographicKnowledgeQuestions(context);
}

export function buildKnowledgePrompts<TFeature>(
  countries: readonly QuizCountry<TFeature>[],
  options: BuildKnowledgePromptOptions = {}
): QuizKnowledgePrompt<TFeature>[] {
  return buildKnowledgePromptGenerationResult(countries, options).prompts;
}
