# Globe Country Select

An interactive globe for country selection and source-grounded world-knowledge questions.

The current version focuses on a flag-identification quiz. Flags are used as the first complete dataset because they cover many countries, expose ambiguity such as shared flags, and exercise the core country-picking interaction.

The longer-term goal is to make the globe a way to experience the scale and diversity of the world through questions backed by explicit, coherent data sources.

## Current scope

The app currently has two modes:

- **Explore**: rotate the globe, hover countries, and click countries.
- **Flag quiz**: identify a country from a displayed flag.

The flag quiz is the first complete vertical slice, not the final product direction.

It currently exercises:

- country picking on a 3D globe
- hover and click interaction
- strict answer selection in quiz mode
- shared-flag ambiguity, where multiple countries may be valid for the same rendered flag
- answer reveal and globe focus behavior
- responsive desktop/mobile layout

## Long-term direction

The larger goal is to support source-grounded world-knowledge questions.

Future question types should be generated from explicit data sources rather than embedded as opaque trivia. Examples:

- “Which country has the 4th largest population in the world?”
- “Which country has the 2nd largest wealth gap?”
- “Pick any country in Northeast Asia that had a civil war in 1950.”

The precise meaning of a question should come from its source and metadata. For example, “wealth gap” should eventually be represented by a specific indicator such as Gini coefficient, income share, wealth share, or another clearly defined inequality measure.

## Data philosophy

Questions should be traceable.

A future question should carry enough metadata to explain itself:

- source name
- source URL or citation
- indicator or event category
- year or date range
- transformation rule, such as ranking, filtering, or grouping
- accepted country answers

Example future source families:

- World Bank indicators
- United Nations datasets
- curated historical event datasets
- other coherent country-level reference datasets

This repository does not yet implement that data layer. The current flag quiz is the first interaction-complete feature.

## Picking behavior

The globe supports two country-picking behaviors:

- **Explore mode** uses proximity-assisted picking by default, making near-border interaction more forgiving.
- **Quiz mode** uses strict picking, so a selected answer must be inside the country polygon.

This distinction is intentional: exploration should feel forgiving, while quiz answers should be precise.

## Shared flags

Some countries or territories share the same rendered flag image.

The quiz groups countries by their rendered flag. When a flag has multiple valid countries, any grouped country is accepted as correct.

For incorrect or revealed answers, the app highlights one valid country on the globe.

## Run locally

Use Node.js `20.19.0` or later.

```bash
npm install
npm run dev
