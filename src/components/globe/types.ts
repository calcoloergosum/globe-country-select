import type * as THREE from "three";
import type { CountryFeature } from "../globeTypes";

export type LngLat = readonly [number, number];
export type PolygonRing = LngLat[];
export type CountryPolygon = PolygonRing[];

export type NumericAccessor = number | ((country: object) => number);
export type ColorAccessor = string | ((country: object) => string);

export type ParsedColor = {
  color: THREE.Color;
  opacity: number;
};

export type PolygonGeometryData = {
  fillGeometry: THREE.BufferGeometry | null;
  fillUnitVectors: THREE.Vector3[];
  strokeGeometries: THREE.BufferGeometry[];
  strokeUnitVectors: THREE.Vector3[][];
};

export type PolygonVisual = {
  country: CountryFeature;
  fillGeometry: THREE.BufferGeometry | null;
  fillUnitVectors: THREE.Vector3[];
  fillMaterial: THREE.MeshPhongMaterial | null;
  strokeGeometries: THREE.BufferGeometry[];
  strokeUnitVectors: THREE.Vector3[][];
  strokeMaterials: THREE.LineBasicMaterial[];
};
