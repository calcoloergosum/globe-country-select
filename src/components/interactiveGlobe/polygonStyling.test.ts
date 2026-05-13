import { describe, expect, it, vi } from "vitest";

import type Globe from "../Globe";
import type { CountryFeature } from "../globeTypes";
import { createPolygonStyleApplicator } from "./polygonStyling";

function makeCountry(isoAlpha2: string): CountryFeature {
  return {
    type: "Feature",
    properties: {
      ADMIN: isoAlpha2,
      ISO_A2: isoAlpha2
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]]
    }
  };
}

function createGlobeMock() {
  const accessors: {
    altitude?: (feature: CountryFeature) => number;
    cap?: (feature: CountryFeature) => string;
    side?: (feature: CountryFeature) => string;
    stroke?: (feature: CountryFeature) => string;
  } = {};

  const globe = {
    polygonAltitude: vi.fn((value: (feature: CountryFeature) => number) => {
      accessors.altitude = value;
      return globe;
    }),
    polygonCapColor: vi.fn((value: (feature: CountryFeature) => string) => {
      accessors.cap = value;
      return globe;
    }),
    polygonSideColor: vi.fn((value: (feature: CountryFeature) => string) => {
      accessors.side = value;
      return globe;
    }),
    polygonStrokeColor: vi.fn((value: (feature: CountryFeature) => string) => {
      accessors.stroke = value;
      return globe;
    })
  } as unknown as Globe;

  return {
    globe,
    accessors
  };
}

describe("createPolygonStyleApplicator", () => {
  it("prioritizes pinned styles over selected and hovered states", () => {
    const { globe, accessors } = createGlobeMock();
    const selectedCountry = makeCountry("US");
    const pinnedCountry = makeCountry("FR");

    const apply = createPolygonStyleApplicator(globe, {
      pinnedIsoRef: { current: "FR" },
      selectedCountryRef: { current: selectedCountry },
      highlightOnHoverRef: { current: true },
      getHoveredCountry: () => selectedCountry
    });

    apply();

    expect(accessors.altitude).toBeTypeOf("function");
    expect(accessors.cap).toBeTypeOf("function");
    expect(accessors.side).toBeTypeOf("function");
    expect(accessors.stroke).toBeTypeOf("function");

    expect(accessors.altitude?.(pinnedCountry)).toBe(0.0003);
    expect(accessors.cap?.(pinnedCountry)).toBe("rgba(255, 200, 0, 0.92)");

    expect(accessors.altitude?.(selectedCountry)).toBe(0.0003);
    expect(accessors.cap?.(selectedCountry)).toBe("rgba(231, 76, 60, 0.95)");
    expect(accessors.side?.(selectedCountry)).toBe("rgba(192, 57, 43, 0.26)");
    expect(accessors.stroke?.(selectedCountry)).toBe("rgba(120, 18, 13, 0.9)");
  });

  it("disables hover styling when highlightOnHover is false", () => {
    const { globe, accessors } = createGlobeMock();
    const hoveredCountry = makeCountry("DE");

    const apply = createPolygonStyleApplicator(globe, {
      pinnedIsoRef: { current: undefined },
      selectedCountryRef: { current: null },
      highlightOnHoverRef: { current: false },
      getHoveredCountry: () => hoveredCountry
    });

    apply();

    expect(accessors.altitude?.(hoveredCountry)).toBe(0.0002);
    expect(accessors.cap?.(hoveredCountry)).toBe("rgba(0, 0, 0, 0)");
    expect(accessors.side?.(hoveredCountry)).toBe("rgba(0, 0, 0, 0)");
    expect(accessors.stroke?.(hoveredCountry)).toBe("rgba(0, 0, 0, 0)");
  });
});