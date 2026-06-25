import type { DatasetManifest, StableId } from "./types";

export const GEOGRAPHIC_DATASET_MANIFESTS: readonly DatasetManifest[] = [
  {
    id: "natural-earth-admin-0-countries-50m",
    datasetName: "Natural Earth Admin 0 Countries 1:50m",
    source: "Natural Earth",
    citationUrl: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries/",
    license: "Public domain",
    version: "Bundled 50m extract; exact upstream release is not encoded in the GeoJSON",
    preprocessingNotes:
      "The app bundles a static GeoJSON file and parses only country geometry, ISO alpha-2 fallback fields, label coordinates, and bounding boxes. Representative adjacency records are manually curated from land-border relationships for targeted question generation.",
    geographicCoverage:
      "Global Admin 0 country and dependency polygons available in the bundled Natural Earth-style GeoJSON.",
    knownLimitations:
      "Natural Earth uses cartographic and de facto boundary choices. Some disputed or exceptional territories have non-standard or unresolved ISO fields, and this layer rejects unresolved country codes."
  },
  {
    id: "wikidata-geographic-entities",
    datasetName: "Wikidata geographic entities static extract",
    source: "Wikidata",
    citationUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    license: "CC0 1.0 for structured data in the Wikidata main namespace",
    observationYear: 2026,
    preprocessingNotes:
      "Feature, settlement, region, and country-status records were manually curated from stable Wikidata QIDs into static TypeScript records. Wikimedia article text and media are not imported.",
    geographicCoverage:
      "Representative global physical features, capitals, complete small regional groups, and ISO-coded landlocked sovereign states used by the bundled quiz generators.",
    knownLimitations:
      "This is not a complete gazetteer. Disputed capitals, fuzzy regions, basin-vs-main-stem river countries, and transboundary features are marked or excluded unless the question text accepts every supported country explicitly."
  },
  {
    id: "world-bank-population-total",
    datasetName: "World Bank Population, total",
    source: "World Bank Open Data",
    citationUrl: "https://data.worldbank.org/indicator/SP.POP.TOTL",
    license: "CC BY 4.0 with World Bank dataset terms",
    observationYear: 2024,
    preprocessingNotes:
      "A compact top-country slice is bundled for deterministic ranking questions. Non-country aggregates such as World, regions, and income groups are excluded before ranking.",
    geographicCoverage:
      "Representative 2024 country rows needed for the bundled population ranking prompt.",
    knownLimitations:
      "The bundled slice is not a complete World Development Indicators mirror. New ranking prompts must document the ranking universe or include a reproducible slice that proves the requested rank."
  },
  {
    id: "world-bank-land-area",
    datasetName: "World Bank Land area",
    source: "World Bank Open Data",
    citationUrl: "https://data.worldbank.org/indicator/AG.LND.TOTL.K2",
    license: "CC BY 4.0 with World Bank dataset terms",
    observationYear: 2023,
    preprocessingNotes:
      "A compact top-country slice is bundled for deterministic ranking questions. Non-country aggregates such as World, regions, and income groups are excluded before ranking.",
    geographicCoverage:
      "Representative 2023 country rows needed for the bundled land-area ranking prompt.",
    knownLimitations:
      "The bundled slice is not a complete World Development Indicators mirror. New ranking prompts must document the ranking universe or include a reproducible slice that proves the requested rank."
  }
];

export function getDatasetManifest(id: StableId): DatasetManifest | undefined {
  return GEOGRAPHIC_DATASET_MANIFESTS.find((manifest) => manifest.id === id);
}
