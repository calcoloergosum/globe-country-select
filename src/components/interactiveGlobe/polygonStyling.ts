// Interactive polygon styling rules for pinned, selected, and hovered countries.
import type { MutableRefObject } from "react";
import Globe from "../Globe";
import type { CountryFeature } from "../globeTypes";
import { getFeatureIso2 } from "../../utils/countryData";

type PolygonStyleRefs = {
  pinnedIsoRef: MutableRefObject<string | undefined>;
  selectedCountryRef: MutableRefObject<CountryFeature | null>;
  highlightOnHoverRef: MutableRefObject<boolean>;
  getHoveredCountry: () => CountryFeature | null;
};

export const BASE_POLYGON_ALTITUDE = 0.0002;
export const ACTIVE_POLYGON_ALTITUDE = 0.0003;
const BASE_POLYGON_CAP_COLOR = "rgba(0, 0, 0, 0)";
const BASE_POLYGON_SIDE_COLOR = "rgba(0, 0, 0, 0)";
const BASE_POLYGON_STROKE_COLOR = "rgba(0, 0, 0, 0)";
const SELECTED_POLYGON_CAP_COLOR = "rgba(231, 76, 60, 0.95)";
const SELECTED_POLYGON_SIDE_COLOR = "rgba(192, 57, 43, 0.26)";
const SELECTED_POLYGON_STROKE_COLOR = "rgba(120, 18, 13, 0.9)";
const HOVERED_POLYGON_CAP_COLOR = "rgba(169, 222, 255, 0.95)";
const HOVERED_POLYGON_SIDE_COLOR = "rgba(86, 165, 221, 0.22)";
const HOVERED_POLYGON_STROKE_COLOR = "rgba(14, 42, 66, 0.85)";
const PINNED_POLYGON_CAP_COLOR = "rgba(255, 200, 0, 0.92)";
const PINNED_POLYGON_SIDE_COLOR = "rgba(220, 160, 0, 0.3)";
const PINNED_POLYGON_STROKE_COLOR = "rgba(160, 100, 0, 0.9)";

export function createPolygonStyleApplicator(globe: Globe, refs: PolygonStyleRefs) {
  return () => {
    const hoveredCountry = refs.getHoveredCountry();

    globe
      .polygonAltitude((feature) => {
        if (refs.pinnedIsoRef.current && getFeatureIso2(feature) === refs.pinnedIsoRef.current) {
          return ACTIVE_POLYGON_ALTITUDE;
        }

        if (refs.selectedCountryRef.current && feature === refs.selectedCountryRef.current) {
          return ACTIVE_POLYGON_ALTITUDE;
        }

        if (refs.highlightOnHoverRef.current && hoveredCountry && feature === hoveredCountry) {
          return ACTIVE_POLYGON_ALTITUDE;
        }

        return BASE_POLYGON_ALTITUDE;
      })
      .polygonCapColor((feature) => {
        if (refs.pinnedIsoRef.current && getFeatureIso2(feature) === refs.pinnedIsoRef.current) {
          return PINNED_POLYGON_CAP_COLOR;
        }

        if (refs.selectedCountryRef.current && feature === refs.selectedCountryRef.current) {
          return SELECTED_POLYGON_CAP_COLOR;
        }

        if (refs.highlightOnHoverRef.current && hoveredCountry && feature === hoveredCountry) {
          return HOVERED_POLYGON_CAP_COLOR;
        }

        return BASE_POLYGON_CAP_COLOR;
      })
      .polygonSideColor((feature) => {
        if (refs.pinnedIsoRef.current && getFeatureIso2(feature) === refs.pinnedIsoRef.current) {
          return PINNED_POLYGON_SIDE_COLOR;
        }

        if (refs.selectedCountryRef.current && feature === refs.selectedCountryRef.current) {
          return SELECTED_POLYGON_SIDE_COLOR;
        }

        if (refs.highlightOnHoverRef.current && hoveredCountry && feature === hoveredCountry) {
          return HOVERED_POLYGON_SIDE_COLOR;
        }

        return BASE_POLYGON_SIDE_COLOR;
      })
      .polygonStrokeColor((feature) => {
        if (refs.pinnedIsoRef.current && getFeatureIso2(feature) === refs.pinnedIsoRef.current) {
          return PINNED_POLYGON_STROKE_COLOR;
        }

        if (refs.selectedCountryRef.current && feature === refs.selectedCountryRef.current) {
          return SELECTED_POLYGON_STROKE_COLOR;
        }

        if (refs.highlightOnHoverRef.current && hoveredCountry && feature === hoveredCountry) {
          return HOVERED_POLYGON_STROKE_COLOR;
        }

        return BASE_POLYGON_STROKE_COLOR;
      });
  };
}
