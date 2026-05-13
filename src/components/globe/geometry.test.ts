import * as THREE from "three";
import { describe, expect, it } from "vitest";

import type { CountryPolygon } from "./types";
import { buildPolygonGeometryData, updateGeometryRadius } from "./geometry";

describe("buildPolygonGeometryData", () => {
  it("returns null for polygons with fewer than three distinct points", () => {
    const invalidPolygon: CountryPolygon = [[[0, 0], [1, 0], [0, 0]]];

    expect(buildPolygonGeometryData(invalidPolygon, 100, 0.001)).toBeNull();
  });

  it("builds fill and stroke geometry for outer ring and holes", () => {
    const polygon: CountryPolygon = [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]
    ];

    const geometryData = buildPolygonGeometryData(polygon, 100, 0.0012);

    expect(geometryData).not.toBeNull();
    expect(geometryData?.fillGeometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometryData?.fillUnitVectors.length).toBeGreaterThan(5);
    expect(geometryData?.strokeGeometries).toHaveLength(2);
    expect(geometryData?.strokeUnitVectors).toHaveLength(2);
    expect(geometryData?.strokeUnitVectors[0].length).toBe(4);
    expect(geometryData?.strokeUnitVectors[1].length).toBe(4);
  });
});

describe("updateGeometryRadius", () => {
  it("updates vertex positions for each unit vector and recomputes bounds", () => {
    const geometry = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(new Float32Array(6), 3);
    geometry.setAttribute("position", positions);
    const versionBefore = positions.version;

    const vectors = [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)];

    updateGeometryRadius(geometry, vectors, 150);

    const updated = geometry.getAttribute("position") as THREE.BufferAttribute;
    expect(updated.getX(0)).toBeCloseTo(0, 6);
    expect(updated.getY(0)).toBeCloseTo(0, 6);
    expect(updated.getZ(0)).toBeCloseTo(150, 6);
    expect(updated.getX(1)).toBeCloseTo(0, 6);
    expect(updated.getY(1)).toBeCloseTo(150, 6);
    expect(updated.getZ(1)).toBeCloseTo(0, 6);
    expect(updated.version).toBeGreaterThan(versionBefore);
    expect(geometry.boundingSphere).not.toBeNull();
  });

  it("is a no-op when geometry has no position attribute", () => {
    const geometry = new THREE.BufferGeometry();

    expect(() => updateGeometryRadius(geometry, [new THREE.Vector3(1, 0, 0)], 100)).not.toThrow();
  });
});