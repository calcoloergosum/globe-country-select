import type { BorderIntersectionSeed, CountryAdjacency } from "./types";

const NATURAL_EARTH_SOURCE = "natural-earth-admin-0-countries-50m";

export const COUNTRY_ADJACENCIES: readonly CountryAdjacency[] = [
  { id: "country-adjacency:AT:DE", isoAlpha2: "AT", adjacentIsoAlpha2: "DE", borderType: "land", sourceIds: [NATURAL_EARTH_SOURCE] },
  { id: "country-adjacency:AT:IT", isoAlpha2: "AT", adjacentIsoAlpha2: "IT", borderType: "land", sourceIds: [NATURAL_EARTH_SOURCE] },
  { id: "country-adjacency:CH:DE", isoAlpha2: "CH", adjacentIsoAlpha2: "DE", borderType: "land", sourceIds: [NATURAL_EARTH_SOURCE] },
  { id: "country-adjacency:CH:IT", isoAlpha2: "CH", adjacentIsoAlpha2: "IT", borderType: "land", sourceIds: [NATURAL_EARTH_SOURCE] },
  { id: "country-adjacency:DE:FR", isoAlpha2: "DE", adjacentIsoAlpha2: "FR", borderType: "land", sourceIds: [NATURAL_EARTH_SOURCE] },
  { id: "country-adjacency:FR:IT", isoAlpha2: "FR", adjacentIsoAlpha2: "IT", borderType: "land", sourceIds: [NATURAL_EARTH_SOURCE] },
  {
    id: "country-adjacency:RS:XK",
    isoAlpha2: "RS",
    adjacentIsoAlpha2: "XK",
    borderType: "land",
    disputed: true,
    sourceIds: [NATURAL_EARTH_SOURCE],
    notes: "Representative disputed adjacency retained for validation; generators skip disputed adjacency records."
  }
];

export const BORDER_INTERSECTION_SEEDS: readonly BorderIntersectionSeed[] = [
  {
    id: "border-intersection:DE:IT",
    anchorIsoAlpha2: ["DE", "IT"],
    sourceIds: [NATURAL_EARTH_SOURCE],
    notes: "Representative complete local graph for countries that share land borders with both Germany and Italy."
  }
];
