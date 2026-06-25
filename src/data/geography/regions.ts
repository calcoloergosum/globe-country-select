import type { Region, RegionMembership } from "./types";

const WIKIDATA_GEOGRAPHY_SOURCE = "wikidata-geographic-entities";

export const REGIONS: readonly Region[] = [
  {
    id: "region:nordic-countries",
    name: "the Nordic countries",
    regionType: "cultural-region",
    completeMembership: true,
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q52062" }]
  },
  {
    id: "region:baltic-states",
    name: "the Baltic states",
    regionType: "cultural-region",
    completeMembership: true,
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    sourceReferences: [{ datasetId: WIKIDATA_GEOGRAPHY_SOURCE, recordUrl: "https://www.wikidata.org/wiki/Q39731" }]
  },
  {
    id: "region:south-america-sample",
    name: "South America sample",
    regionType: "continent",
    completeMembership: false,
    sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE],
    notes: "Kept as a validation fixture. It is not emitted because membership is intentionally incomplete."
  }
];

export const REGION_MEMBERSHIPS: readonly RegionMembership[] = [
  { id: "region-membership:nordic-countries:DK", regionId: "region:nordic-countries", isoAlpha2: "DK", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:nordic-countries:FI", regionId: "region:nordic-countries", isoAlpha2: "FI", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:nordic-countries:IS", regionId: "region:nordic-countries", isoAlpha2: "IS", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:nordic-countries:NO", regionId: "region:nordic-countries", isoAlpha2: "NO", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:nordic-countries:SE", regionId: "region:nordic-countries", isoAlpha2: "SE", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:baltic-states:EE", regionId: "region:baltic-states", isoAlpha2: "EE", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:baltic-states:LV", regionId: "region:baltic-states", isoAlpha2: "LV", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:baltic-states:LT", regionId: "region:baltic-states", isoAlpha2: "LT", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:south-america-sample:BR", regionId: "region:south-america-sample", isoAlpha2: "BR", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] },
  { id: "region-membership:south-america-sample:AR", regionId: "region:south-america-sample", isoAlpha2: "AR", sourceIds: [WIKIDATA_GEOGRAPHY_SOURCE] }
];
