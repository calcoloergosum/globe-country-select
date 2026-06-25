// Builds and memoizes quiz-ready country, flag, and world-knowledge datasets.
import { useMemo } from "react";
import type { CountryFeature } from "../../components/InteractiveGlobe";
import { buildKnowledgePrompts } from "../../utils/buildKnowledgePrompts";
import { hasFlagIcon } from "../../utils/flagIcons";
import { buildFlagPrompts } from "../../utils/pickRandomFlagPrompt";
import type { QuizCountry, QuizFlagPrompt, QuizKnowledgePrompt } from "../../utils/quizPrompts";
import {
  getCountryLatLng,
  getCountryName,
  getFeatureIso2,
  parseCountriesGeoJson
} from "../../utils/countryData";

type QuizDataset = {
  countries: CountryFeature[];
  quizCountries: QuizCountry<CountryFeature>[];
  quizFlagPrompts: QuizFlagPrompt<CountryFeature>[];
  quizKnowledgePrompts: QuizKnowledgePrompt<CountryFeature>[];
};

export function useQuizDataset(rawCountriesGeoJson: string): QuizDataset {
  const countries = useMemo(
    () => parseCountriesGeoJson(rawCountriesGeoJson),
    [rawCountriesGeoJson]
  );

  const quizCountries = useMemo<QuizCountry<CountryFeature>[]>(() => {
    return countries.flatMap((feature) => {
      const isoAlpha2 = getFeatureIso2(feature);
      if (!isoAlpha2) return [];

      const { lat, lng } = getCountryLatLng(feature);
      return [{
        feature,
        isoAlpha2,
        name: getCountryName(feature),
        lat,
        lng
      }];
    });
  }, [countries]);

  const quizFlagPrompts = useMemo<QuizFlagPrompt<CountryFeature>[]>(
    () => buildFlagPrompts(quizCountries.filter((country) => hasFlagIcon(country.isoAlpha2))),
    [quizCountries]
  );

  const quizKnowledgePrompts = useMemo<QuizKnowledgePrompt<CountryFeature>[]>(
    () => buildKnowledgePrompts(quizCountries),
    [quizCountries]
  );

  return { countries, quizCountries, quizFlagPrompts, quizKnowledgePrompts };
}
