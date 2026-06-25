import type { QuizCountry, QuizKnowledgePrompt, QuizPromptSource } from "../../utils/quizPrompts";
import { COUNTRY_ADJACENCIES, BORDER_INTERSECTION_SEEDS } from "./adjacency";
import { LANDLOCKED_COUNTRIES } from "./countries";
import { FEATURE_COUNTRY_RELATIONSHIPS, GEOGRAPHIC_FEATURES } from "./features";
import { getDatasetManifest } from "./manifest";
import { COUNTRY_MEASUREMENTS, COUNTRY_RANKING_SPECS } from "./measurements";
import { REGION_MEMBERSHIPS, REGIONS } from "./regions";
import { SETTLEMENTS } from "./settlements";
import type {
  BorderIntersectionSeed,
  Country,
  CountryAdjacency,
  CountryMeasurement,
  FeatureCountryRelationship,
  GeographicFeature,
  IsoAlpha2,
  QuestionFamily,
  RankingQuestionSpec,
  Region,
  RegionMembership,
  Settlement,
  SourceBackedRecord,
  StableId
} from "./types";

const ISO_ALPHA2_PATTERN = /^[A-Z]{2}$/;

type TemplateContext = {
  featureName?: string;
  featureType?: string;
  settlementName?: string;
  regionName?: string;
  anchorNames?: readonly [string, string];
  hemisphereLabel?: string;
  meridianLabel?: string;
  ordinal?: string;
  sizeLabel?: string;
  questionNoun?: string;
  year?: number;
};

type QuestionTemplate = {
  id: StableId;
  text: (context: TemplateContext) => string;
};

export interface GeographicQuestionContext<TFeature> {
  countries: readonly QuizCountry<TFeature>[];
  seed?: string | number;
}

export interface QuestionGenerationRejection {
  family: QuestionFamily;
  recordId: StableId;
  reason: string;
  details?: string;
}

export interface QuestionGenerationResult<TFeature> {
  prompts: QuizKnowledgePrompt<TFeature>[];
  rejections: QuestionGenerationRejection[];
}

type CountryResolution<TFeature> =
  | { ok: true; codes: string[]; countries: QuizCountry<TFeature>[] }
  | { ok: false; reason: string; details?: string };

const FEATURE_SINGLE_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "feature-country.single.in-which-country",
    text: ({ featureName }) => `In which country is ${featureName}?`
  },
  {
    id: "feature-country.single.contains",
    text: ({ featureName }) => `Which country contains ${featureName}?`
  }
];

const FEATURE_MULTI_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "feature-country.multi.pick-any",
    text: ({ featureName }) => `Pick any country associated with the transboundary feature ${featureName}.`
  },
  {
    id: "feature-country.multi.contains-part",
    text: ({ featureName }) => `Pick any country that contains part of ${featureName}.`
  }
];

const CAPITAL_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "capital-country.default",
    text: ({ settlementName }) => `Which country is ${settlementName} the capital of?`
  },
  {
    id: "capital-country.select",
    text: ({ settlementName }) => `Select the country whose capital is ${settlementName}.`
  }
];

const BORDER_INTERSECTION_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "border-intersection.borders-both",
    text: ({ anchorNames }) => `Which country borders both ${anchorNames?.[0]} and ${anchorNames?.[1]}?`
  },
  {
    id: "border-intersection.shares-with-both",
    text: ({ anchorNames }) => `Pick a country that shares a land border with both ${anchorNames?.[0]} and ${anchorNames?.[1]}.`
  }
];

const LANDLOCKED_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "landlocked.pick-any",
    text: () => "Pick any landlocked country."
  },
  {
    id: "landlocked.no-ocean-coastline",
    text: () => "Select a country with no ocean coastline."
  }
];

const REGION_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "region-membership.classified-as",
    text: ({ regionName }) => `Pick any country classified as part of ${regionName}.`
  },
  {
    id: "region-membership.select-in-region",
    text: ({ regionName }) => `Select a country in ${regionName}.`
  }
];

const HEMISPHERE_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "hemisphere.representative-point",
    text: ({ hemisphereLabel }) => `Pick a country whose representative point is in the ${hemisphereLabel}.`
  }
];

const MERIDIAN_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "hemisphere.prime-meridian",
    text: ({ meridianLabel }) => `Pick a country whose representative point is ${meridianLabel} of the Prime Meridian.`
  }
];

