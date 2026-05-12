// Polygon geometry builders for triangulated fills and stroke rings on the globe surface.
import * as THREE from "three";
import { latLngToUnitVector, normalizeRing } from "./geo";
import type { CountryPolygon, PolygonGeometryData } from "./types";

type ProjectionFrame = {
  center: THREE.Vector3;
  east: THREE.Vector3;
  north: THREE.Vector3;
};

export function buildPolygonGeometryData(
  polygon: CountryPolygon,
  globeRadius: number,
  strokeAltitudeOffset: number
): PolygonGeometryData | null {
  const outerRing = normalizeRing(polygon[0] ?? []);
  if (outerRing.length < 3) {
    return null;
  }

  const holes = polygon
    .slice(1)
    .map((ring) => normalizeRing(ring))
    .filter((ring) => ring.length >= 3);

  const outerUnitVectors = outerRing.map(([lng, lat]) => latLngToUnitVector(lat, lng));
  const holeUnitVectors = holes.map((ring) => ring.map(([lng, lat]) => latLngToUnitVector(lat, lng)));
  const projectionFrame = createProjectionFrame(outerUnitVectors);
  if (!projectionFrame) {
    return null;
  }

  const outerProjected = projectUnitRing(outerUnitVectors, projectionFrame);
  const holeProjected = holeUnitVectors.map((ring) => projectUnitRing(ring, projectionFrame));

  const normalizedOuter = orientRing(outerProjected, outerUnitVectors, true);
  const normalizedHoles = holeProjected.map((ring, index) => orientRing(ring, holeUnitVectors[index], false));

  const faces = THREE.ShapeUtils.triangulateShape(
    normalizedOuter.projected,
    normalizedHoles.map((ring) => ring.projected)
  );

  const fillUnitVectors = normalizedOuter.unitVectors.concat(
    normalizedHoles.flatMap((ring) => ring.unitVectors)
  );

  const fillGeometry = faces.length
    ? createIndexedGeometry(fillUnitVectors, globeRadius, faces.flat())
    : null;

  const strokeUnitVectors = [normalizedOuter.unitVectors, ...normalizedHoles.map((ring) => ring.unitVectors)];
  const strokeGeometries = strokeUnitVectors.map((ringVectors) =>
    createLineGeometry(ringVectors, globeRadius * (1 + strokeAltitudeOffset))
  );

  return {
    fillGeometry,
    fillUnitVectors,
    strokeGeometries,
    strokeUnitVectors
  };
}

export function updateGeometryRadius(
  geometry: THREE.BufferGeometry,
  unitVectors: THREE.Vector3[],
  radius: number
) {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!positions) {
    return;
  }

  for (let index = 0; index < unitVectors.length; index += 1) {
    const vector = unitVectors[index];
    positions.setXYZ(index, vector.x * radius, vector.y * radius, vector.z * radius);
  }

  positions.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function createIndexedGeometry(unitVectors: THREE.Vector3[], radius: number, indices: number[]) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(unitVectors.length * 3);
  const normals = new Float32Array(unitVectors.length * 3);

  for (let index = 0; index < unitVectors.length; index += 1) {
    const vector = unitVectors[index];
    const offset = index * 3;

    positions[offset] = vector.x * radius;
    positions[offset + 1] = vector.y * radius;
    positions[offset + 2] = vector.z * radius;
    normals[offset] = vector.x;
    normals[offset + 1] = vector.y;
    normals[offset + 2] = vector.z;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function createLineGeometry(unitVectors: THREE.Vector3[], radius: number) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(unitVectors.length * 3);

  for (let index = 0; index < unitVectors.length; index += 1) {
    const vector = unitVectors[index];
    const offset = index * 3;

    positions[offset] = vector.x * radius;
    positions[offset + 1] = vector.y * radius;
    positions[offset + 2] = vector.z * radius;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function createProjectionFrame(unitVectors: THREE.Vector3[]): ProjectionFrame | null {
  if (!unitVectors.length) {
    return null;
  }

  const center = unitVectors
    .reduce((sum, vector) => sum.add(vector), new THREE.Vector3())
    .normalize();

  if (center.lengthSq() === 0) {
    return null;
  }

  const worldUp = new THREE.Vector3(0, 1, 0);
  const fallbackAxis = new THREE.Vector3(1, 0, 0);
  const east = new THREE.Vector3().crossVectors(worldUp, center);

  if (east.lengthSq() < 1e-8) {
    east.crossVectors(fallbackAxis, center);
  }

  if (east.lengthSq() < 1e-8) {
    return null;
  }

  east.normalize();

  const north = new THREE.Vector3().crossVectors(center, east).normalize();
  if (north.lengthSq() === 0) {
    return null;
  }

  return { center, east, north };
}

function projectUnitRing(ring: THREE.Vector3[], frame: ProjectionFrame) {
  return ring.map((vector) => {
    const cosCenterAngle = THREE.MathUtils.clamp(frame.center.dot(vector), -0.999999, 1);
    const scale = Math.sqrt(2 / (1 + cosCenterAngle));

    return new THREE.Vector2(vector.dot(frame.east) * scale, vector.dot(frame.north) * scale);
  });
}

function orientRing(projected: THREE.Vector2[], unitVectors: THREE.Vector3[], clockwise: boolean) {
  const isClockwise = THREE.ShapeUtils.isClockWise(projected);
  if (isClockwise === clockwise) {
    return { projected, unitVectors };
  }

  return {
    projected: [...projected].reverse(),
    unitVectors: [...unitVectors].reverse()
  };
}
