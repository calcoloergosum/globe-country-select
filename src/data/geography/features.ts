import type { FeatureCountryRelationship, GeographicFeature } from "./types";

const WIKIDATA_GEOGRAPHY_SOURCE = "wikidata-geographic-entities";

export const GEOGRAPHIC_FEATURES: readonly GeographicFeature[] = [
  {
    id: "feature:Q200239",
    name: "Lake Biwa",
    featureType: "lake",
    wikidataId: "Q200239",
    transboundary: false,
    answerStrategy: "single-country",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q200239" }]
  },
  {
    id: "feature:Q5505",
    name: "Lake Victoria",
    featureType: "lake",
    wikidataId: "Q5505",
    transboundary: true,
    answerStrategy: "accept-all-supported-countries",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q5505" }]
  },
  {
    id: "feature:Q513",
    name: "Mount Everest",
    featureType: "mountain",
    wikidataId: "Q513",
    transboundary: true,
    answerStrategy: "accept-all-supported-countries",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q513" }]
  },
  {
    id: "feature:Q7296",
    name: "Mount Kilimanjaro",
    featureType: "mountain",
    wikidataId: "Q7296",
    transboundary: false,
    answerStrategy: "single-country",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q7296" }]
  },
  {
    id: "feature:Q39231",
    name: "Mount Fuji",
    featureType: "volcano",
    wikidataId: "Q39231",
    transboundary: false,
    answerStrategy: "single-country",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q39231" }]
  },
  {
    id: "feature:Q3783",
    name: "Amazon River",
    featureType: "river",
    wikidataId: "Q3783",
    transboundary: true,
    answerStrategy: "accept-all-supported-countries",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q3783" }],
    notes: "Accepted countries model the main river course, not the full drainage basin."
  },
  {
    id: "feature:Q36332",
    name: "Iguazu Falls",
    featureType: "waterfall",
    wikidataId: "Q36332",
    transboundary: true,
    answerStrategy: "accept-all-supported-countries",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q36332" }]
  },
  {
    id: "feature:Q43278",
    name: "Victoria Falls",
    featureType: "waterfall",
    wikidataId: "Q43278",
    transboundary: true,
    answerStrategy: "accept-all-supported-countries",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q43278" }]
  },
  {
    id: "feature:Q42070",
    name: "Gobi Desert",
    featureType: "desert",
    wikidataId: "Q42070",
    transboundary: true,
    answerStrategy: "accept-all-supported-countries",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q42070" }]
  },
  {
    id: "feature:Q36117",
    name: "Borneo",
    featureType: "island",
    wikidataId: "Q36117",
    transboundary: true,
    answerStrategy: "accept-all-supported-countries",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q36117" }]
  },
  {
    id: "feature:Q483134",
    name: "Korean Peninsula",
    featureType: "peninsula",
    wikidataId: "Q483134",
    transboundary: true,
    answerStrategy: "accept-all-supported-countries",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q483134" }]
  },
  {
    id: "feature:Q6583",
    name: "Sahara",
    featureType: "desert",
    wikidataId: "Q6583",
    transboundary: true,
    answerStrategy: "exclude-from-country-question",
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q6583" }],
    notes: "Held out because country membership varies by source and political treatment."
  }
];

export const FEATURE_COUNTRY_RELATIONSHIPS: readonly FeatureCountryRelationship[] = [
  { id: "feature-country:Q200239:JP", featureId: "feature:Q200239", isoAlpha2: "JP", relationshipType: "located_in", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q5505:KE", featureId: "feature:Q5505", isoAlpha2: "KE", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q5505:TZ", featureId: "feature:Q5505", isoAlpha2: "TZ", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q5505:UG", featureId: "feature:Q5505", isoAlpha2: "UG", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q513:CN", featureId: "feature:Q513", isoAlpha2: "CN", relationshipType: "bordered_by", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q513:NP", featureId: "feature:Q513", isoAlpha2: "NP", relationshipType: "bordered_by", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q7296:TZ", featureId: "feature:Q7296", isoAlpha2: "TZ", relationshipType: "located_in", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q39231:JP", featureId: "feature:Q39231", isoAlpha2: "JP", relationshipType: "located_in", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q3783:BR", featureId: "feature:Q3783", isoAlpha2: "BR", relationshipType: "drains_through", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q3783:CO", featureId: "feature:Q3783", isoAlpha2: "CO", relationshipType: "drains_through", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q3783:PE", featureId: "feature:Q3783", isoAlpha2: "PE", relationshipType: "drains_through", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q36332:AR", featureId: "feature:Q36332", isoAlpha2: "AR", relationshipType: "bordered_by", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q36332:BR", featureId: "feature:Q36332", isoAlpha2: "BR", relationshipType: "bordered_by", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q43278:ZM", featureId: "feature:Q43278", isoAlpha2: "ZM", relationshipType: "bordered_by", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q43278:ZW", featureId: "feature:Q43278", isoAlpha2: "ZW", relationshipType: "bordered_by", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q42070:CN", featureId: "feature:Q42070", isoAlpha2: "CN", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q42070:MN", featureId: "feature:Q42070", isoAlpha2: "MN", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q36117:BN", featureId: "feature:Q36117", isoAlpha2: "BN", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q36117:ID", featureId: "feature:Q36117", isoAlpha2: "ID", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q36117:MY", featureId: "feature:Q36117", isoAlpha2: "MY", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q483134:KP", featureId: "feature:Q483134", isoAlpha2: "KP", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "feature-country:Q483134:KR", featureId: "feature:Q483134", isoAlpha2: "KR", relationshipType: "contains_part", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] }
];