const RANKING_TEMPLATES: readonly QuestionTemplate[] = [
  {
    id: "country-ranking.ordinal",
    text: ({ ordinal, sizeLabel, questionNoun, year }) =>
      `Which country had the ${ordinal} ${sizeLabel} ${questionNoun} in ${year}?`
  }
];

const HEMISPHERE_SPECS = [
  { id: "hemisphere:northern", axis: "latitude", side: "north", label: "Northern Hemisphere" },
  { id: "hemisphere:southern", axis: "latitude", side: "south", label: "Southern Hemisphere" },
  { id: "hemisphere:eastern", axis: "longitude", side: "east", label: "east" },
  { id: "hemisphere:western", axis: "longitude", side: "west", label: "west" }
] as const;

export function formatOrdinal(value: number): string {
  const integer = Math.trunc(value);
  const absolute = Math.abs(integer);
  const lastTwoDigits = absolute % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${integer}th`;

  switch (absolute % 10) {
    case 1:
      return `${integer}st`;
    case 2:
      return `${integer}nd`;
    case 3:
      return `${integer}rd`;
    default:
      return `${integer}th`;
  }
}

function normalizeIsoAlpha2(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return ISO_ALPHA2_PATTERN.test(normalized) ? normalized : null;
}

function compareById<TRecord extends { id: string }>(left: TRecord, right: TRecord): number {
  return left.id.localeCompare(right.id);
}

function buildCountryMap<TFeature>(countries: readonly QuizCountry<TFeature>[]) {
  const map = new Map<string, QuizCountry<TFeature>>();
  for (const country of countries) {
    const isoAlpha2 = normalizeIsoAlpha2(country.isoAlpha2);
    if (isoAlpha2 && !map.has(isoAlpha2)) {
      map.set(isoAlpha2, country);
    }
  }
  return map;
}

function uniqueSortedCodes(codes: readonly string[]): string[] | null {
  const normalizedCodes: string[] = [];
  for (const code of codes) {
    const normalized = normalizeIsoAlpha2(code);
    if (!normalized) return null;
    normalizedCodes.push(normalized);
  }
  return [...new Set(normalizedCodes)].sort();
}

function resolveCountryCodes<TFeature>(
  codes: readonly string[],
  countryMap: Map<string, QuizCountry<TFeature>>
): CountryResolution<TFeature> {
  const normalizedCodes = uniqueSortedCodes(codes);
  if (!normalizedCodes) {
    return { ok: false, reason: "invalid-country-code", details: codes.join(", ") };
  }

  const countries: QuizCountry<TFeature>[] = [];
  const missing: string[] = [];
  for (const code of normalizedCodes) {
    const country = countryMap.get(code);
    if (country) {
      countries.push(country);
    } else {
      missing.push(code);
    }
  }

  if (missing.length > 0) {
    return { ok: false, reason: "unresolved-country-code", details: missing.join(", ") };
  }

  return { ok: true, codes: normalizedCodes, countries };
}

function mergeResults<TFeature>(
  results: readonly QuestionGenerationResult<TFeature>[]
): QuestionGenerationResult<TFeature> {
  const prompts = results.flatMap((result) => result.prompts);
  const seenPromptIds = new Set<string>();
  const duplicateRejections: QuestionGenerationRejection[] = [];
  const uniquePrompts: QuizKnowledgePrompt<TFeature>[] = [];

  for (const prompt of prompts) {
    if (seenPromptIds.has(prompt.id)) {
      duplicateRejections.push({
        family: prompt.metadata.topic as QuestionFamily,
        recordId: prompt.id,
        reason: "duplicate-generated-prompt-id"
      });
      continue;
    }
    seenPromptIds.add(prompt.id);
    uniquePrompts.push(prompt);
  }

  return {
    prompts: uniquePrompts,
    rejections: [...results.flatMap((result) => result.rejections), ...duplicateRejections]
  };
}

function reject(
  family: QuestionFamily,
  recordId: StableId,
  reason: string,
  details?: string
): QuestionGenerationRejection {
  return { family, recordId, reason, details };
}

function hasResolvableSources(record: SourceBackedRecord): boolean {
  return record.sourceIds.length > 0 && record.sourceIds.every((sourceId) => !!getDatasetManifest(sourceId));
}

function getPromptSource(sourceIds: readonly StableId[]): QuizPromptSource | null {
  const manifest = sourceIds.map((sourceId) => getDatasetManifest(sourceId)).find(Boolean);
  if (!manifest) return null;

  return {
    name: `${manifest.source} - ${manifest.datasetName}`,
    url: manifest.citationUrl,
    license: manifest.license
  };
}

function stableHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function slugSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function answerSegment(codes: readonly string[]): string {
  const joined = codes.join("-");
  return codes.length > 12 ? `answers-${stableHash(joined)}` : joined;
}

function buildPromptId(family: QuestionFamily, recordId: StableId, answerCodes: readonly string[]): string {
  return `knowledge:${family}:${slugSegment(recordId)}:${answerSegment(answerCodes)}`;
}

function chooseTemplate(
  templates: readonly QuestionTemplate[],
  seed: string | number | undefined,
  stableKey: string
): QuestionTemplate {
  const seedText = seed === undefined ? "default" : String(seed);
  const hash = parseInt(stableHash(`${seedText}:${stableKey}`), 36);
  return templates[hash % templates.length];
}

function formatCountryNames<TFeature>(countries: readonly QuizCountry<TFeature>[]): string {
  return countries.map((country) => country.name).join(", ");
}

function formatRankingValue(value: number, unit: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 3
  }).format(value);
  return `${formatted} ${unit}`;
}

function buildFeatureTransformation(feature: GeographicFeature, relationships: readonly FeatureCountryRelationship[]): string {
  const relationshipIds = relationships.map((relationship) => relationship.id).sort().join(", ");
  return `Resolve ${feature.name} from normalized feature record ${feature.id}; collect non-disputed FeatureCountryRelationship records (${relationshipIds}); require all accepted ISO alpha-2 codes to resolve against the globe dataset.`;
}

export function generateFeatureCountryQuestions<TFeature>(
  context: GeographicQuestionContext<TFeature>,
  features: readonly GeographicFeature[] = GEOGRAPHIC_FEATURES,
  relationships: readonly FeatureCountryRelationship[] = FEATURE_COUNTRY_RELATIONSHIPS
): QuestionGenerationResult<TFeature> {
  const countryMap = buildCountryMap(context.countries);
  const rejections: QuestionGenerationRejection[] = [];
  const prompts: QuizKnowledgePrompt<TFeature>[] = [];
  const relationshipsByFeature = new Map<StableId, FeatureCountryRelationship[]>();

  for (const relationship of relationships) {
    const group = relationshipsByFeature.get(relationship.featureId) ?? [];
    group.push(relationship);
    relationshipsByFeature.set(relationship.featureId, group);
  }

  for (const feature of [...features].sort(compareById)) {
    if (!feature.name.trim() || !hasResolvableSources(feature)) {
      rejections.push(reject("feature-country", feature.id, "missing-feature-source-or-name"));
      continue;
    }

    if (feature.answerStrategy === "exclude-from-country-question") {
      rejections.push(reject("feature-country", feature.id, "excluded-by-feature-answer-strategy", feature.notes));
      continue;
    }

    const featureRelationships = (relationshipsByFeature.get(feature.id) ?? [])
      .filter((relationship) => !relationship.disputed)
      .sort(compareById);
    if (featureRelationships.length === 0) {
      rejections.push(reject("feature-country", feature.id, "missing-feature-country-relationship"));
      continue;
    }

    if (featureRelationships.length > 1 && feature.answerStrategy !== "accept-all-supported-countries") {
      rejections.push(reject("feature-country", feature.id, "transboundary-feature-needs-all-country-policy"));
      continue;
    }

    const resolved = resolveCountryCodes(
      featureRelationships.map((relationship) => relationship.isoAlpha2),
      countryMap
    );
    if (!resolved.ok) {
      rejections.push(reject("feature-country", feature.id, resolved.reason, resolved.details));
      continue;
    }

    const source = getPromptSource(feature.sourceIds);
    if (!source) {
      rejections.push(reject("feature-country", feature.id, "missing-prompt-source"));
      continue;
    }

    const multiCountry = resolved.countries.length > 1;
    const template = chooseTemplate(
      multiCountry ? FEATURE_MULTI_TEMPLATES : FEATURE_SINGLE_TEMPLATES,
      context.seed,
      feature.id
    );
    const countryNames = formatCountryNames(resolved.countries);

    prompts.push({
      id: buildPromptId("feature-country", feature.id, resolved.codes),
      kind: "knowledge",
      question: template.text({ featureName: feature.name, featureType: feature.featureType }),
      countries: resolved.countries,
      explanation: multiCountry
        ? `${feature.name} is a transboundary ${feature.featureType}; accepted answers are every supported country in this record: ${countryNames}.`
        : `${feature.name} is associated with ${countryNames}.`,
      source,
      metadata: {
        topic: "feature-country",
        transformation: buildFeatureTransformation(feature, featureRelationships),
        coverage: feature.notes ?? "Representative static physical-feature extract.",
        sourceIds: feature.sourceIds,
        recordIds: [feature.id, ...featureRelationships.map((relationship) => relationship.id)],
        templateId: template.id
      }
    });
  }

  return { prompts, rejections };
}

export function generateCapitalCountryQuestions<TFeature>(
  context: GeographicQuestionContext<TFeature>,
  settlements: readonly Settlement[] = SETTLEMENTS
): QuestionGenerationResult<TFeature> {
  const countryMap = buildCountryMap(context.countries);
  const rejections: QuestionGenerationRejection[] = [];
  const prompts: QuizKnowledgePrompt<TFeature>[] = [];

  for (const settlement of [...settlements].sort(compareById)) {
    if (!settlement.name.trim() || !hasResolvableSources(settlement)) {
      rejections.push(reject("capital-country", settlement.id, "missing-settlement-source-or-name"));
      continue;
    }

    if (settlement.settlementType !== "capital") {
      rejections.push(reject("capital-country", settlement.id, "settlement-is-not-a-capital", settlement.notes));
      continue;
    }

    if (settlement.disputedCapitalStatus) {
      rejections.push(reject("capital-country", settlement.id, "disputed-capital-status", settlement.notes));
      continue;
    }

    const acceptedCodes = Array.isArray(settlement.capitalOfIsoAlpha2)
      ? settlement.capitalOfIsoAlpha2
      : settlement.capitalOfIsoAlpha2
        ? [settlement.capitalOfIsoAlpha2]
        : [settlement.isoAlpha2];
    const resolved = resolveCountryCodes(acceptedCodes, countryMap);
    if (!resolved.ok) {
      rejections.push(reject("capital-country", settlement.id, resolved.reason, resolved.details));
      continue;
    }

    const source = getPromptSource(settlement.sourceIds);
    if (!source) {
      rejections.push(reject("capital-country", settlement.id, "missing-prompt-source"));
      continue;
    }

    const template = chooseTemplate(CAPITAL_TEMPLATES, context.seed, settlement.id);
    const countryNames = formatCountryNames(resolved.countries);
    prompts.push({
      id: buildPromptId("capital-country", settlement.id, resolved.codes),
      kind: "knowledge",
      question: template.text({ settlementName: settlement.name }),
      countries: resolved.countries,
      explanation: `${settlement.name} is the capital of ${countryNames}.`,
      source,
      metadata: {
        topic: "capital-country",
        transformation: `Resolve capital settlement ${settlement.id} to its normalized capitalOf ISO alpha-2 country code and require the accepted country to exist in the globe dataset.`,
        coverage: settlement.notes ?? "Representative static capital settlement extract.",
        sourceIds: settlement.sourceIds,
        recordIds: [settlement.id],
        templateId: template.id
      }
    });
  }

  return { prompts, rejections };
}

function getAdjacencyKey(leftCode: string, rightCode: string): string {
  return [leftCode, rightCode].sort().join("|");
}

function buildNeighborMap(
  adjacencies: readonly CountryAdjacency[],
  rejections: QuestionGenerationRejection[]
): Map<string, Set<string>> {
  const neighborMap = new Map<string, Set<string>>();
  const seenAdjacencyKeys = new Set<string>();

  for (const adjacency of [...adjacencies].sort(compareById)) {
    if (adjacency.disputed) {
      rejections.push(reject("border-intersection", adjacency.id, "disputed-adjacency-skipped", adjacency.notes));
      continue;
    }

    if (adjacency.borderType !== "land") {
      continue;
    }

    const leftCode = normalizeIsoAlpha2(adjacency.isoAlpha2);
    const rightCode = normalizeIsoAlpha2(adjacency.adjacentIsoAlpha2);
    if (!leftCode || !rightCode) {
      rejections.push(reject("border-intersection", adjacency.id, "invalid-country-code"));
      continue;
    }

    const adjacencyKey = getAdjacencyKey(leftCode, rightCode);
    if (seenAdjacencyKeys.has(adjacencyKey)) continue;
    seenAdjacencyKeys.add(adjacencyKey);

    const leftNeighbors = neighborMap.get(leftCode) ?? new Set<string>();
    leftNeighbors.add(rightCode);
    neighborMap.set(leftCode, leftNeighbors);

    const rightNeighbors = neighborMap.get(rightCode) ?? new Set<string>();
    rightNeighbors.add(leftCode);
    neighborMap.set(rightCode, rightNeighbors);
  }

  return neighborMap;
}

export function generateBorderIntersectionQuestions<TFeature>(
  context: GeographicQuestionContext<TFeature>,
  adjacencies: readonly CountryAdjacency[] = COUNTRY_ADJACENCIES,
  seeds: readonly BorderIntersectionSeed[] = BORDER_INTERSECTION_SEEDS
): QuestionGenerationResult<TFeature> {
  const countryMap = buildCountryMap(context.countries);
  const rejections: QuestionGenerationRejection[] = [];
  const prompts: QuizKnowledgePrompt<TFeature>[] = [];
  const neighborMap = buildNeighborMap(adjacencies, rejections);

  for (const seed of [...seeds].sort(compareById)) {
    if (!hasResolvableSources(seed)) {
      rejections.push(reject("border-intersection", seed.id, "missing-border-seed-source"));
      continue;
    }

    const anchorCodes = uniqueSortedCodes(seed.anchorIsoAlpha2);
    if (!anchorCodes || anchorCodes.length !== 2) {
      rejections.push(reject("border-intersection", seed.id, "invalid-anchor-country-code"));
      continue;
    }

    const resolvedAnchors = resolveCountryCodes(anchorCodes, countryMap);
    if (!resolvedAnchors.ok) {
      rejections.push(reject("border-intersection", seed.id, resolvedAnchors.reason, resolvedAnchors.details));
      continue;
    }

    const [leftCode, rightCode] = anchorCodes;
    const leftNeighbors = neighborMap.get(leftCode) ?? new Set<string>();
    const rightNeighbors = neighborMap.get(rightCode) ?? new Set<string>();
    const answerCodes = [...leftNeighbors]
      .filter((code) => rightNeighbors.has(code) && code !== leftCode && code !== rightCode)
      .sort();

    if (answerCodes.length === 0) {
      rejections.push(reject("border-intersection", seed.id, "no-shared-border-neighbor"));
      continue;
    }

    const resolvedAnswers = resolveCountryCodes(answerCodes, countryMap);
    if (!resolvedAnswers.ok) {
      rejections.push(reject("border-intersection", seed.id, resolvedAnswers.reason, resolvedAnswers.details));
      continue;
    }

    const source = getPromptSource(seed.sourceIds);
    if (!source) {
      rejections.push(reject("border-intersection", seed.id, "missing-prompt-source"));
      continue;
    }

    const anchorNames = [
      resolvedAnchors.countries[0].name,
      resolvedAnchors.countries[1].name
    ] as const;
    const template = chooseTemplate(BORDER_INTERSECTION_TEMPLATES, context.seed, seed.id);
    prompts.push({
      id: buildPromptId("border-intersection", seed.id, resolvedAnswers.codes),
      kind: "knowledge",
      question: template.text({ anchorNames }),
      countries: resolvedAnswers.countries,
      explanation: `${formatCountryNames(resolvedAnswers.countries)} share land borders with both ${anchorNames[0]} and ${anchorNames[1]}.`,
      source,
      metadata: {
        topic: "border-intersection",
        transformation: `Build an undirected land-adjacency graph from normalized CountryAdjacency records, skip disputed edges, intersect neighbors of ${leftCode} and ${rightCode}, and require all accepted answers to resolve against the globe dataset.`,
        coverage: seed.notes ?? "Representative static country-adjacency extract.",
        sourceIds: seed.sourceIds,
        recordIds: [seed.id],
        templateId: template.id
      }
    });
  }

  return { prompts, rejections };
}

export function generateLandlockedQuestions<TFeature>(
  context: GeographicQuestionContext<TFeature>,
  countries: readonly Country[] = LANDLOCKED_COUNTRIES
): QuestionGenerationResult<TFeature> {
  const countryMap = buildCountryMap(context.countries);
  const rejections: QuestionGenerationRejection[] = [];
  const landlockedCountries = countries.filter((country) => country.landlocked).sort(compareById);

  if (landlockedCountries.some((country) => !hasResolvableSources(country))) {
    return {
      prompts: [],
      rejections: [reject("landlocked", "country-status:landlocked", "missing-country-status-source")]
    };
  }

  const resolved = resolveCountryCodes(
    landlockedCountries.map((country) => country.isoAlpha2),
    countryMap
  );
  if (!resolved.ok) {
    return {
      prompts: [],
      rejections: [reject("landlocked", "country-status:landlocked", resolved.reason, resolved.details)]
    };
  }

  const sourceIds = [...new Set(landlockedCountries.flatMap((country) => country.sourceIds))].sort();
  const source = getPromptSource(sourceIds);
  if (!source) {
    return {
      prompts: [],
      rejections: [reject("landlocked", "country-status:landlocked", "missing-prompt-source")]
    };
  }

  const template = chooseTemplate(LANDLOCKED_TEMPLATES, context.seed, "country-status:landlocked");
  return {
    prompts: [{
      id: buildPromptId("landlocked", "country-status:landlocked", resolved.codes),
      kind: "knowledge",
      question: template.text({}),
      countries: resolved.countries,
      explanation: `${resolved.countries.length} bundled country records are marked as landlocked and all accepted ISO codes resolve against the globe dataset.`,
      source,
      metadata: {
        topic: "landlocked",
        transformation: "Filter normalized Country records to landlocked=true, sort accepted ISO alpha-2 codes, and require every accepted country to resolve against the globe dataset.",
        coverage: "All bundled ISO-coded sovereign country records marked as landlocked; disputed non-ISO exceptional codes are not included.",
        sourceIds,
        recordIds: landlockedCountries.map((country) => country.id),
        templateId: template.id
      }
    }],
    rejections
  };
}

export function generateRegionMembershipQuestions<TFeature>(
  context: GeographicQuestionContext<TFeature>,
  regions: readonly Region[] = REGIONS,
  memberships: readonly RegionMembership[] = REGION_MEMBERSHIPS
): QuestionGenerationResult<TFeature> {
  const countryMap = buildCountryMap(context.countries);
  const rejections: QuestionGenerationRejection[] = [];
  const prompts: QuizKnowledgePrompt<TFeature>[] = [];
  const membershipsByRegion = new Map<StableId, RegionMembership[]>();

  for (const membership of memberships) {
    const group = membershipsByRegion.get(membership.regionId) ?? [];
    group.push(membership);
    membershipsByRegion.set(membership.regionId, group);
  }

  for (const region of [...regions].sort(compareById)) {
    if (!region.completeMembership) {
      rejections.push(reject("region-membership", region.id, "incomplete-region-membership", region.notes));
      continue;
    }

    if (!region.name.trim() || !hasResolvableSources(region)) {
      rejections.push(reject("region-membership", region.id, "missing-region-source-or-name"));
      continue;
    }

    const regionMemberships = (membershipsByRegion.get(region.id) ?? []).sort(compareById);
    if (regionMemberships.length === 0) {
      rejections.push(reject("region-membership", region.id, "missing-region-memberships"));
      continue;
    }

    const resolved = resolveCountryCodes(
      regionMemberships.map((membership) => membership.isoAlpha2),
      countryMap
    );
    if (!resolved.ok) {
      rejections.push(reject("region-membership", region.id, resolved.reason, resolved.details));
      continue;
    }

    const source = getPromptSource(region.sourceIds);
    if (!source) {
      rejections.push(reject("region-membership", region.id, "missing-prompt-source"));
      continue;
    }

    const template = chooseTemplate(REGION_TEMPLATES, context.seed, region.id);
    prompts.push({
      id: buildPromptId("region-membership", region.id, resolved.codes),
      kind: "knowledge",
      question: template.text({ regionName: region.name }),
      countries: resolved.countries,
      explanation: `${formatCountryNames(resolved.countries)} are accepted members of ${region.name} in this complete bundled region record.`,
      source,
      metadata: {
        topic: "region-membership",
        transformation: `Group RegionMembership records for ${region.id}, require completeMembership=true, sort accepted ISO alpha-2 codes, and require every accepted country to resolve against the globe dataset.`,
        coverage: "Complete membership for this bundled region record only.",
        sourceIds: region.sourceIds,
        recordIds: [region.id, ...regionMemberships.map((membership) => membership.id)],
        templateId: template.id
      }
    });
  }

  return { prompts, rejections };
}

export function generateHemisphereQuestions<TFeature>(
  context: GeographicQuestionContext<TFeature>
): QuestionGenerationResult<TFeature> {
  const countryMap = buildCountryMap(context.countries);
  const rejections: QuestionGenerationRejection[] = [];
  const prompts: QuizKnowledgePrompt<TFeature>[] = [];
  const sourceIds = ["natural-earth-admin-0-countries-50m"];
  const source = getPromptSource(sourceIds);

  if (!source) {
    return {
      prompts: [],
      rejections: [reject("hemisphere", "hemisphere:representative-points", "missing-prompt-source")]
    };
  }

  for (const spec of HEMISPHERE_SPECS) {
    const answerCodes = context.countries
      .filter((country) => {
        if (spec.axis === "latitude") {
          return spec.side === "north" ? country.lat > 0 : country.lat < 0;
        }
        return spec.side === "east" ? country.lng > 0 : country.lng < 0;
      })
      .map((country) => country.isoAlpha2);

    const resolved = resolveCountryCodes(answerCodes, countryMap);
    if (!resolved.ok || resolved.countries.length === 0) {
      rejections.push(reject("hemisphere", spec.id, resolved.ok ? "empty-hemisphere-answer-set" : resolved.reason, resolved.ok ? undefined : resolved.details));
      continue;
    }

    const template = chooseTemplate(
      spec.axis === "latitude" ? HEMISPHERE_TEMPLATES : MERIDIAN_TEMPLATES,
      context.seed,
      spec.id
    );
    prompts.push({
      id: buildPromptId("hemisphere", spec.id, resolved.codes),
      kind: "knowledge",
      question: template.text(
        spec.axis === "latitude"
          ? { hemisphereLabel: spec.label }
          : { meridianLabel: spec.label }
      ),
      countries: resolved.countries,
      explanation: `${resolved.countries.length} countries have representative points matching this ${spec.axis} test in the current globe dataset.`,
      source,
      metadata: {
        topic: "hemisphere",
        transformation: `Filter QuizCountry representative coordinates from the bundled country dataset using ${spec.axis === "latitude" ? "latitude" : "longitude"} ${spec.side === "north" || spec.side === "east" ? "> 0" : "< 0"}. This does not test full territorial extent.`,
        coverage: "Derived from the current globe dataset's representative country points, not full country geometry.",
        sourceIds,
        recordIds: [spec.id],
        templateId: template.id
      }
    });
  }

  return { prompts, rejections };
}

function getRankedMeasurements(
  measurements: readonly CountryMeasurement[],
  spec: RankingQuestionSpec
): CountryMeasurement[] {
  return measurements
    .filter((measurement) =>
      measurement.indicator.code === spec.indicatorCode &&
      measurement.sourceIds.some((sourceId) => spec.sourceIds.includes(sourceId))
    )
    .sort((left, right) => {
      const valueComparison =
        spec.direction === "descending"
          ? right.value - left.value
          : left.value - right.value;
      return valueComparison || left.isoAlpha2.localeCompare(right.isoAlpha2);
    });
}

export function generateCountryRankingQuestions<TFeature>(
  context: GeographicQuestionContext<TFeature>,
  measurements: readonly CountryMeasurement[] = COUNTRY_MEASUREMENTS,
  rankingSpecs: readonly RankingQuestionSpec[] = COUNTRY_RANKING_SPECS
): QuestionGenerationResult<TFeature> {
  const countryMap = buildCountryMap(context.countries);
  const rejections: QuestionGenerationRejection[] = [];
  const prompts: QuizKnowledgePrompt<TFeature>[] = [];

  for (const spec of [...rankingSpecs].sort(compareById)) {
    if (!Number.isInteger(spec.rank) || spec.rank < 1 || !hasResolvableSources(spec)) {
      rejections.push(reject("country-ranking", spec.id, "invalid-ranking-spec"));
      continue;
    }

    const rankedMeasurements = getRankedMeasurements(measurements, spec);
    if (rankedMeasurements.length === 0) {
      rejections.push(reject("country-ranking", spec.id, "missing-measurements-for-ranking"));
      continue;
    }

    const seenCodes = new Set<string>();
    let invalidMeasurement: CountryMeasurement | null = null;
    let duplicateCode: string | null = null;
    for (const measurement of rankedMeasurements) {
      const normalizedCode = normalizeIsoAlpha2(measurement.isoAlpha2);
      if (
        !normalizedCode ||
        !Number.isFinite(measurement.value) ||
        !measurement.indicator.code.trim() ||
        !measurement.indicator.label.trim() ||
        !Number.isInteger(measurement.observationYear) ||
        !hasResolvableSources(measurement)
      ) {
        invalidMeasurement = measurement;
        break;
      }
      if (seenCodes.has(normalizedCode)) {
        duplicateCode = normalizedCode;
        break;
      }
      seenCodes.add(normalizedCode);
    }

    if (invalidMeasurement) {
      rejections.push(reject("country-ranking", spec.id, "invalid-country-measurement", invalidMeasurement.id));
      continue;
    }

    if (duplicateCode) {
      rejections.push(reject("country-ranking", spec.id, "duplicate-measurement-country-code", duplicateCode));
      continue;
    }

    const targetIndex = spec.rank - 1;
    const targetMeasurement = rankedMeasurements[targetIndex];
    if (!targetMeasurement) {
      rejections.push(reject("country-ranking", spec.id, "rank-out-of-range"));
      continue;
    }

    const targetValue = targetMeasurement.value;
    const tieStartIndex = rankedMeasurements.findIndex((measurement) => measurement.value === targetValue);
    if (tieStartIndex !== targetIndex) {
      rejections.push(reject("country-ranking", spec.id, "rank-falls-inside-existing-tie"));
      continue;
    }

    const answerCodes = rankedMeasurements
      .filter((measurement) => measurement.value === targetValue)
      .map((measurement) => measurement.isoAlpha2);
    const resolved = resolveCountryCodes(answerCodes, countryMap);
    if (!resolved.ok) {
      rejections.push(reject("country-ranking", spec.id, resolved.reason, resolved.details));
      continue;
    }

    const source = getPromptSource(spec.sourceIds);
    if (!source) {
      rejections.push(reject("country-ranking", spec.id, "missing-prompt-source"));
      continue;
    }

    const ordinal = formatOrdinal(spec.rank);
    const sizeLabel = spec.direction === "descending" ? "largest" : "smallest";
    const directionLabel = spec.direction === "descending" ? "highest to lowest" : "lowest to highest";
    const indicator = targetMeasurement.indicator;
    const year = targetMeasurement.observationYear;
    const template = chooseTemplate(RANKING_TEMPLATES, context.seed, spec.id);
    const countryNames = formatCountryNames(resolved.countries);
    const rankVerb = resolved.countries.length > 1 ? "share" : "ranks";

    prompts.push({
      id: buildPromptId("country-ranking", spec.id, resolved.codes),
      kind: "knowledge",
      question: template.text({
        ordinal,
        sizeLabel,
        questionNoun: spec.questionNoun,
        year
      }),
      countries: resolved.countries,
      explanation: `${countryNames} ${rankVerb} ${ordinal} after sorting ${indicator.label} for ${year} ${directionLabel} (${formatRankingValue(targetValue, targetMeasurement.unit)}).`,
      source,
      metadata: {
        topic: "country-ranking",
        year,
        indicator,
        transformation: `Filter CountryMeasurement records for ${indicator.code}, sort ${directionLabel} with ISO alpha-2 as a deterministic tie-breaker, select rank ${spec.rank}, and accept every country tied at the selected source value.`,
        coverage: "Bundled representative source slice documented in the dataset manifest; non-country aggregates are excluded before ranking.",
        sourceIds: spec.sourceIds,
        recordIds: [spec.id, ...rankedMeasurements.map((measurement) => measurement.id)],
        templateId: template.id
      }
    });
  }

  return { prompts, rejections };
}

export function generateGeographicKnowledgeQuestions<TFeature>(
  context: GeographicQuestionContext<TFeature>
): QuestionGenerationResult<TFeature> {
  return mergeResults([
    generateFeatureCountryQuestions(context),
    generateCapitalCountryQuestions(context),
    generateBorderIntersectionQuestions(context),
    generateLandlockedQuestions(context),
    generateRegionMembershipQuestions(context),
    generateHemisphereQuestions(context),
    generateCountryRankingQuestions(context)
  ]);
}
