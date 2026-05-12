import * as THREE from "three";
import type { CountryFeature } from "../globeTypes";
import type { CountryPolygon, LngLat, PolygonRing } from "./types";

export function extractCountryPolygons(country: CountryFeature): CountryPolygon[] {
  const geometry = country.geometry;

  if (geometry.type === "Polygon") {
    return geometry.coordinates.length ? [geometry.coordinates] : [];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates;
  }

  return [];
}

export function normalizeRing(ring: PolygonRing): PolygonRing {
  const normalized: LngLat[] = [];

  for (const point of ring) {
    const previous = normalized[normalized.length - 1];
    if (previous && previous[0] === point[0] && previous[1] === point[1]) {
      continue;
    }

    normalized.push(point);
  }

  if (normalized.length > 1) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      normalized.pop();
    }
  }

  return normalized;
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

export function latLngToUnitVector(lat: number, lng: number) {
  const latRad = THREE.MathUtils.degToRad(lat);
  const lngRad = THREE.MathUtils.degToRad(lng);
  const cosLat = Math.cos(latRad);

  return new THREE.Vector3(
    cosLat * Math.sin(lngRad),
    Math.sin(latRad),
    cosLat * Math.cos(lngRad)
  ).normalize();
}
