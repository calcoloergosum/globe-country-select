import { describe, expect, it } from "vitest";

import type { CountryFeature } from "../globeTypes";
import { extractCountryPolygons, latLngToUnitVector, normalizeRing } from "./geo";

function makePolygonFeature(coordinates: number[][][]): CountryFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates
    }
  };
}

function makeMultiPolygonFeature(coordinates: number[][][][]): CountryFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiPolygon",
      coordinates
    }
  };
}

describe("extractCountryPolygons", () => {
  it("wraps non-empty Polygon coordinates as a single polygon", () => {
    const polygon = [[[0, 0], [1, 0], [1, 1], [0, 0]]];
    const country = makePolygonFeature(polygon);

    expect(extractCountryPolygons(country)).toEqual([polygon]);
  });

  it("returns an empty list for Polygon geometry with no rings", () => {
    const country = makePolygonFeature([]);

    expect(extractCountryPolygons(country)).toEqual([]);
  });

  it("returns MultiPolygon coordinates unchanged", () => {
    const multiPolygon = [
      [[[0, 0], [1, 0], [1, 1], [0, 0]]],
      [[[10, 10], [11, 10], [11, 11], [10, 10]]]
    ];
    const country = makeMultiPolygonFeature(multiPolygon);

    expect(extractCountryPolygons(country)).toEqual(multiPolygon);
  });
});

describe("normalizeRing", () => {
  it("removes consecutive duplicate points and trailing closure duplicate", () => {
    const ring = [
      [0, 0],
      [0, 0],
      [1, 0],
      [1, 0],
      [2, 0],
      [0, 0]
    ] as [number, number][];

    expect(normalizeRing(ring)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0]
    ]);
  });

  it("keeps non-consecutive duplicate points", () => {
    const ring = [
      [0, 0],
      [1, 1],
      [0, 0],
      [2, 2]
    ] as [number, number][];

    expect(normalizeRing(ring)).toEqual(ring);
  });
});

describe("latLngToUnitVector", () => {
  it("maps well-known coordinates to expected unit directions", () => {
    const primeMeridian = latLngToUnitVector(0, 0);
    const east90 = latLngToUnitVector(0, 90);
    const northPole = latLngToUnitVector(90, 0);

    expect(primeMeridian.x).toBeCloseTo(0, 12);
    expect(primeMeridian.y).toBeCloseTo(0, 12);
    expect(primeMeridian.z).toBeCloseTo(1, 12);

    expect(east90.x).toBeCloseTo(1, 12);
    expect(east90.y).toBeCloseTo(0, 12);
    expect(east90.z).toBeCloseTo(0, 12);

    expect(northPole.x).toBeCloseTo(0, 12);
    expect(northPole.y).toBeCloseTo(1, 12);
    expect(northPole.z).toBeCloseTo(0, 12);
  });

  it("always returns a normalized vector", () => {
    const vector = latLngToUnitVector(23.5, 134.2);

    expect(vector.length()).toBeCloseTo(1, 12);
  });
});