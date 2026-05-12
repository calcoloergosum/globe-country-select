import { useMemo } from "react";
import { hasFlag } from "country-flag-icons";
import type { CountryFeature } from "../../components/InteractiveGlobe";
import { buildFlagPrompts, type QuizCountry, type QuizFlagPrompt } from "../../utils/pickRandomFlagPrompt";
import {
  getCountryLatLng,
  getCountryName,
  getFeatureIso2,
  parseCountriesGeoJsonRaw
} from "../../utils/countryData";

type QuizDataset = {
  countries: CountryFeature[];
  quizCountries: QuizCountry<CountryFeature>[];
  quizFlagPrompts: QuizFlagPrompt<CountryFeature>[];
};

export function useQuizDataset(rawCountriesGeoJson: string): QuizDataset {
  const countries = useMemo(
    () => parseCountriesGeoJsonRaw(rawCountriesGeoJson),
    [rawCountriesGeoJson]
  );

  const quizCountries = useMemo<QuizCountry<CountryFeature>[]>(() => {
    return countries
      .map((feature) => {
        const isoAlpha2 = getFeatureIso2(feature);
        const { lat, lng } = getCountryLatLng(feature);

        return {
          feature,
          isoAlpha2,
          name: getCountryName(feature),
          lat,
          lng
        };
      })
      .filter(
        (country): country is QuizCountry<CountryFeature> =>
          !!country.isoAlpha2 && hasFlag(country.isoAlpha2)
      );
  }, [countries]);

  const quizFlagPrompts = useMemo<QuizFlagPrompt<CountryFeature>[]>(
    () => buildFlagPrompts(quizCountries),
    [quizCountries]
  );

  return { countries, quizCountries, quizFlagPrompts };
}
