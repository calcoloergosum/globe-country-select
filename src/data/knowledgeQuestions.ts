// Source-grounded seed data for non-flag country questions.
import type { QuizPromptIndicator, QuizPromptSource } from "../utils/quizPrompts";

export interface LocationQuestionDefinition {
  kind: "location";
  id: string;
  question: string;
  answerIsoAlpha2: string[];
  explanation: string;
  source: QuizPromptSource;
}

export interface RankingValue {
  isoAlpha2: string;
  value: number;
}

export interface RankingQuestionDefinition {
  kind: "ranking";
  id: string;
  questionNoun: string;
  indicator: QuizPromptIndicator;
  year: number;
  rank: number;
  direction: "ascending" | "descending";
  values: RankingValue[];
  coverage: string;
  source: QuizPromptSource;
}

export type KnowledgeQuestionDefinition =
  | LocationQuestionDefinition
  | RankingQuestionDefinition;

const LAKE_BIWA_MUSEUM_SOURCE: QuizPromptSource = {
  name: "Lake Biwa Museum — Facts of Lake Biwa",
  url: "https://www.biwahaku.jp/english/facts/index.html"
};

const WORLD_BANK_POPULATION_SOURCE: QuizPromptSource = {
  name: "World Bank — Population, total (SP.POP.TOTL)",
  url: "https://data.worldbank.org/indicator/SP.POP.TOTL",
  license: "CC BY 4.0"
};

export const KNOWLEDGE_QUESTION_DEFINITIONS: readonly KnowledgeQuestionDefinition[] = [
  {
    kind: "location",
    id: "lake-biwa-country",
    question: "In which country is Lake Biwa?",
    answerIsoAlpha2: ["JP"],
    explanation: "Lake Biwa is in central Japan.",
    source: LAKE_BIWA_MUSEUM_SOURCE
  },
  {
    kind: "ranking",
    id: "population-total-2024-rank-2",
    questionNoun: "population",
    indicator: {
      code: "SP.POP.TOTL",
      label: "Population, total"
    },
    year: 2024,
    rank: 2,
    direction: "descending",
    // A compact, reproducible extract containing the five highest country
    // values in the source for 2024. The generator computes the accepted
    // answer from these values instead of embedding opaque trivia.
    values: [
      { isoAlpha2: "IN", value: 1_450_935_791 },
      { isoAlpha2: "CN", value: 1_408_975_000 },
      { isoAlpha2: "US", value: 340_110_988 },
      { isoAlpha2: "ID", value: 283_487_931 },
      { isoAlpha2: "PK", value: 251_269_164 }
    ],
    coverage: "Bundled extract: five highest country values in the 2024 source data",
    source: WORLD_BANK_POPULATION_SOURCE
  }
];
