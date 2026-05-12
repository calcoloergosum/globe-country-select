import type { CountryFeature, GlobeEventData } from "../../components/InteractiveGlobe";
import type { QuizFlagPrompt } from "../../utils/pickRandomFlagPrompt";
import type { AppPage } from "../types";

export type { AppPage };

export type QuizResult = "correct" | "incorrect" | "revealed" | null;

export type QuizPrompt = QuizFlagPrompt<CountryFeature>;

export type QuizSelection = GlobeEventData | null;
