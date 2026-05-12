// GeoJSON country parsing and metadata helpers (name, ISO code, labels, center point).
import type {
  CountryFeature,
  CountryGeometry,
  CountryMultiPolygonCoordinates,
  CountryPolygonCoordinates
} from "../components/globeTypes";

const ISO_ALPHA2_PATTERN = /^[A-Z]{2}$/;

type RawCountryFeature = {
  type?: unknown;
  properties?: unknown;
  geometry?: unknown;
  bbox?: unknown;
};

export function parseCountriesGeoJsonRaw(rawGeoJson: string): CountryFeature[] {
  let parsed: { features?: unknown };
  try {
    parsed = JSON.parse(rawGeoJson) as { features?: unknown };
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.features)) {
    return [];
  }

  return parsed.features
    .map((feature) => parseCountryFeature(feature))
    .filter((feature): feature is CountryFeature => feature !== null);
}

export function getFeatureIso2(feature: CountryFeature): string | undefined {
  const candidates = [
    feature.properties.ISO_A2,
    feature.properties.ISO_A2_EH,
    feature.properties.WB_A2
  ];

  return candidates
    .map((value) => value?.trim().toUpperCase() ?? "")
    .find((value) => ISO_ALPHA2_PATTERN.test(value));
}

export function getCountryName(feature: CountryFeature, fallbackName = "Unknown"): string {
  return feature.properties.ADMIN ?? feature.properties.NAME ?? fallbackName;
}

export function getCountryLatLng(feature: CountryFeature): { lat: number; lng: number } {
  const lat =
    feature.properties.LABEL_Y ??
    (feature.bbox ? (feature.bbox[1] + feature.bbox[3]) / 2 : 0);
  const lng =
    feature.properties.LABEL_X ??
    (feature.bbox ? (feature.bbox[0] + feature.bbox[2]) / 2 : 0);

  return { lat, lng };
}

export function getCountryLabel(feature: CountryFeature, fallbackName = "Unknown country"): string {
  const name = getCountryName(feature, fallbackName);
  const isoAlpha2 = getFeatureIso2(feature);
  return isoAlpha2 ? `${name} (${isoAlpha2})` : name;
}

function parseCountryFeature(value: unknown): CountryFeature | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const feature = value as RawCountryFeature;
  if (feature.type !== "Feature") {
    return null;
  }

  const geometry = parseCountryGeometry(feature.geometry);
  if (!geometry) {
    return null;
  }

  return {
    type: "Feature",
    properties: parseCountryProperties(feature.properties),
    geometry,
    bbox: parseCountryBbox(feature.bbox)
  };
}

function parseCountryGeometry(value: unknown): CountryGeometry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const geometry = value as { type?: unknown; coordinates?: unknown };
  if (geometry.type === "Polygon") {
    const coordinates = parsePolygonCoordinates(geometry.coordinates);
    return coordinates.length ? { type: "Polygon", coordinates } : null;
  }

  if (geometry.type === "MultiPolygon") {
    const coordinates = parseMultiPolygonCoordinates(geometry.coordinates);
    return coordinates.length ? { type: "MultiPolygon", coordinates } : null;
  }

  return null;
}

function parsePolygonCoordinates(value: unknown): CountryPolygonCoordinates {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((ringValue) => parseRingCoordinates(ringValue))
    .filter((ring) => ring.length > 0);
}

function parseMultiPolygonCoordinates(value: unknown): CountryMultiPolygonCoordinates {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((polygonValue) => parsePolygonCoordinates(polygonValue))
    .filter((polygon) => polygon.length > 0);
}

function parseRingCoordinates(value: unknown): CountryPolygonCoordinates[number] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ring: CountryPolygonCoordinates[number] = [];

  for (const coordinate of value) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      continue;
    }

    const lng = Number(coordinate[0]);
    const lat = Number(coordinate[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      continue;
    }

    ring.push([normalizeLongitude(lng), clampLatitude(lat)]);
  }

  return ring;
}

function parseCountryProperties(value: unknown): CountryFeature["properties"] {
  if (!value || typeof value !== "object") {
    return {};
  }

  const properties = value as Record<string, unknown>;

  return {
    ADMIN: readOptionalString(properties.ADMIN),
    NAME: readOptionalString(properties.NAME),
    ISO_A2: readOptionalString(properties.ISO_A2),
    ISO_A2_EH: readOptionalString(properties.ISO_A2_EH),
    WB_A2: readOptionalString(properties.WB_A2),
    LABEL_X: readOptionalNumber(properties.LABEL_X),
    LABEL_Y: readOptionalNumber(properties.LABEL_Y)
  };
}

function parseCountryBbox(value: unknown): CountryFeature["bbox"] | undefined {
  if (!Array.isArray(value) || value.length < 4) {
    return undefined;
  }

  const bbox = value.slice(0, 4).map((entry) => Number(entry));
  if (bbox.some((entry) => !Number.isFinite(entry))) {
    return undefined;
  }

  const west = normalizeLongitude(bbox[0]);
  const east = normalizeLongitude(bbox[2]);
  const south = clampLatitude(bbox[1]);
  const north = clampLatitude(bbox[3]);

  return [
    Math.min(west, east),
    Math.min(south, north),
    Math.max(west, east),
    Math.max(south, north)
  ];
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeLongitude(lng: number) {
  let normalized = lng;

  while (normalized > 180) {
    normalized -= 360;
  }

  while (normalized < -180) {
    normalized += 360;
  }

  return normalized;
}

function clampLatitude(lat: number) {
  return Math.min(Math.max(lat, -90), 90);
}