import type { CountryMeasurement, RankingQuestionSpec } from "./types";

const WORLD_BANK_POPULATION_SOURCE = "world-bank-population-total";
const WORLD_BANK_LAND_AREA_SOURCE = "world-bank-land-area";

export const COUNTRY_MEASUREMENTS: readonly CountryMeasurement[] = [
  {
    id: "country-measurement:SP.POP.TOTL:2024:IN",
    isoAlpha2: "IN",
    indicator: { code: "SP.POP.TOTL", label: "Population, total" },
    measurementType: "population",
    value: 1_450_935_791,
    unit: "people",
    observationYear: 2024,
    sourceIds: [WORLD_BANK_POPULATION_SOURCE]
  },
  {
    id: "country-measurement:SP.POP.TOTL:2024:CN",
    isoAlpha2: "CN",
    indicator: { code: "SP.POP.TOTL", label: "Population, total" },
    measurementType: "population",
    value: 1_408_975_000,
    unit: "people",
    observationYear: 2024,
    sourceIds: [WORLD_BANK_POPULATION_SOURCE]
  },
  {
    id: "country-measurement:SP.POP.TOTL:2024:US",
    isoAlpha2: "US",
    indicator: { code: "SP.POP.TOTL", label: "Population, total" },
    measurementType: "population",
    value: 340_110_988,
    unit: "people",
    observationYear: 2024,
    sourceIds: [WORLD_BANK_POPULATION_SOURCE]
  },
  {
    id: "country-measurement:SP.POP.TOTL:2024:ID",
    isoAlpha2: "ID",
    indicator: { code: "SP.POP.TOTL", label: "Population, total" },
    measurementType: "population",
    value: 283_487_931,
    unit: "people",
    observationYear: 2024,
    sourceIds: [WORLD_BANK_POPULATION_SOURCE]
  },
  {
    id: "country-measurement:SP.POP.TOTL:2024:PK",
    isoAlpha2: "PK",
    indicator: { code: "SP.POP.TOTL", label: "Population, total" },
    measurementType: "population",
    value: 251_269_164,
    unit: "people",
    observationYear: 2024,
    sourceIds: [WORLD_BANK_POPULATION_SOURCE]
  },
  {
    id: "country-measurement:AG.LND.TOTL.K2:2023:RU",
    isoAlpha2: "RU",
    indicator: { code: "AG.LND.TOTL.K2", label: "Land area" },
    measurementType: "area",
    value: 16_376_870,
    unit: "sq. km",
    observationYear: 2023,
    sourceIds: [WORLD_BANK_LAND_AREA_SOURCE]
  },
  {
    id: "country-measurement:AG.LND.TOTL.K2:2023:CN",
    isoAlpha2: "CN",
    indicator: { code: "AG.LND.TOTL.K2", label: "Land area" },
    measurementType: "area",
    value: 9_388_210,
    unit: "sq. km",
    observationYear: 2023,
    sourceIds: [WORLD_BANK_LAND_AREA_SOURCE]
  },
  {
    id: "country-measurement:AG.LND.TOTL.K2:2023:US",
    isoAlpha2: "US",
    indicator: { code: "AG.LND.TOTL.K2", label: "Land area" },
    measurementType: "area",
    value: 9_147_420,
    unit: "sq. km",
    observationYear: 2023,
    sourceIds: [WORLD_BANK_LAND_AREA_SOURCE]
  },
  {
    id: "country-measurement:AG.LND.TOTL.K2:2023:CA",
    isoAlpha2: "CA",
    indicator: { code: "AG.LND.TOTL.K2", label: "Land area" },
    measurementType: "area",
    value: 8_788_700,
    unit: "sq. km",
    observationYear: 2023,
    sourceIds: [WORLD_BANK_LAND_AREA_SOURCE]
  },
  {
    id: "country-measurement:AG.LND.TOTL.K2:2023:BR",
    isoAlpha2: "BR",
    indicator: { code: "AG.LND.TOTL.K2", label: "Land area" },
    measurementType: "area",
    value: 8_358_140,
    unit: "sq. km",
    observationYear: 2023,
    sourceIds: [WORLD_BANK_LAND_AREA_SOURCE]
  }
];

export const COUNTRY_RANKING_SPECS: readonly RankingQuestionSpec[] = [
  {
    id: "country-ranking:SP.POP.TOTL:2024:descending:2",
    indicatorCode: "SP.POP.TOTL",
    questionNoun: "population",
    rank: 2,
    direction: "descending",
    sourceIds: [WORLD_BANK_POPULATION_SOURCE]
  },
  {
    id: "country-ranking:AG.LND.TOTL.K2:2023:descending:2",
    indicatorCode: "AG.LND.TOTL.K2",
    questionNoun: "land area",
    rank: 2,
    direction: "descending",
    sourceIds: [WORLD_BANK_LAND_AREA_SOURCE]
  }
];
