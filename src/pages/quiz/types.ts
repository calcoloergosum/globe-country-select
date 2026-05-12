import type { CountryFeature, GlobeEventData } from "../../components/InteractiveGlobe";
import type { QuizFlagPrompt } from "../../utils/pickRandomFlagPrompt";

export type AppPage = "main" | "quiz";

export type QuizResult = "correct" | "incorrect" | "revealed" | null;

export type QuizPrompt = QuizFlagPrompt<CountryFeature>;

export type QuizSelection = GlobeEventData | null;
