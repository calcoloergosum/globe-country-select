# Geographic Question Data Layer

The geographic knowledge quiz is built from normalized records first, then
question generators. Do not add one-off trivia prompts directly. Add or update
source records, then let the relevant generator produce quiz prompts.

## Current Shape

- Entity and relationship types live in `src/data/geography/types.ts`.
- Source manifests live in `src/data/geography/manifest.ts`.
- Static records live beside their domain:
  - `features.ts`: `GeographicFeature` and `FeatureCountryRelationship`
  - `settlements.ts`: capitals and other settlements
  - `regions.ts`: `Region` and `RegionMembership`
  - `adjacency.ts`: `CountryAdjacency` and border-intersection seeds
  - `countries.ts`: country-level geography facts such as landlocked status
  - `measurements.ts`: `CountryMeasurement` and explicit ranking specs
- Generators live in `src/data/geography/generators.ts`.
- The app adapter is `src/utils/buildKnowledgePrompts.ts`.

The application uses bundled static data only. External APIs may be used while
preparing a source snapshot, but generated app code must not depend on runtime
network calls.

## Add Another Dataset

1. Add a `DatasetManifest` in `manifest.ts` with:
   - `datasetName`
   - `source`
   - `citationUrl`
   - `license`
   - `version` or `observationYear`
   - `preprocessingNotes`
   - `geographicCoverage`
   - `knownLimitations`
2. Record the source license and terms URL in the notes when attribution,
   no-endorsement language, or third-party exceptions matter.
3. Add static records that reference the manifest by `sourceIds`.
4. Add validation tests that prove unresolved ISO country codes are rejected.
5. Keep preprocessing deterministic and document any filtering, aggregation, or
   manual curation.

## Add Another Entity Type

1. Define the record in `types.ts` with a stable `id`, normalized ISO country
   identifiers when country joins are needed, and `sourceIds`.
2. Prefer source-native stable IDs such as Wikidata QIDs when available.
3. Model relationships explicitly instead of hiding them inside prompt text.
4. Add representative records in a dedicated file under `src/data/geography`.
5. Add generator tests for invalid codes, missing sources, duplicate IDs, and
   any disputed or transboundary behavior.

## Add Another Question Template

1. Add the template to the relevant reusable template array in `generators.ts`.
2. Make the wording match the data semantics. For example, representative-point
   hemisphere prompts must not imply full territorial extent.
3. Keep accepted-answer behavior explicit. For transboundary records, either
   accept every supported country with plural/any-country wording, or reject the
   record from singular country questions.
4. Seeded generation must remain deterministic for the same `seed` and records.
5. Include the template ID in prompt metadata.

## Add Another Transformation

1. Implement the transformation in a generator or a small helper used by a
   generator.
2. Attach a plain-language `metadata.transformation` string to every prompt.
3. Reject unsafe inputs rather than silently dropping data:
   - unresolved ISO alpha-2 codes
   - missing source manifests
   - disputed records not supported by the wording
   - incomplete region memberships
   - ranking specs that cannot prove their rank or fall inside an existing tie
4. Add tests for deterministic order and stable prompt IDs.
5. If the transformation uses a partial slice, document the ranking universe or
   candidate universe in the manifest and prompt coverage.

## Disputes And Transboundary Records

Do not silently choose one country for a shared feature. A transboundary feature
must either:

- use wording such as "Pick any country that contains part of ...", with every
  supported country accepted, or
- be rejected from the relevant generator with a diagnostic.

Disputed boundaries, capitals, and regions should remain source-explicit. Add
records and rejection tests before enabling quiz prompts for them.
