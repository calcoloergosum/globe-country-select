import type { CountryFeature } from "../components/globeTypes";

const ISO_ALPHA2_PATTERN = /^[A-Z]{2}$/;

export function parseCountriesGeoJsonRaw(rawGeoJson: string): CountryFeature[] {
  const parsed = JSON.parse(rawGeoJson) as { features?: CountryFeature[] };
  return parsed.features ?? [];
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