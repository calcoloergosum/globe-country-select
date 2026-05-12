// Quiz flow state machine, keyboard shortcuts, answer validation, result UI.
import { useEffect, useMemo, useState } from "react";
import { hasFlag } from "country-flag-icons";
import { InteractiveGlobe, type CountryFeature, type GlobeEventData } from "../components/InteractiveGlobe";
import { CountryFlag } from "../components/CountryFlag";
import countriesGeoJsonRaw from "../ne_50m_admin_0_countries.geojson?raw";
import globeImageUrl from "../8081_earthmap10k.jpg";
import { buildFlagPrompts, pickRandomFlagPrompt, type QuizCountry, type QuizFlagPrompt } from "../utils/pickRandomFlagPrompt";
import {
  getCountryLatLng,
  getCountryName,
  getFeatureIso2,
  parseCountriesGeoJsonRaw
} from "../utils/countryData";

type Page = "main" | "quiz";

type QuizPageProps = {
  page: Page;
  onNavigate: (page: Page) => void;
};

function formatCountryNames(countries: QuizCountry<CountryFeature>[]): string {
  return countries.map((country) => country.name).join(", ");
}

export function QuizPage({ page, onNavigate }: QuizPageProps) {
  const countries = useMemo(() => parseCountriesGeoJsonRaw(countriesGeoJsonRaw), []);

  const quizCountries = useMemo<QuizCountry<CountryFeature>[]>(() => {
    return countries
      .map((f) => {
        const isoAlpha2 = getFeatureIso2(f);
        const { lat, lng } = getCountryLatLng(f);
        return { feature: f, isoAlpha2, name: getCountryName(f), lat, lng };
      })
      .filter((c): c is QuizCountry<CountryFeature> => !!c.isoAlpha2 && hasFlag(c.isoAlpha2));
  }, [countries]);

  const quizFlagPrompts = useMemo<QuizFlagPrompt<CountryFeature>[]>(
    () => buildFlagPrompts(quizCountries),
    [quizCountries]
  );

  const [current, setCurrent] = useState<QuizFlagPrompt<CountryFeature> | null>(() =>
    quizFlagPrompts.length > 0 ? pickRandomFlagPrompt(quizFlagPrompts) : null
  );
  const [quizRound, setQuizRound] = useState(0);
  const [selected, setSelected] = useState<GlobeEventData | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | "revealed" | null>(null);

  useEffect(() => {
    // Enter quiz mode directly with a question instead of showing a start splash.
    if (!current && quizFlagPrompts.length > 0) {
      setCurrent(pickRandomFlagPrompt(quizFlagPrompts));
    }
  }, [current, quizFlagPrompts]);

  const startQuiz = () => {
    if (quizFlagPrompts.length === 0) return;
    setCurrent(pickRandomFlagPrompt(quizFlagPrompts));
    setSelected(null);
    setResult(null);
    setQuizRound((round) => round + 1);
  };

  const handleGlobeClick = (data: GlobeEventData | null) => {
    if (result !== null) return;
    setSelected(data);
  };

  const handleSubmit = () => {
    if (!current || !selected || result !== null) return;
    const validIsoAlpha2 = new Set(current.countries.map((country) => country.isoAlpha2));
    setResult(selected.isoAlpha2 && validIsoAlpha2.has(selected.isoAlpha2) ? "correct" : "incorrect");
    setSelected(null);
  };

  const handleSkip = () => {
    if (result !== null) return;
    startQuiz();
  };

  const handleShowAnswer = () => {
    if (!current || result !== null) return;
    setResult("revealed");
    setSelected(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is on an input/button to avoid conflicts
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;

      if (!current) return;

      if (result !== null) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startQuiz();
        }
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === " ") {
        e.preventDefault();
        handleShowAnswer();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, result, selected]);

  const answerCountry = current?.countries[0];
  const pinnedIso = result !== null ? answerCountry?.isoAlpha2 : undefined;
  const shouldFocusAnswer = result === "incorrect" || result === "revealed";
  const focusLatLng =
    shouldFocusAnswer && answerCountry
      ? { lat: answerCountry.lat, lng: answerCountry.lng }
      : undefined;
  const focusCountry = shouldFocusAnswer ? answerCountry?.feature : undefined;

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

        <aside className="overlay-modal quiz-modal" role="region" aria-label="Quiz controls">
          <nav className="overlay-nav" aria-label="Mode selector">
            <button
              className={`nav-btn${page === "main" ? " active" : ""}`}
              aria-current={page === "main" ? "page" : undefined}
              onClick={() => onNavigate("main")}
            >
              Explore
            </button>
            <button
              className={`nav-btn${page === "quiz" ? " active" : ""}`}
              aria-current={page === "quiz" ? "page" : undefined}
              onClick={() => onNavigate("quiz")}
            >
              Quiz
            </button>
          </nav>

          <div className="overlay-body quiz-overlay-body">
            {!current && quizFlagPrompts.length === 0 ? (
              <p className="quiz-description">No quiz countries are currently available.</p>
            ) : !current ? (
              <p className="quiz-description">Preparing quiz...</p>
            ) : (
              <>
                <CountryFlag code={current.flagCode} className="quiz-flag" />

                {result === null && (
                  <>
                    <p className="quiz-prompt">
                      {selected ? (
                        <>
                          Selected: <strong>{selected.label}</strong>
                        </>
                      ) : (
                        "Click a country on the globe"
                      )}
                    </p>
                    <div className="quiz-actions">
                      <button
                        className="quiz-btn primary"
                        onClick={handleSubmit}
                        disabled={!selected}
                      >
                        Submit
                      </button>
                      <button className="quiz-btn" onClick={handleSkip}>
                        Skip
                      </button>
                      <button className="quiz-btn" onClick={handleShowAnswer}>
                        Show Answer
                      </button>
                    </div>
                  </>
                )}

                {result === "correct" && (
                  <div className="quiz-result correct">
                    <span>
                      Correct! Valid countries for this flag: <strong>{formatCountryNames(current.countries)}</strong>.
                    </span>
                    <button className="quiz-btn" onClick={startQuiz}>
                      Next
                    </button>
                  </div>
                )}

                {result === "incorrect" && (
                  <div className="quiz-result incorrect">
                    <span>
                      Incorrect! Valid countries for this flag: <strong>{formatCountryNames(current.countries)}</strong>. One is highlighted on the globe.
                    </span>
                    <button className="quiz-btn" onClick={startQuiz}>
                      Next
                    </button>
                  </div>
                )}

                {result === "revealed" && (
                  <div className="quiz-result revealed">
                    <span>
                      Valid countries for this flag: <strong>{formatCountryNames(current.countries)}</strong>. One is highlighted on the globe.
                    </span>
                    <button className="quiz-btn" onClick={startQuiz}>
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
