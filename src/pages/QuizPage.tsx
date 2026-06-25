// Quiz page composition that wires dataset, round logic, shortcuts, globe, and overlay UI.
import { useMemo, useState } from "react";
import { InteractiveGlobe, type GlobeEventData } from "../components/InteractiveGlobe";
import countriesGeoJsonRaw from "../ne_50m_admin_0_countries.geojson?raw";
import globeImageUrl from "../earthmap-4k.jpg";
import bumpImageUrl from "../earth-topology.png";
import { filterQuizPrompts, type QuizQuestionSet } from "../utils/quizPrompts";
import { QuizOverlay } from "./quiz/QuizOverlay";
import type { AppPage } from "./types";
import { deriveQuizGlobeState } from "./quiz/quizGlobeState";
import { useQuizDataset } from "./quiz/useQuizDataset";
import { useQuizKeyboardShortcuts } from "./quiz/useQuizKeyboardShortcuts";
import { useQuizRound } from "./quiz/useQuizRound";
import "./quiz/knowledgeQuiz.css";

type QuizPageProps = {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
};

export function QuizPage({ page, onNavigate }: QuizPageProps) {
  const {
    countries,
    quizFlagPrompts,
    quizKnowledgePrompts = []
  } = useQuizDataset(countriesGeoJsonRaw);
  const [questionSet, setQuestionSet] = useState<QuizQuestionSet>("mixed");
  const quizPrompts = useMemo(
    () => [...quizFlagPrompts, ...quizKnowledgePrompts],
    [quizFlagPrompts, quizKnowledgePrompts]
  );
  const activePrompts = useMemo(
    () => filterQuizPrompts(quizPrompts, questionSet),
    [questionSet, quizPrompts]
  );
  const {
    current,
    quizRound,
    selected,
    highlightedCountry,
    result,
    startNextRound,
    selectCountry,
    submitAnswer,
    skipRound,
    showAnswer
  } = useQuizRound(activePrompts);

  useQuizKeyboardShortcuts({
    hasPrompt: !!current,
    result,
    onSubmit: submitAnswer,
    onSkip: skipRound,
    onShowAnswer: showAnswer,
    onNextRound: startNextRound
  });

  const { pinnedIso, focusLatLng, focusCountry } = deriveQuizGlobeState(highlightedCountry, result);

  const handleGlobeClick = (data: GlobeEventData | null) => {
    selectCountry(data);
  };

  return (
    <main className="globe-page">
      <section className="globe-wrap globe-wrap-full">
        <InteractiveGlobe
          countries={countries}
          globeImageUrl={globeImageUrl}
          bumpImageUrl={bumpImageUrl}
          highlightOnHover={result === null}
          pinnedCountryIsoA2={pinnedIso}
          clearSelectionSignal={quizRound}
          focusLatLng={focusLatLng}
          focusCountry={focusCountry}
          enableProximityPicking={false}
          onPointClick={result === null ? handleGlobeClick : undefined}
        />
        <QuizOverlay
          page={page}
          onNavigate={onNavigate}
          questionSet={questionSet}
          onQuestionSetChange={setQuestionSet}
          currentPrompt={current}
          promptCount={activePrompts.length}
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
