// Shared globe-rendering types for polygon geometry, style accessors, and visuals.
import type * as THREE from "three";
import type { CountryCoordinate, CountryFeature } from "../globeTypes";

export type LngLat = CountryCoordinate;
export type PolygonRing = LngLat[];
export type CountryPolygon = PolygonRing[];

export type NumericAccessor = number | ((country: CountryFeature) => number);
export type ColorAccessor = string | ((country: CountryFeature) => string);

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
