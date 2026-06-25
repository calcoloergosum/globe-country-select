export type IsoAlpha2 = string;
export type StableId = string;

export type GeographicFeatureType =
  | "lake"
  | "mountain"
  | "volcano"
  | "river"
  | "waterfall"
  | "desert"
  | "island"
  | "peninsula"
  | "other";

export type QuestionFamily =
  | "feature-country"
  | "capital-country"
  | "border-intersection"
  | "landlocked"
  | "region-membership"
  | "hemisphere"
  | "country-ranking";

export interface DatasetManifest {
  id: StableId;
  datasetName: string;
  source: string;
  citationUrl: string;
  license: string;
  version?: string;
  observationYear?: number;
  preprocessingNotes: string;
  geographicCoverage: string;
  knownLimitations: string;
}

export interface SourceReference {
  datasetId: StableId;
  recordUrl?: string;
  sourceNote?: string;
}

export interface SourceBackedRecord {
  id: StableId;
  sourceIds: readonly StableId[];
  sourceReferences?: readonly SourceReference[];
  notes?: string;
}

export interface Country extends SourceBackedRecord {
  id: StableId;
  isoAlpha2: IsoAlpha2;
  isoAlpha3?: string;
  name: string;
  landlocked?: boolean;
}

export interface GeographicFeature extends SourceBackedRecord {
  id: StableId;
  name: string;
  featureType: GeographicFeatureType;
  wikidataId?: string;
  transboundary: boolean;
  disputed?: boolean;
  answerStrategy:
    | "single-country"
    | "accept-all-supported-countries"
    | "exclude-from-country-question";
}

export interface FeatureCountryRelationship extends SourceBackedRecord {
  id: StableId;
  featureId: StableId;
  isoAlpha2: IsoAlpha2;
  relationshipType:
    | "located_in"
    | "contains_part"
    | "bordered_by"
    | "drains_through";
  disputed?: boolean;
}

export interface Settlement extends SourceBackedRecord {
  id: StableId;
  name: string;
  isoAlpha2: IsoAlpha2;
  settlementType: "capital" | "city" | "administrative-capital";
  wikidataId?: string;
  capitalOfIsoAlpha2?: IsoAlpha2 | readonly IsoAlpha2[];
  disputedCapitalStatus?: boolean;
}

export interface Region extends SourceBackedRecord {
  id: StableId;
  name: string;
  regionType: "continent" | "cultural-region" | "statistical-region";
  completeMembership: boolean;
}

export interface RegionMembership extends SourceBackedRecord {
  id: StableId;
  regionId: StableId;
  isoAlpha2: IsoAlpha2;
}

export interface CountryAdjacency extends SourceBackedRecord {
  id: StableId;
  isoAlpha2: IsoAlpha2;
  adjacentIsoAlpha2: IsoAlpha2;
  borderType: "land" | "maritime";
  disputed?: boolean;
}

export interface CountryMeasurement extends SourceBackedRecord {
  id: StableId;
  isoAlpha2: IsoAlpha2;
  indicator: {
    code: string;
    label: string;
  };
  measurementType: "population" | "area" | "elevation" | "coastline" | "other";
  value: number;
  unit: string;
  observationYear: number;
}

export interface BorderIntersectionSeed {
  id: StableId;
  anchorIsoAlpha2: readonly [IsoAlpha2, IsoAlpha2];
  sourceIds: readonly StableId[];
  notes?: string;
}

export interface RankingQuestionSpec {
  id: StableId;
  indicatorCode: string;
  questionNoun: string;
  rank: number;
  direction: "ascending" | "descending";
  sourceIds: readonly StableId[];
}
