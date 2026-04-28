import { useEffect, useMemo, useState } from "react";
import { hasFlag } from "country-flag-icons";
import { InteractiveGlobe, type CountryFeature, type GlobeEventData } from "../components/InteractiveGlobe";
import { CountryFlag } from "../components/CountryFlag";
import countriesGeoJsonRaw from "../ne_50m_admin_0_countries.geojson?raw";
import globeImageUrl from "../8081_earthmap10k.jpg";

type Page = "main" | "quiz";

type QuizPageProps = {
  page: Page;
  onNavigate: (page: Page) => void;
};

interface QuizCountry {
  name: string;
  isoAlpha2: string;
  lat: number;
  lng: number;
  feature: CountryFeature;
}

function getFeatureIso2(feature: CountryFeature): string | undefined {
  const candidates = [
    feature.properties.ISO_A2,
    feature.properties.ISO_A2_EH,
    feature.properties.WB_A2,
  ];
  return candidates
    .map((v) => v?.trim().toUpperCase() ?? "")
    .find((v) => /^[A-Z]{2}$/.test(v));
}

function getCountryName(feature: CountryFeature): string {
  return feature.properties.ADMIN ?? feature.properties.NAME ?? "Unknown";
}

function getCountryLatLng(feature: CountryFeature): { lat: number; lng: number } {
  const lat =
    feature.properties.LABEL_Y ??
    (feature.bbox ? (feature.bbox[1] + feature.bbox[3]) / 2 : 0);
  const lng =
    feature.properties.LABEL_X ??
    (feature.bbox ? (feature.bbox[0] + feature.bbox[2]) / 2 : 0);
  return { lat, lng };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function QuizPage({ page, onNavigate }: QuizPageProps) {
  const countries = useMemo(() => {
    const parsed = JSON.parse(countriesGeoJsonRaw) as { features?: CountryFeature[] };
    return parsed.features ?? [];
  }, []);

  const quizCountries = useMemo<QuizCountry[]>(() => {
    return countries
      .map((f) => {
        const isoAlpha2 = getFeatureIso2(f);
        const { lat, lng } = getCountryLatLng(f);
        return { feature: f, isoAlpha2, name: getCountryName(f), lat, lng };
      })
      .filter((c): c is QuizCountry => !!c.isoAlpha2 && hasFlag(c.isoAlpha2));
  }, [countries]);

  const [current, setCurrent] = useState<QuizCountry | null>(() =>
    quizCountries.length > 0 ? pickRandom(quizCountries) : null
  );
  const [quizRound, setQuizRound] = useState(0);
  const [selected, setSelected] = useState<GlobeEventData | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | "revealed" | null>(null);

  useEffect(() => {
    // Enter quiz mode directly with a question instead of showing a start splash.
    if (!current && quizCountries.length > 0) {
      setCurrent(pickRandom(quizCountries));
    }
  }, [current, quizCountries]);

  const startQuiz = () => {
    if (quizCountries.length === 0) return;
    setCurrent(pickRandom(quizCountries));
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
    setResult(selected.isoAlpha2 === current.isoAlpha2 ? "correct" : "incorrect");
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

  const pinnedIso = result !== null ? current?.isoAlpha2 : undefined;
  const shouldFocusAnswer = result === "incorrect" || result === "revealed";
  const focusLatLng = shouldFocusAnswer && current ? { lat: current.lat, lng: current.lng } : undefined;
  const focusCountry = shouldFocusAnswer ? current?.feature : undefined;

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

        <aside className="overlay-modal" role="region" aria-label="Quiz controls">
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
            {!current && quizCountries.length === 0 ? (
              <p className="quiz-description">No quiz countries are currently available.</p>
            ) : !current ? (
              <p className="quiz-description">Preparing quiz...</p>
            ) : (
              <>
                <CountryFlag code={current.isoAlpha2} className="quiz-flag" />

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
                      Correct! That&apos;s <strong>{current.name}</strong>.
                    </span>
                    <button className="quiz-btn" onClick={startQuiz}>
                      Next
                    </button>
                  </div>
                )}

                {result === "incorrect" && (
                  <div className="quiz-result incorrect">
                    <span>
                      Incorrect! The answer was <strong>{current.name}</strong>, highlighted on the globe.
                    </span>
                    <button className="quiz-btn" onClick={startQuiz}>
                      Next
                    </button>
                  </div>
                )}

                {result === "revealed" && (
                  <div className="quiz-result revealed">
                    <span>
                      The answer is <strong>{current.name}</strong>, highlighted on the globe.
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
