import type { Settlement } from "./types";

const WIKIDATA_GEOGRAPHY_SOURCE = "wikidata-geographic-entities";

export const SETTLEMENTS: readonly Settlement[] = [
  {
    id: "settlement:Q64",
    name: "Berlin",
    isoAlpha2: "DE",
    settlementType: "capital",
    wikidataId: "Q64",
    capitalOfIsoAlpha2: "DE",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q64" }]
  },
  {
    id: "settlement:Q61",
    name: "Washington, D.C.",
    isoAlpha2: "US",
    settlementType: "capital",
    wikidataId: "Q61",
    capitalOfIsoAlpha2: "US",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q61" }]
  },
  {
    id: "settlement:Q1930",
    name: "Ottawa",
    isoAlpha2: "CA",
    settlementType: "capital",
    wikidataId: "Q1930",
    capitalOfIsoAlpha2: "CA",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q1930" }]
  },
  {
    id: "settlement:Q2844",
    name: "Brasilia",
    isoAlpha2: "BR",
    settlementType: "capital",
    wikidataId: "Q2844",
    capitalOfIsoAlpha2: "BR",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q2844" }]
  },
  {
    id: "settlement:Q727",
    name: "Amsterdam",
    isoAlpha2: "NL",
    settlementType: "capital",
    wikidataId: "Q727",
    capitalOfIsoAlpha2: "NL",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q727" }],
    notes: "The Hague is a separate seat-of-government record and is not used for capital-country prompts."
  },
  {
    id: "settlement:Q36600",
    name: "The Hague",
    isoAlpha2: "NL",
    settlementType: "administrative-capital",
    wikidataId: "Q36600",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q36600" }],
    notes: "Rejected from generic capital-country questions because it is the seat of government, not the constitutional capital."
  },
  {
    id: "settlement:Q1218",
    name: "Jerusalem",
    isoAlpha2: "IL",
    settlementType: "capital",
    wikidataId: "Q1218",
    capitalOfIsoAlpha2: ["IL", "PS"],
    disputedCapitalStatus: true,
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q1218" }],
    notes: "Rejected from generic capital-country prompts because the capital status is disputed."
  }
];
