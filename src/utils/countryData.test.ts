import { describe, expect, it } from "vitest";

import {
  getCountryLabel,
  getCountryLatLng,
  getFeatureIso2,
  parseCountriesGeoJsonRaw
} from "./countryData";

describe("parseCountriesGeoJsonRaw", () => {
  it("returns an empty list for invalid JSON", () => {
    expect(parseCountriesGeoJsonRaw("not-json")).toEqual([]);
  });

  it("parses valid features and sanitizes coordinates", () => {
    const raw = JSON.stringify({
      features: [
        {
          type: "Feature",
          properties: {
            ADMIN: "United States",
            ISO_A2: "us"
          },
          geometry: {
            type: "Polygon",
            coordinates: [[[190, 95], [-190, -95], [0, 0]]]
          },
          bbox: [-10, -20, 30, 40]
        },
        {
          type: "Feature",
          properties: {
            ADMIN: "Invalid"
          },
          geometry: {
            type: "Unknown",
            coordinates: []
          }
        }
      ]
    });

    const result = parseCountriesGeoJsonRaw(raw);

    expect(result).toHaveLength(1);
    expect(result[0].geometry).toEqual({
      type: "Polygon",
      coordinates: [[[-170, 90], [170, -90], [0, 0]]]
    });
    expect(result[0].bbox).toEqual([-10, -20, 30, 40]);
  });
});

describe("country metadata helpers", () => {
  it("extracts normalized ISO alpha-2 from candidates", () => {
    const [feature] = parseCountriesGeoJsonRaw(
      JSON.stringify({
        features: [
          {
            type: "Feature",
            properties: {
              ISO_A2: "-99",
              ISO_A2_EH: " gb "
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            }
          }
        ]
      })
    );

    expect(getFeatureIso2(feature)).toBe("GB");
  });

  it("builds a label and lat/lng fallback from bbox", () => {
    const [feature] = parseCountriesGeoJsonRaw(
      JSON.stringify({
        features: [
          {
            type: "Feature",
            properties: {
              ADMIN: "Exampleland",
              ISO_A2: "EX"
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            },
            bbox: [-20, 10, 40, 70]
          }
        ]
      })
    );

    expect(getCountryLabel(feature)).toBe("Exampleland (EX)");
    expect(getCountryLatLng(feature)).toEqual({ lat: 40, lng: 10 });
  });
});
