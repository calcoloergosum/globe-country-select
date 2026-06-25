import { describe, expect, it } from "vitest";

import type { QuizCountry } from "../../utils/quizPrompts";
import {
  generateBorderIntersectionQuestions,
  generateCapitalCountryQuestions,
  generateFeatureCountryQuestions,
  generateHemisphereQuestions,
  generateLandlockedQuestions,
  generateRegionMembershipQuestions,
  generateCountryRankingQuestions
} from "./generators";
import type {
  BorderIntersectionSeed,
  Country,
  CountryAdjacency,
  CountryMeasurement,
  FeatureCountryRelationship,
  GeographicFeature,
  RankingQuestionSpec,
  Region,
  RegionMembership,
  Settlement
} from "./types";

function makeCountry(isoAlpha2: string, name = isoAlpha2, lat = 1, lng = 1): QuizCountry {
  return { feature: {}, isoAlpha2, lat, lng, name };
}

const wikidataSource = "wikidata-geographic-entities";
const naturalEarthSource = "natural-earth-admin-0-countries-50m";
const worldBankSource = "world-bank-population-total";

describe("geographic question generators", () => {
  it("generates feature-country prompts and rejects unsafe transboundary records", () => {
    const features: GeographicFeature[] = [
      {
        id: "feature:test-lake",
        name: "Test Lake",
        featureType: "lake",
        transboundary: false,
        answerStrategy: "single-country",
        sourceIds: [wikidataSource]
      },
      {
        id: "feature:test-river",
        name: "Test River",
        featureType: "river",
        transboundary: true,
        answerStrategy: "accept-all-supported-countries",
        sourceIds: [wikidataSource]
      },
      {
        id: "feature:unsafe-range",
        name: "Unsafe Range",
        featureType: "mountain",
        transboundary: true,
        answerStrategy: "single-country",
        sourceIds: [wikidataSource]
      },
      {
        id: "feature:excluded-desert",
        name: "Excluded Desert",
        featureType: "desert",
        transboundary: true,
        answerStrategy: "exclude-from-country-question",
        sourceIds: [wikidataSource]
      }
    ];
    const relationships: FeatureCountryRelationship[] = [
      { id: "rel:test-lake:AA", featureId: "feature:test-lake", isoAlpha2: "AA", relationshipType: "located_in", sourceIds: [wikidataSource] },
      { id: "rel:test-river:BB", featureId: "feature:test-river", isoAlpha2: "BB", relationshipType: "drains_through", sourceIds: [wikidataSource] },
      { id: "rel:test-river:CC", featureId: "feature:test-river", isoAlpha2: "CC", relationshipType: "drains_through", sourceIds: [wikidataSource] },
      { id: "rel:unsafe-range:BB", featureId: "feature:unsafe-range", isoAlpha2: "BB", relationshipType: "bordered_by", sourceIds: [wikidataSource] },
      { id: "rel:unsafe-range:CC", featureId: "feature:unsafe-range", isoAlpha2: "CC", relationshipType: "bordered_by", sourceIds: [wikidataSource] }
    ];

    const result = generateFeatureCountryQuestions(
      { countries: [makeCountry("AA"), makeCountry("BB"), makeCountry("CC")], seed: "fixed" },
      features,
      relationships
    );

    expect(result.prompts.map((prompt) => prompt.metadata.topic)).toEqual(["feature-country", "feature-country"]);
    expect(result.prompts[0].id).toBe("knowledge:feature-country:feature-test-lake:AA");
    expect(result.prompts[1].countries.map((country) => country.isoAlpha2)).toEqual(["BB", "CC"]);
    expect(result.prompts[1].question).toMatch(/transboundary|contains part/);
    expect(result.rejections.map((rejection) => rejection.reason)).toEqual([
      "excluded-by-feature-answer-strategy",
      "transboundary-feature-needs-all-country-policy"
    ]);
  });

  it("rejects unresolved country codes rather than silently dropping accepted answers", () => {
    const features: GeographicFeature[] = [{
      id: "feature:missing-country",
      name: "Missing Country Lake",
      featureType: "lake",
      transboundary: false,
      answerStrategy: "single-country",
      sourceIds: [wikidataSource]
    }];
    const relationships: FeatureCountryRelationship[] = [{
      id: "rel:missing-country:ZZ",
      featureId: "feature:missing-country",
      isoAlpha2: "ZZ",
      relationshipType: "located_in",
      sourceIds: [wikidataSource]
    }];

    const result = generateFeatureCountryQuestions({ countries: [makeCountry("AA")] }, features, relationships);

    expect(result.prompts).toEqual([]);
    expect(result.rejections).toMatchObject([{ reason: "unresolved-country-code", details: "ZZ" }]);
  });

  it("generates capital-country prompts and quarantines misleading capitals", () => {
    const settlements: Settlement[] = [
      {
        id: "settlement:capital",
        name: "Example Capital",
        isoAlpha2: "AA",
        settlementType: "capital",
        capitalOfIsoAlpha2: "AA",
        sourceIds: [wikidataSource]
      },
      {
        id: "settlement:seat-of-government",
        name: "Government Seat",
        isoAlpha2: "AA",
        settlementType: "administrative-capital",
        sourceIds: [wikidataSource]
      },
      {
        id: "settlement:disputed",
        name: "Disputed Capital",
        isoAlpha2: "BB",
        settlementType: "capital",
        capitalOfIsoAlpha2: ["BB", "CC"],
        disputedCapitalStatus: true,
        sourceIds: [wikidataSource]
      }
    ];

    const result = generateCapitalCountryQuestions(
      { countries: [makeCountry("AA"), makeCountry("BB"), makeCountry("CC")] },
      settlements
    );

    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0]).toMatchObject({
      id: "knowledge:capital-country:settlement-capital:AA",
      countries: [{ isoAlpha2: "AA" }],
      metadata: { topic: "capital-country" }
    });
    expect(result.rejections.map((rejection) => rejection.reason)).toEqual([
      "disputed-capital-status",
      "settlement-is-not-a-capital"
    ]);
  });

  it("derives border-intersection answers from normalized adjacency records", () => {
    const adjacencies: CountryAdjacency[] = [
      { id: "adj:AA:CC", isoAlpha2: "AA", adjacentIsoAlpha2: "CC", borderType: "land", sourceIds: [naturalEarthSource] },
      { id: "adj:BB:CC", isoAlpha2: "BB", adjacentIsoAlpha2: "CC", borderType: "land", sourceIds: [naturalEarthSource] },
      { id: "adj:AA:DD", isoAlpha2: "AA", adjacentIsoAlpha2: "DD", borderType: "land", sourceIds: [naturalEarthSource] },
      { id: "adj:BB:DD", isoAlpha2: "BB", adjacentIsoAlpha2: "DD", borderType: "land", sourceIds: [naturalEarthSource] },
      { id: "adj:AA:EE", isoAlpha2: "AA", adjacentIsoAlpha2: "EE", borderType: "land", disputed: true, sourceIds: [naturalEarthSource] }
    ];
    const seeds: BorderIntersectionSeed[] = [{
      id: "border-seed:AA:BB",
      anchorIsoAlpha2: ["AA", "BB"],
      sourceIds: [naturalEarthSource]
    }];

    const result = generateBorderIntersectionQuestions(
      { countries: ["AA", "BB", "CC", "DD", "EE"].map((code) => makeCountry(code, `Country ${code}`)) },
      adjacencies,
      seeds
    );

    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].countries.map((country) => country.isoAlpha2)).toEqual(["CC", "DD"]);
    expect(result.prompts[0].question).toContain("Country AA");
    expect(result.rejections).toMatchObject([{ reason: "disputed-adjacency-skipped" }]);
  });

  it("emits landlocked prompts only when every accepted country resolves", () => {
    const countries: Country[] = [
      { id: "country:AA", isoAlpha2: "AA", name: "Country AA", landlocked: true, sourceIds: [wikidataSource] },
      { id: "country:BB", isoAlpha2: "BB", name: "Country BB", landlocked: true, sourceIds: [wikidataSource] }
    ];

    const ok = generateLandlockedQuestions(
      { countries: [makeCountry("AA"), makeCountry("BB")] },
      countries
    );
    const missing = generateLandlockedQuestions({ countries: [makeCountry("AA")] }, countries);

    expect(ok.prompts[0].countries.map((country) => country.isoAlpha2)).toEqual(["AA", "BB"]);
    expect(ok.prompts[0].metadata.recordIds).toEqual(["country:AA", "country:BB"]);
    expect(missing.prompts).toEqual([]);
    expect(missing.rejections).toMatchObject([{ reason: "unresolved-country-code", details: "BB" }]);
  });

  it("requires complete region membership before generating region questions", () => {
    const regions: Region[] = [
      { id: "region:complete", name: "Complete Region", regionType: "cultural-region", completeMembership: true, sourceIds: [wikidataSource] },
      { id: "region:sample", name: "Sample Region", regionType: "continent", completeMembership: false, sourceIds: [wikidataSource] }
    ];
    const memberships: RegionMembership[] = [
      { id: "membership:complete:aa", regionId: "region:complete", isoAlpha2: " aa ", sourceIds: [wikidataSource] },
      { id: "membership:complete:bb", regionId: "region:complete", isoAlpha2: "bb", sourceIds: [wikidataSource] },
      { id: "membership:sample:cc", regionId: "region:sample", isoAlpha2: "CC", sourceIds: [wikidataSource] }
    ];

    const result = generateRegionMembershipQuestions(
      { countries: [makeCountry("AA"), makeCountry("BB"), makeCountry("CC")] },
      regions,
      memberships
    );

    expect(result.prompts[0].countries.map((country) => country.isoAlpha2)).toEqual(["AA", "BB"]);
    expect(result.prompts[0].question).toContain("Complete Region");
    expect(result.rejections).toMatchObject([{ recordId: "region:sample", reason: "incomplete-region-membership" }]);
  });

  it("derives hemisphere prompts from representative coordinates", () => {
    const result = generateHemisphereQuestions({
      countries: [
        makeCountry("AA", "North East", 10, 20),
        makeCountry("BB", "South West", -5, -30),
        makeCountry("CC", "On Axes", 0, 0)
      ]
    });

    expect(result.prompts).toHaveLength(4);
    expect(result.prompts.find((prompt) => prompt.id.includes("hemisphere-northern"))?.countries.map((country) => country.isoAlpha2)).toEqual(["AA"]);
    expect(result.prompts.find((prompt) => prompt.id.includes("hemisphere-southern"))?.countries.map((country) => country.isoAlpha2)).toEqual(["BB"]);
    expect(result.prompts[0].metadata.transformation).toContain("representative");
  });

  it("generates tie-aware country ranking prompts and rejects rank positions inside a tie", () => {
    const measurements: CountryMeasurement[] = [
      makeMeasurement("AA", 100),
      makeMeasurement("BB", 90),
      makeMeasurement("CC", 90),
      makeMeasurement("DD", 70)
    ];
    const specs: RankingQuestionSpec[] = [
      makeRankingSpec("rank-2", 2),
      makeRankingSpec("rank-3", 3)
    ];

    const result = generateCountryRankingQuestions(
      { countries: ["AA", "BB", "CC", "DD"].map((code) => makeCountry(code)) },
      measurements,
      specs
    );

    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].countries.map((country) => country.isoAlpha2)).toEqual(["BB", "CC"]);
    expect(result.prompts[0].explanation).toContain("share 2nd");
    expect(result.rejections).toMatchObject([{ recordId: "rank-3", reason: "rank-falls-inside-existing-tie" }]);
  });

  it("keeps seeded template generation deterministic", () => {
    const features: GeographicFeature[] = [{
      id: "feature:deterministic",
      name: "Deterministic Lake",
      featureType: "lake",
      transboundary: false,
      answerStrategy: "single-country",
      sourceIds: [wikidataSource]
    }];
    const relationships: FeatureCountryRelationship[] = [{
      id: "rel:deterministic:AA",
      featureId: "feature:deterministic",
      isoAlpha2: "AA",
      relationshipType: "located_in",
      sourceIds: [wikidataSource]
    }];

    const first = generateFeatureCountryQuestions({ countries: [makeCountry("AA")], seed: "same" }, features, relationships);
    const second = generateFeatureCountryQuestions({ countries: [makeCountry("AA")], seed: "same" }, features, relationships);

    expect(second.prompts).toEqual(first.prompts);
  });
});

function makeMeasurement(isoAlpha2: string, value: number): CountryMeasurement {
  return {
    id: `measurement:${isoAlpha2}`,
    isoAlpha2,
    indicator: { code: "TEST", label: "Test indicator" },
    measurementType: "other",
    value,
    unit: "units",
    observationYear: 2024,
    sourceIds: [worldBankSource]
  };
}

function makeRankingSpec(id: string, rank: number): RankingQuestionSpec {
  return {
    id,
    indicatorCode: "TEST",
    questionNoun: "test value",
    rank,
    direction: "descending",
    sourceIds: [worldBankSource]
  };
}
