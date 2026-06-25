// Shared quiz domain types for prompts, selections, and result states.
import type { CountryFeature, GlobeEventData } from "../../components/InteractiveGlobe";
import type { QuizPrompt as GenericQuizPrompt } from "../../utils/quizPrompts";
import type { AppPage } from "../types";

export type { AppPage };
export type { QuizQuestionSet } from "../../utils/quizPrompts";

export type QuizResult = "correct" | "incorrect" | "revealed" | null;

export type QuizPrompt = GenericQuizPrompt<CountryFeature>;

export type QuizSelection = GlobeEventData | null;

export type QuizHighlightedCountry = QuizPrompt["countries"][number] | null;
