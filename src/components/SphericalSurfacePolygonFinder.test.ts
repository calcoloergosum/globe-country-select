import { describe, expect, it } from "vitest";

import type { CountryFeature, CountryPolygonCoordinates } from "./globeTypes";
import { SphericalSurfacePolygonFinder } from "./SphericalSurfacePolygonFinder";

function makePolygonCountry(name: string, coordinates: CountryPolygonCoordinates): CountryFeature {
  return {
    type: "Feature",
    properties: {
      ADMIN: name,
      ISO_A2: name.slice(0, 2).toUpperCase()
    },
    geometry: {
      type: "Polygon",
      coordinates
    }
  };
}

describe("SphericalSurfacePolygonFinder", () => {
  it("returns null for non-finite coordinates", () => {
    const country = makePolygonCountry("finite", [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0]
      ]
    ]);

    const finder = new SphericalSurfacePolygonFinder([country]);

    expect(finder.findCountryAtLatLng(Number.NaN, 0)).toBeNull();
    expect(finder.findCountryAtLatLng(0, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("uses nearby probing to recover hit-tests near polygon edges", () => {
    const country = makePolygonCountry("nearby", [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0]
      ]
    ]);

    const finder = new SphericalSurfacePolygonFinder([country]);

    // Slightly outside the eastern edge so exact lookup misses and nearby probes decide.
    expect(finder.findCountryAtLatLng(0.5, 1.005)).toBe(country);
  });

  it("returns null for the same outside point when proximity probing is disabled", () => {
    const country = makePolygonCountry("nearby", [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0]
      ]
    ]);

    const finder = new SphericalSurfacePolygonFinder([country], { enableProximity: false });

    expect(finder.findCountryAtLatLng(0.5, 1.005)).toBeNull();
  });

  it("treats ring boundaries as inside and excludes polygon holes", () => {
    const country = makePolygonCountry("holey", [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0]
      ],
      [
        [1, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 1]
      ]
    ]);

    const finder = new SphericalSurfacePolygonFinder([country]);

    expect(finder.findCountryAtLatLng(0, 2)).toBe(country);
    expect(finder.findCountryAtLatLng(2, 2)).toBeNull();
    expect(finder.findCountryAtLatLng(0.5, 0.5)).toBe(country);
  });

  it("handles antimeridian-crossing polygons using spherical containment", () => {
    const country = makePolygonCountry("dateline", [
      [
        [170, -10],
        [-170, -10],
        [-170, 10],
        [170, 10],
        [170, -10]
      ]
    ]);

    const finder = new SphericalSurfacePolygonFinder([country]);

    expect(finder.findCountryAtLatLng(0, 179)).toBe(country);
    expect(finder.findCountryAtLatLng(0, -179)).toBe(country);
    expect(finder.findCountryAtLatLng(0, 0)).toBeNull();
  });
});
