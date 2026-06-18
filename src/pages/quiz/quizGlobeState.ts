// Derives quiz-specific globe focus and pinning state from current prompt result.
import type { CountryFeature } from "../../components/InteractiveGlobe";
import type { QuizHighlightedCountry, QuizResult } from "./types";

type QuizGlobeState = {
  pinnedIso?: string;
  focusLatLng?: { lat: number; lng: number };
  focusCountry?: CountryFeature;
};

export function deriveQuizGlobeState(
  highlightedCountry: QuizHighlightedCountry,
  result: QuizResult
): QuizGlobeState {
  const shouldShowHighlight = result !== null && !!highlightedCountry;

  return {
    pinnedIso: shouldShowHighlight ? highlightedCountry.isoAlpha2 : undefined,
    focusLatLng:
      shouldShowHighlight
        ? { lat: highlightedCountry.lat, lng: highlightedCountry.lng }
        : undefined,
    focusCountry: shouldShowHighlight ? highlightedCountry.feature : undefined
  };
}
