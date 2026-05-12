import type { CountryFeature } from "../../components/InteractiveGlobe";
import type { QuizPrompt, QuizResult } from "./types";

type QuizGlobeState = {
  pinnedIso?: string;
  focusLatLng?: { lat: number; lng: number };
  focusCountry?: CountryFeature;
};

export function deriveQuizGlobeState(current: QuizPrompt | null, result: QuizResult): QuizGlobeState {
  const answerCountry = current?.countries[0];
  const shouldFocusAnswer = result === "incorrect" || result === "revealed";

  return {
    pinnedIso: result !== null ? answerCountry?.isoAlpha2 : undefined,
    focusLatLng:
      shouldFocusAnswer && answerCountry
        ? { lat: answerCountry.lat, lng: answerCountry.lng }
        : undefined,
    focusCountry: shouldFocusAnswer ? answerCountry?.feature : undefined
  };
}
