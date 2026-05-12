import * as THREE from "three";
import type { CountryFeature } from "../globeTypes";
import type { CountryPolygon, LngLat, PolygonRing } from "./types";

export function extractCountryPolygons(country: CountryFeature): CountryPolygon[] {
  const geometry = country.geometry;

  if (geometry.type === "Polygon") {
    const polygon = parsePolygonCoordinates(geometry.coordinates);
    return polygon.length ? [polygon] : [];
  }

  if (geometry.type === "MultiPolygon") {
    return parseMultiPolygonCoordinates(geometry.coordinates);
  }

  return [];
}

function parseMultiPolygonCoordinates(value: unknown): CountryPolygon[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((polygonValue) => parsePolygonCoordinates(polygonValue))
    .filter((polygon) => polygon.length > 0);
}

function parsePolygonCoordinates(value: unknown): CountryPolygon {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((ringValue) => parseRingCoordinates(ringValue))
    .filter((ring) => ring.length > 0);
}

function parseRingCoordinates(value: unknown): PolygonRing {
  if (!Array.isArray(value)) {
    return [];
  }

  const ring: LngLat[] = [];

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
