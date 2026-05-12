import { CountryFlag } from "../../components/CountryFlag";
import type { GlobeEventData } from "../../components/InteractiveGlobe";
import type { QuizCountry } from "../../utils/pickRandomFlagPrompt";
import type { AppPage, QuizPrompt, QuizResult } from "./types";

type QuizOverlayProps = {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  currentPrompt: QuizPrompt | null;
  promptCount: number;
  selected: GlobeEventData | null;
  result: QuizResult;
  onSubmit: () => void;
  onSkip: () => void;
  onShowAnswer: () => void;
  onNextRound: () => void;
};

function formatCountryNames(countries: QuizCountry[]): string {
  return countries.map((country) => country.name).join(", ");
}

export function QuizOverlay({
  page,
  onNavigate,
  currentPrompt,
  promptCount,
  selected,
  result,
  onSubmit,
  onSkip,
  onShowAnswer,
  onNextRound
}: QuizOverlayProps) {
  return (
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
        {!currentPrompt && promptCount === 0 ? (
          <p className="quiz-description">No quiz countries are currently available.</p>
        ) : !currentPrompt ? (
          <p className="quiz-description">Preparing quiz...</p>
        ) : (
          <>
            <CountryFlag code={currentPrompt.flagCode} className="quiz-flag" />

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
                  <button className="quiz-btn primary" onClick={onSubmit} disabled={!selected}>
                    Submit
                  </button>
                  <button className="quiz-btn" onClick={onSkip}>
                    Skip
                  </button>
                  <button className="quiz-btn" onClick={onShowAnswer}>
                    Show Answer
                  </button>
                </div>
              </>
            )}

            {result === "correct" && (
              <div className="quiz-result correct">
                <span>
                  Correct! Valid countries for this flag: <strong>{formatCountryNames(currentPrompt.countries)}</strong>.
                </span>
                <button className="quiz-btn" onClick={onNextRound}>
                  Next
                </button>
              </div>
            )}

            {result === "incorrect" && (
              <div className="quiz-result incorrect">
                <span>
                  Incorrect! Valid countries for this flag: <strong>{formatCountryNames(currentPrompt.countries)}</strong>. One is highlighted on the globe.
                </span>
                <button className="quiz-btn" onClick={onNextRound}>
                  Next
                </button>
              </div>
            )}

            {result === "revealed" && (
              <div className="quiz-result revealed">
                <span>
                  Valid countries for this flag: <strong>{formatCountryNames(currentPrompt.countries)}</strong>. One is highlighted on the globe.
                </span>
                <button className="quiz-btn" onClick={onNextRound}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
