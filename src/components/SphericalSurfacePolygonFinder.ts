import * as THREE from "three";
import RBush from "rbush";
import type { CountryFeature } from "./globeTypes";

type LngLat = readonly [number, number];
type PolygonRings = LngLat[];
type CountryPolygon = PolygonRings[];

type BoundingBoxItem = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  polygonId: number;
};

type PreparedRing = {
  vertices: THREE.Vector3[];
};

type PreparedPolygon = {
  id: number;
  country: CountryFeature;
  outer: PreparedRing;
  holes: PreparedRing[];
};

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;
const SPHERE_EPSILON = 1e-7;
const BOUNDARY_EPSILON = 1e-5;
const PROXIMITY_PROBE_RADIUS_DEG = 0.02;
const PROXIMITY_PROBE_DIRECTIONS = 12;
const PROXIMITY_MIN_VOTES = 2;

export class SphericalSurfacePolygonFinder {
  private readonly polygons: PreparedPolygon[] = [];
  private readonly spatialIndex = new RBush<BoundingBoxItem>();

  constructor(countries: CountryFeature[]) {
    const items: BoundingBoxItem[] = [];

    for (const country of countries) {
      const polygons = extractCountryPolygons(country);

      for (const polygon of polygons) {
        const outer = normalizeRing(polygon[0] ?? []);
        if (outer.length < 3) {
          continue;
        }

        const holes = polygon
          .slice(1)
          .map((ring) => normalizeRing(ring))
          .filter((ring) => ring.length >= 3);

        const polygonId = this.polygons.length;
        this.polygons.push({
          id: polygonId,
          country,
          outer: {
            vertices: outer.map(([lng, lat]) => latLngToUnitVector(lat, lng))
          },
          holes: holes.map((ring) => ({
            vertices: ring.map(([lng, lat]) => latLngToUnitVector(lat, lng))
          }))
        });

        items.push(...createBoundingBoxesForRing(outer, polygonId));
      }
    }

    if (items.length) {
      this.spatialIndex.load(items);
    }
  }

  findCountryAtLatLng(lat: number, lng: number): CountryFeature | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    const queryLat = clamp(lat, LAT_MIN, LAT_MAX);
    const queryLng = normalizeLongitude(lng);
    const exactMatch = this.findExactCountryAtLatLng(queryLat, queryLng);

    if (exactMatch) {
      return exactMatch;
    }

    return this.findNearbyCountry(queryLat, queryLng);
  }

  private findExactCountryAtLatLng(lat: number, lng: number): CountryFeature | null {
    const queryLat = clamp(lat, LAT_MIN, LAT_MAX);
    const queryLng = normalizeLongitude(lng);
    const point = latLngToUnitVector(queryLat, queryLng);

    const candidates = this.spatialIndex.search({
      minX: queryLng,
      maxX: queryLng,
      minY: queryLat,
      maxY: queryLat
    });

    const checkedPolygonIds = new Set<number>();

    for (const candidate of candidates) {
      if (checkedPolygonIds.has(candidate.polygonId)) {
        continue;
      }

      checkedPolygonIds.add(candidate.polygonId);
      const polygon = this.polygons[candidate.polygonId];
      if (!polygon) {
        continue;
      }

      if (isPointInRing(point, polygon.outer.vertices)) {
        const insideHole = polygon.holes.some((hole) => isPointInRing(point, hole.vertices));
        if (!insideHole) {
          return polygon.country;
        }
      }
    }

    return null;
  }

  private findNearbyCountry(lat: number, lng: number): CountryFeature | null {
    if (PROXIMITY_PROBE_DIRECTIONS < 3 || PROXIMITY_PROBE_RADIUS_DEG <= 0) {
      return null;
    }

    const voteCounts = new Map<CountryFeature, number>();
    const latRad = THREE.MathUtils.degToRad(lat);
    const cosLat = Math.cos(latRad);
    const lngScale = Math.max(Math.abs(cosLat), 0.15);

    for (let i = 0; i < PROXIMITY_PROBE_DIRECTIONS; i += 1) {
      const angle = (i / PROXIMITY_PROBE_DIRECTIONS) * Math.PI * 2;
      const sampleLat = clamp(
        lat + Math.sin(angle) * PROXIMITY_PROBE_RADIUS_DEG,
        LAT_MIN,
        LAT_MAX
      );
      const sampleLng = normalizeLongitude(
        lng + (Math.cos(angle) * PROXIMITY_PROBE_RADIUS_DEG) / lngScale
      );

      const country = this.findExactCountryAtLatLng(sampleLat, sampleLng);
      if (!country) {
        continue;
      }

      voteCounts.set(country, (voteCounts.get(country) ?? 0) + 1);
    }

    let bestCountry: CountryFeature | null = null;
    let bestVotes = 0;

    for (const [country, votes] of voteCounts) {
      if (votes > bestVotes) {
        bestVotes = votes;
        bestCountry = country;
      }
    }

    return bestVotes >= PROXIMITY_MIN_VOTES ? bestCountry : null;
  }
}

