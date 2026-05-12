import * as THREE from "three";
import { describe, expect, it } from "vitest";

import type { CountryFeature } from "../globeTypes";
import { pickFillColor, resolveColorAccessor, resolveNumericAccessor } from "./styles";

function makeCountry(admin: string, iso = "TT"): CountryFeature {
  return {
    type: "Feature",
    properties: {
      ADMIN: admin,
      ISO_A2: iso
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]]
    }
  };
}

describe("pickFillColor", () => {
  it("returns the primary style when primary opacity is greater than zero", () => {
    const primary = { color: new THREE.Color("#123456"), opacity: 0.25 };
    const fallback = { color: new THREE.Color("#abcdef"), opacity: 1 };

    expect(pickFillColor(primary, fallback)).toBe(primary);
  });

  it("returns fallback style when primary opacity is zero", () => {
    const primary = { color: new THREE.Color("#123456"), opacity: 0 };
    const fallback = { color: new THREE.Color("#abcdef"), opacity: 1 };

    expect(pickFillColor(primary, fallback)).toBe(fallback);
  });
});

describe("resolveNumericAccessor", () => {
  it("returns literal numeric values unchanged", () => {
    const country = makeCountry("Literalland");

    expect(resolveNumericAccessor(12, country)).toBe(12);
  });

  it("invokes function accessors with the provided country", () => {
    const country = makeCountry("Callbackia", "CB");

    const value = resolveNumericAccessor((feature) => {
      return feature.properties.ISO_A2 === "CB" ? 42 : 0;
    }, country);

    expect(value).toBe(42);
  });
});

describe("resolveColorAccessor", () => {
  it("parses string accessors as rgba and preserves alpha", () => {
    const country = makeCountry("Colorland");
    const style = resolveColorAccessor("rgba(255, 128, 0, 0.4)", country);

    expect(style.opacity).toBeCloseTo(0.4, 12);
    expect(style.color.r).toBeCloseTo(1, 12);
    expect(style.color.g).toBeCloseTo(128 / 255, 12);
    expect(style.color.b).toBeCloseTo(0, 12);
  });

  it("parses function accessors and trims transparent values", () => {
    const country = makeCountry("Transparentia", "TR");
    const style = resolveColorAccessor((feature) => {
      return feature.properties.ISO_A2 === "TR" ? "  transparent  " : "#00ff00";
    }, country);

    expect(style.opacity).toBe(0);
    expect(style.color.getHex()).toBe(0xffffff);
  });

  it("defaults rgb colors to full opacity", () => {
    const country = makeCountry("Rgbia");
    const style = resolveColorAccessor("rgb(10, 20, 30)", country);

    expect(style.opacity).toBe(1);
    expect(style.color.r).toBeCloseTo(10 / 255, 12);
    expect(style.color.g).toBeCloseTo(20 / 255, 12);
    expect(style.color.b).toBeCloseTo(30 / 255, 12);
  });
});