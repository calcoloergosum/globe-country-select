// Quiz overlay UI with question-set navigation, prompt actions, sources, and results.
import { CountryFlag } from "../../components/CountryFlag";
import type { GlobeEventData } from "../../components/InteractiveGlobe";
import type { QuizCountry } from "../../utils/quizPrompts";
import type { AppPage, QuizPrompt, QuizQuestionSet, QuizResult } from "./types";

type QuizOverlayProps = {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  questionSet?: QuizQuestionSet;
  onQuestionSetChange?: (questionSet: QuizQuestionSet) => void;
  currentPrompt: QuizPrompt | null;
  promptCount: number;
  selected: GlobeEventData | null;
  result: QuizResult;
  onSubmit: () => void;
  onSkip: () => void;
  onShowAnswer: () => void;
  onNextRound: () => void;
};

const QUESTION_SET_OPTIONS: { value: QuizQuestionSet; label: string }[] = [
  { value: "mixed", label: "Mixed" },
  { value: "flags", label: "Flags" },
  { value: "knowledge", label: "World facts" }
];

function formatCountryNames<TFeature>(countries: QuizCountry<TFeature>[]): string {
  return countries.map((country) => country.name).join(", ");
}

function getAnswerLabel(prompt: QuizPrompt): string {
  if (prompt.kind !== "knowledge") return "Valid countries for this flag";
  return prompt.countries.length === 1 ? "Answer" : "Accepted answers";
}

function PromptContent({ prompt }: { prompt: QuizPrompt }) {
  if (prompt.kind !== "knowledge") {
    return <CountryFlag code={prompt.flagCode} className="quiz-flag" ariaLabel="Flag to identify" />;
  }

  const categoryLabelByTopic: Record<typeof prompt.metadata.topic, string> = {
    location: "Place",
    ranking: "Data ranking",
    "feature-country": "Physical geography",
    "capital-country": "Capital",
    "border-intersection": "Borders",
    landlocked: "Spatial fact",
    "region-membership": "Region",
    hemisphere: "Coordinates",
    "country-ranking": "Data ranking"
  };
  const categoryLabel = categoryLabelByTopic[prompt.metadata.topic];

  return (
    <div className="quiz-question-card">
      <span className="quiz-question-kicker">{categoryLabel}</span>
      <p className="quiz-question">{prompt.question}</p>
      {prompt.metadata.year !== undefined && (
        <span className="quiz-question-year">Data year: {prompt.metadata.year}</span>
      )}
    </div>
  );
}

function KnowledgeSource({ prompt }: { prompt: QuizPrompt }) {
  if (prompt.kind !== "knowledge") return null;

  return (
    <div className="quiz-source-note">
      <p>{prompt.explanation}</p>
      <p>
        <a href={prompt.source.url} target="_blank" rel="noreferrer">
          Source: {prompt.source.name}
        </a>
        {prompt.source.license ? ` · ${prompt.source.license}` : ""}
      </p>
      <details>
        <summary>How this question was built</summary>
        <p>{prompt.metadata.transformation}</p>
        {prompt.metadata.coverage && <p>{prompt.metadata.coverage}</p>}
      </details>
    </div>
  );
}

export function QuizOverlay({
  page,
  onNavigate,
  questionSet = "mixed",
  onQuestionSetChange = () => undefined,
  currentPrompt,
  promptCount,
  selected,
  result,
  onSubmit,
  onSkip,
  onShowAnswer,
  onNextRound
}: QuizOverlayProps) {
  const answerLabel = currentPrompt ? getAnswerLabel(currentPrompt) : "Answer";
  const answerNames = currentPrompt ? formatCountryNames(currentPrompt.countries) : "";

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
        <div className="quiz-question-set" role="group" aria-label="Question set">
          {QUESTION_SET_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`quiz-question-set-btn${questionSet === option.value ? " active" : ""}`}
              aria-pressed={questionSet === option.value}
              onClick={() => onQuestionSetChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {!currentPrompt && promptCount === 0 ? (
          <p className="quiz-description">No quiz countries are currently available.</p>
        ) : !currentPrompt ? (
          <p className="quiz-description">Preparing quiz...</p>
        ) : (
          <>
            <PromptContent prompt={currentPrompt} />

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
                  Correct! {answerLabel}: <strong>{answerNames}</strong>.
                </span>
                <button className="quiz-btn" onClick={onNextRound}>
                  Next
                </button>
              </div>
            )}

            {result === "incorrect" && (
              <div className="quiz-result incorrect">
                <span>
                  Incorrect! {answerLabel}: <strong>{answerNames}</strong>. One is highlighted on the globe.
                </span>
                <button className="quiz-btn" onClick={onNextRound}>
                  Next
                </button>
              </div>
            )}

            {result === "revealed" && (
              <div className="quiz-result revealed">
                <span>
                  {answerLabel}: <strong>{answerNames}</strong>. One is highlighted on the globe.
                </span>
                <button className="quiz-btn" onClick={onNextRound}>
                  Next
                </button>
              </div>
            )}

            {result !== null && currentPrompt && <KnowledgeSource prompt={currentPrompt} />}
          </>
        )}
      </div>
    </aside>
  );
}