function extractCountryPolygons(country: CountryFeature): CountryPolygon[] {
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

function parseRingCoordinates(value: unknown): PolygonRings {
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

    ring.push([normalizeLongitude(lng), clamp(lat, LAT_MIN, LAT_MAX)]);
  }

  return ring;
}

function normalizeRing(ring: PolygonRings): PolygonRings {
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

function createBoundingBoxesForRing(ring: PolygonRings, polygonId: number): BoundingBoxItem[] {
  const lats = ring.map(([, lat]) => lat);
  const lngs = ring.map(([lng]) => normalizeLongitude(lng));

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  if (maxLng - minLng <= 180) {
    return [
      {
        minX: minLng,
        minY: minLat,
        maxX: maxLng,
        maxY: maxLat,
        polygonId
      }
    ];
  }

  const shiftedLngs = lngs.map((lng) => (lng < 0 ? lng + 360 : lng));
  const shiftedMin = Math.min(...shiftedLngs);
  const shiftedMax = Math.max(...shiftedLngs);
  const shiftedSpan = shiftedMax - shiftedMin;

  if (shiftedSpan > 180) {
    return [
      {
        minX: LNG_MIN,
        minY: minLat,
        maxX: LNG_MAX,
        maxY: maxLat,
        polygonId
      }
    ];
  }

  const westMax = shiftedMax - 360;

  return [
    {
      minX: shiftedMin,
      minY: minLat,
      maxX: LNG_MAX,
      maxY: maxLat,
      polygonId
    },
    {
      minX: LNG_MIN,
      minY: minLat,
      maxX: westMax,
      maxY: maxLat,
      polygonId
    }
  ];
}

function isPointInRing(point: THREE.Vector3, vertices: THREE.Vector3[]): boolean {
  if (vertices.length < 3) {
    return false;
  }

  if (isPointOnRingBoundary(point, vertices)) {
    return true;
  }

  const n1 = new THREE.Vector3();
  const n2 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  let totalAngle = 0;

  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    n1.crossVectors(point, current);
    n2.crossVectors(point, next);

    const n1LengthSq = n1.lengthSq();
    const n2LengthSq = n2.lengthSq();

    if (n1LengthSq < SPHERE_EPSILON || n2LengthSq < SPHERE_EPSILON) {
      return true;
    }

    n1.multiplyScalar(1 / Math.sqrt(n1LengthSq));
    n2.multiplyScalar(1 / Math.sqrt(n2LengthSq));

    cross.crossVectors(n1, n2);
    const signedAngle = Math.atan2(point.dot(cross), clamp(n1.dot(n2), -1, 1));
    totalAngle += signedAngle;
  }

  return Math.abs(totalAngle) > Math.PI;
}

function isPointOnRingBoundary(point: THREE.Vector3, vertices: THREE.Vector3[]): boolean {
  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];

    const edgeAngle = angleBetweenUnitVectors(a, b);
    if (edgeAngle < SPHERE_EPSILON) {
      continue;
    }

    const pointToA = angleBetweenUnitVectors(point, a);
    const pointToB = angleBetweenUnitVectors(point, b);

    if (Math.abs(pointToA + pointToB - edgeAngle) <= BOUNDARY_EPSILON) {
      return true;
    }
  }

  return false;
}

function angleBetweenUnitVectors(a: THREE.Vector3, b: THREE.Vector3): number {
  const crossLength = new THREE.Vector3().crossVectors(a, b).length();
  return Math.atan2(crossLength, clamp(a.dot(b), -1, 1));
}

function latLngToUnitVector(lat: number, lng: number): THREE.Vector3 {
  const latRad = THREE.MathUtils.degToRad(lat);
  const lngRad = THREE.MathUtils.degToRad(lng);
  const cosLat = Math.cos(latRad);

  return new THREE.Vector3(
    cosLat * Math.sin(lngRad),
    Math.sin(latRad),
    cosLat * Math.cos(lngRad)
  );
}

function normalizeLongitude(lng: number): number {
  const normalized = ((((lng + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
