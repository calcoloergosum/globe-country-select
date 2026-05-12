import { InteractiveGlobe, type GlobeEventData } from "../components/InteractiveGlobe";
import countriesGeoJsonRaw from "../ne_50m_admin_0_countries.geojson?raw";
import globeImageUrl from "../8081_earthmap10k.jpg";
import { QuizOverlay } from "./quiz/QuizOverlay";
import type { AppPage } from "./types";
import { deriveQuizGlobeState } from "./quiz/quizGlobeState";
import { useQuizDataset } from "./quiz/useQuizDataset";
import { useQuizKeyboardShortcuts } from "./quiz/useQuizKeyboardShortcuts";
import { useQuizRound } from "./quiz/useQuizRound";

type QuizPageProps = {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
};

export function QuizPage({ page, onNavigate }: QuizPageProps) {
  const { countries, quizFlagPrompts } = useQuizDataset(countriesGeoJsonRaw);
  const {
    current,
    quizRound,
    selected,
    result,
    startNextRound,
    selectCountry,
    submitAnswer,
    skipRound,
    showAnswer
  } = useQuizRound(quizFlagPrompts);

  useQuizKeyboardShortcuts({
    hasPrompt: !!current,
    result,
    onSubmit: submitAnswer,
    onSkip: skipRound,
    onShowAnswer: showAnswer,
    onNextRound: startNextRound
  });

  const { pinnedIso, focusLatLng, focusCountry } = deriveQuizGlobeState(current, result);

  const handleGlobeClick = (data: GlobeEventData | null) => {
    selectCountry(data);
  };

  return (
    <main className="globe-page">
      <section className="globe-wrap globe-wrap-full">
        <InteractiveGlobe
          countries={countries}
          globeImageUrl={globeImageUrl}
          highlightOnHover={result === null}
          pinnedCountryIsoA2={pinnedIso}
          clearSelectionSignal={quizRound}
          focusLatLng={focusLatLng}
          focusCountry={focusCountry}
          onPointClick={result === null ? handleGlobeClick : undefined}
        />
        <QuizOverlay
          page={page}
          onNavigate={onNavigate}
          currentPrompt={current}
          promptCount={quizFlagPrompts.length}
          selected={selected}
          result={result}
          onSubmit={submitAnswer}
          onSkip={skipRound}
          onShowAnswer={showAnswer}
          onNextRound={startNextRound}
        />
      </section>
    </main>
  );
}
