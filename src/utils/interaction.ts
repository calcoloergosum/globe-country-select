
// Low-level math helpers (ray-sphere intersection, two-point rotation fit, roll removal).
import * as THREE from "three";

export type SphereSurfaceIntersectionScratch = {
  pointer: THREE.Vector2;
  rayOrigin: THREE.Vector3;
  rayDirection: THREE.Vector3;
};

const WORLD_X_AXIS = new THREE.Vector3(1, 0, 0);
const WORLD_Y_AXIS = new THREE.Vector3(0, 1, 0);
const ROLL_FREE_MATRIX = new THREE.Matrix4();
const ROLL_FREE_LONGITUDE_ROTATION = new THREE.Quaternion();
const ROLL_FREE_LATITUDE_ROTATION = new THREE.Quaternion();
const TWO_POINT_SOURCE_DELTA = new THREE.Vector3();
const TWO_POINT_TARGET_DELTA = new THREE.Vector3();
const TWO_POINT_SOURCE_DIRECTION = new THREE.Vector3();
const TWO_POINT_TARGET_DIRECTION = new THREE.Vector3();

export function createSphereSurfaceIntersectionScratch(): SphereSurfaceIntersectionScratch {
  return {
    pointer: new THREE.Vector2(),
    rayOrigin: new THREE.Vector3(),
    rayDirection: new THREE.Vector3()
  };
}

type IntersectSphereAtClientPointOptions = {
  clientX: number;
  clientY: number;
  camera: THREE.Camera;
  domElement: HTMLElement;
  sphereCenter: THREE.Vector3;
  sphereRadius: number;
  outPointOnSurface: THREE.Vector3;
  scratch: SphereSurfaceIntersectionScratch;
};

export function intersectSphereAtClientPoint({
  clientX,
  clientY,
  camera,
  domElement,
  sphereCenter,
  sphereRadius,
  outPointOnSurface,
  scratch
}: IntersectSphereAtClientPointOptions): THREE.Vector3 | null {
  const rect = domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  scratch.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  scratch.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  camera.getWorldPosition(scratch.rayOrigin);
  scratch.rayDirection
    .set(scratch.pointer.x, scratch.pointer.y, 0.5)
    .unproject(camera)
    .sub(scratch.rayOrigin)
    .normalize();

  const originToCenterX = scratch.rayOrigin.x - sphereCenter.x;
  const originToCenterY = scratch.rayOrigin.y - sphereCenter.y;
  const originToCenterZ = scratch.rayOrigin.z - sphereCenter.z;

  const b =
    originToCenterX * scratch.rayDirection.x +
    originToCenterY * scratch.rayDirection.y +
    originToCenterZ * scratch.rayDirection.z;
  const c =
    originToCenterX * originToCenterX +
    originToCenterY * originToCenterY +
    originToCenterZ * originToCenterZ -
    sphereRadius * sphereRadius;
  const discriminant = b * b - c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const nearDistance = -b - sqrtDiscriminant;
  const farDistance = -b + sqrtDiscriminant;
  const intersectionDistance = nearDistance >= 0 ? nearDistance : farDistance >= 0 ? farDistance : null;

  if (intersectionDistance === null) {
    return null;
  }

  outPointOnSurface
    .copy(scratch.rayDirection)
    .multiplyScalar(intersectionDistance)
    .add(scratch.rayOrigin)
    .sub(sphereCenter)
    .normalize();

  return outPointOnSurface;
}

type DeriveKabschRotationForTwoPointPairsOptions = {
  sourcePointA: THREE.Vector3;
  sourcePointB: THREE.Vector3;
  targetPointA: THREE.Vector3;
  targetPointB: THREE.Vector3;
  outRotation?: THREE.Quaternion;
};

export type DeriveKabschRotationForTwoPointPairsResult = {
  rotation: THREE.Quaternion;
  scale: number;
};

// Name kept for API compatibility with existing call sites.
export function deriveKabschRotationForTwoPointPairs({
  sourcePointA,
  sourcePointB,
  targetPointA,
  targetPointB,
  outRotation = new THREE.Quaternion()
}: DeriveKabschRotationForTwoPointPairsOptions): DeriveKabschRotationForTwoPointPairsResult {
  // For exactly two correspondences, the centered covariance is rank-1 and a
  // generic Horn/Kabsch eigen solve becomes numerically brittle. The exact
  // two-point similarity fit is determined by the segment deltas alone.
  TWO_POINT_SOURCE_DELTA.subVectors(sourcePointB, sourcePointA);
  TWO_POINT_TARGET_DELTA.subVectors(targetPointB, targetPointA);

  const sourceDeltaLength = TWO_POINT_SOURCE_DELTA.length();
  const targetDeltaLength = TWO_POINT_TARGET_DELTA.length();

  if (sourceDeltaLength < 1e-8) {
    // Collapsed source pair: rotation/scale are underconstrained.
    // If target is also collapsed, the neutral transform is exact.
    // If not, no similarity can separate the two source points.
    // We return a neutral similarity to keep caller behavior stable.
    outRotation.identity();
    return {
      rotation: outRotation,
      scale: 1
    };
  }

  if (targetDeltaLength < 1e-8) {
    // Collapsed target pair: best-fit similarity drives scale to 0.
    outRotation.identity();
    return {
      rotation: outRotation,
      scale: 0
    };
  }

  TWO_POINT_SOURCE_DIRECTION.copy(TWO_POINT_SOURCE_DELTA).multiplyScalar(1 / sourceDeltaLength);
  TWO_POINT_TARGET_DIRECTION.copy(TWO_POINT_TARGET_DELTA).multiplyScalar(1 / targetDeltaLength);

  // The axis twist around the aligned direction is unobservable for two points.
  // setFromUnitVectors chooses the minimal-angle representative.
  outRotation.setFromUnitVectors(TWO_POINT_SOURCE_DIRECTION, TWO_POINT_TARGET_DIRECTION).normalize();

  const solvedScale = targetDeltaLength / sourceDeltaLength;

  return {
    rotation: outRotation,
    scale: Number.isFinite(solvedScale) && solvedScale >= 0 ? solvedScale : 1
  };
}

export function removeRollFromRotation(
  rotation: THREE.Quaternion,
  outRotation: THREE.Quaternion = new THREE.Quaternion()
): THREE.Quaternion {
  ROLL_FREE_MATRIX.makeRotationFromQuaternion(rotation);
  const e = ROLL_FREE_MATRIX.elements;

  const latitude = Math.asin(THREE.MathUtils.clamp(e[6], -1, 1));
  const longitude = Math.atan2(e[8], e[0]);

  ROLL_FREE_LONGITUDE_ROTATION.setFromAxisAngle(WORLD_Y_AXIS, longitude);
  ROLL_FREE_LATITUDE_ROTATION.setFromAxisAngle(WORLD_X_AXIS, latitude);
  outRotation.copy(ROLL_FREE_LATITUDE_ROTATION).multiply(ROLL_FREE_LONGITUDE_ROTATION).normalize();

  return outRotation;
}