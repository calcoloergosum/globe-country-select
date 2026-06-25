# Globe Country Select

An interactive globe for country selection and source-grounded world-knowledge questions.

The app now supports both flag identification and a first source-grounded world-facts dataset. The world-facts slice demonstrates place-to-country lookup and ranked country indicators while preserving the same globe-picking interaction.

The longer-term goal is to make the globe a way to experience the scale and diversity of the world through questions backed by explicit, coherent data sources.

## Current scope

The app currently has two top-level modes:

- **Explore**: rotate the globe, hover countries, and click countries.
- **Quiz**: answer questions from **Mixed**, **Flags**, or **World facts** question sets.

The quiz currently includes:

- rendered-flag identification, including shared-flag ambiguity
- “In which country is Lake Biwa?” from a curated place record
- “Which country had the 2nd largest population in 2024?” generated from a ranked World Bank indicator extract

It currently exercises:

- country picking on a 3D globe
- hover and click interaction
- strict answer selection in quiz mode
- shared-flag ambiguity, where multiple countries may be valid for the same rendered flag
- stable prompt identity and accepted ISO alpha-2 answer sets
- source, indicator, year, coverage, and transformation metadata for world-facts prompts
- answer reveal and globe focus behavior
- responsive desktop/mobile layout

## Long-term direction

The larger goal is to support a broad range of source-grounded world-knowledge questions generated from explicit data rather than embedded as opaque trivia. Examples:

- “Which country has the 4th largest population in the world?”
- “Which country has the 2nd largest wealth gap?”
- “Pick any country in Northeast Asia that had a civil war in 1950.”

The precise meaning of a question should come from its source and metadata. For example, “wealth gap” should eventually be represented by a specific indicator such as Gini coefficient, income share, wealth share, or another clearly defined inequality measure.

## Data philosophy

Questions should be traceable. A world-facts prompt carries enough metadata to explain itself:

- source name
- source URL or citation
- indicator or event category
- year or date range
- transformation rule, such as ranking, filtering, or grouping
- coverage note
- accepted country answers

Current source families:

- Lake Biwa Museum place facts
- World Bank indicator `SP.POP.TOTL` (`Population, total`)

Future source families may include:

- additional World Bank indicators
- United Nations datasets
- curated historical event datasets
- other coherent country-level reference datasets

The seed definitions live in `src/data/knowledgeQuestions.ts`. `src/utils/buildKnowledgePrompts.ts` resolves their ISO country answers against the globe data and performs ranking transformations. The population question is fixed to the 2024 observation year; its bundled extract contains the five highest country values needed to reproduce the implemented rank.

## Picking behavior

The globe supports two country-picking behaviors:

- **Explore mode** uses proximity-assisted picking by default, making near-border interaction more forgiving.
- **Quiz mode** uses strict picking, so a selected answer must be inside the country polygon.

This distinction is intentional: exploration should feel forgiving, while quiz answers should be precise.

## Rendering notes

The globe is rendered as a mesh sphere. Close zoom keeps the camera outside a safe surface clearance so the near plane does not clip the earth mesh or elevated country overlays.

## Shared flags

Some countries or territories share the same rendered flag image.

The quiz groups countries by their rendered flag. When a flag has multiple valid countries, any grouped country is accepted as correct.

For incorrect or revealed answers, the app highlights one valid country on the globe.

## Run locally

Use Node.js `20.19.0` or later.

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev           # start Vite dev server
npm run build         # type-check and production build
npm run preview       # preview production build
npm run check         # TypeScript checks only
npm run test          # run automated tests once
npm run test:watch    # watch mode for local development
npm run test:coverage # run tests with coverage
npm run quality:gate  # type-check and coverage gate
```

## Quality gates

The project uses:

- TypeScript strict mode
- Vitest unit tests
- coverage thresholds
- GitHub Actions CI

CI runs:

```bash
npm ci
npm run check
npm run test:coverage
npm run build
```

## Main component

Main component:

```text
src/components/InteractiveGlobe.tsx
```

Common props:

| Prop | Purpose |
| --- | --- |
| `countries` | Country GeoJSON features used for rendering and picking |
| `globeImageUrl` | Earth texture image |
| `bumpImageUrl` | Optional bump texture image |
| `highlightOnHover` | Enables hover highlighting |
| `pinnedCountryIsoA2` | Pins/highlights a country by ISO alpha-2 code |
| `clearSelectionSignal` | Clears local selected-country state when the value changes |
| `focusLatLng` | Rotates/focuses the globe toward a latitude/longitude |
| `focusCountry` | Country feature used to compute focus zoom distance |
| `enableProximityPicking` | Enables forgiving near-border picking |
| `onPointHover` | Called when hover target changes |
| `onPointClick` | Called when click target changes |

Example:

```tsx
<InteractiveGlobe
  countries={countries}
  globeImageUrl={globeImageUrl}
  highlightOnHover
  enableProximityPicking
  onPointHover={(point) => console.log("hover", point)}
  onPointClick={(point) => console.log("click", point)}
/>
```

## Event payload

Hover and click callbacks receive either `null` or a country payload:

```ts
type GlobeEventData = {
  lat: number;
  lng: number;
  label: string;
  isoAlpha2?: string;
};
```

## Notes

This project is currently an app, not a packaged component library. The component API is documented to clarify internal boundaries, but package distribution is not yet a goal.
