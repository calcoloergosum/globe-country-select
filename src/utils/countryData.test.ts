import { describe, expect, it } from "vitest";

import {
  getCountryLabel,
  getCountryLatLng,
  getCountryName,
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

  it("parses valid MultiPolygon geometry and drops invalid coordinate entries", () => {
    const raw = JSON.stringify({
      features: [
        {
          type: "Feature",
          properties: {
            ADMIN: "Multi Test"
          },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [[181, 91], ["invalid", 0], [10, 20]],
                "not-a-ring"
              ],
              [
                [[-181, -91], [30, 40]]
              ],
              "not-a-polygon"
            ]
          }
        }
      ]
    });

    const result = parseCountriesGeoJsonRaw(raw);

    expect(result).toHaveLength(1);
    expect(result[0].geometry).toEqual({
      type: "MultiPolygon",
      coordinates: [
        [[[-179, 90], [10, 20]]],
        [[[179, -90], [30, 40]]]
      ]
    });
  });

  it("normalizes bbox and ignores malformed bbox values", () => {
    const raw = JSON.stringify({
      features: [
        {
          type: "Feature",
          properties: {
            ADMIN: "Trimmed Bbox"
          },
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [1, 1], [2, 2]]]
          },
          bbox: [1, 2, 3, 4, 999]
        },
        {
          type: "Feature",
          properties: {
            ADMIN: "Bad Bbox"
          },
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [1, 1], [2, 2]]]
          },
          bbox: [0, "NaN", 20, 30]
        }
      ]
    });

    const [trimmed, malformed] = parseCountriesGeoJsonRaw(raw);

    expect(trimmed.bbox).toEqual([1, 2, 3, 4]);
    expect(malformed.bbox).toBeUndefined();
    expect(getCountryLatLng(malformed)).toEqual({ lat: 0, lng: 0 });
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

  it("uses WB_A2 as a final ISO fallback and returns undefined when all candidates are invalid", () => {
    const [featureFromWb, featureWithoutIso] = parseCountriesGeoJsonRaw(
      JSON.stringify({
        features: [
          {
            type: "Feature",
            properties: {
              ISO_A2: "USA",
              ISO_A2_EH: "",
              WB_A2: " fr "
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            }
          },
          {
            type: "Feature",
            properties: {
              ISO_A2: "-99",
              ISO_A2_EH: "123",
              WB_A2: " "
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            }
          }
        ]
      })
    );

    expect(getFeatureIso2(featureFromWb)).toBe("FR");
    expect(getFeatureIso2(featureWithoutIso)).toBeUndefined();
  });

  it("resolves names from ADMIN, then NAME, then fallback", () => {
    const [withAdmin, withNameOnly, withNoName] = parseCountriesGeoJsonRaw(
      JSON.stringify({
        features: [
          {
            type: "Feature",
            properties: {
              ADMIN: "Admin Name",
              NAME: "Display Name"
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            }
          },
          {
            type: "Feature",
            properties: {
              NAME: "Name Only"
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            }
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            }
          }
        ]
      })
    );

    expect(getCountryName(withAdmin)).toBe("Admin Name");
    expect(getCountryName(withNameOnly)).toBe("Name Only");
    expect(getCountryName(withNoName, "Custom Fallback")).toBe("Custom Fallback");
  });

  it("prefers label coordinates over bbox and uses fallback labels when names are missing", () => {
    const [withLabelPoint, noNameWithIso, noNameNoIso] = parseCountriesGeoJsonRaw(
      JSON.stringify({
        features: [
          {
            type: "Feature",
            properties: {
              ADMIN: "Label Point",
              LABEL_X: 8,
              LABEL_Y: 12
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            },
            bbox: [100, 200, 300, 400]
          },
          {
            type: "Feature",
            properties: {
              WB_A2: "ca"
            },
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            }
          },
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [[[0, 0], [1, 1], [2, 2]]]
            }
          }
        ]
      })
    );

    expect(getCountryLatLng(withLabelPoint)).toEqual({ lat: 12, lng: 8 });
    expect(getCountryLabel(noNameWithIso)).toBe("Unknown country (CA)");
    expect(getCountryLabel(noNameNoIso, "Mystery")).toBe("Mystery");
  });
});
