import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { deriveKabschRotationForTwoPointPairs, removeRollFromRotation } from "./interaction";

function getLatitudeLongitude(rotation: THREE.Quaternion) {
  const elements = new THREE.Matrix4().makeRotationFromQuaternion(rotation).elements;
  return {
    latitude: Math.asin(THREE.MathUtils.clamp(elements[6], -1, 1)),
    longitude: Math.atan2(elements[8], elements[0])
  };
}

describe("deriveKabschRotationForTwoPointPairs", () => {
  it("aligns source and target segment directions and computes scale ratio", () => {
    const outRotation = new THREE.Quaternion();
    const sourceA = new THREE.Vector3(1, 2, 3);
    const sourceB = new THREE.Vector3(4, 2, 3);
    const targetA = new THREE.Vector3(-5, 0, 1);
    const targetB = new THREE.Vector3(-5, 0, -5);

    const result = deriveKabschRotationForTwoPointPairs({
      sourcePointA: sourceA,
      sourcePointB: sourceB,
      targetPointA: targetA,
      targetPointB: targetB,
      outRotation
    });

    const sourceDirection = sourceB.clone().sub(sourceA).normalize();
    const targetDirection = targetB.clone().sub(targetA).normalize();
    const rotatedSourceDirection = sourceDirection.clone().applyQuaternion(result.rotation);

    expect(result.rotation).toBe(outRotation);
    expect(rotatedSourceDirection.angleTo(targetDirection)).toBeCloseTo(0, 12);
    expect(result.scale).toBeCloseTo(2, 12);
    expect(result.rotation.length()).toBeCloseTo(1, 12);
  });

  it("handles antiparallel segments with a valid 180-degree alignment", () => {
    const result = deriveKabschRotationForTwoPointPairs({
      sourcePointA: new THREE.Vector3(0, 0, 0),
      sourcePointB: new THREE.Vector3(1, 0, 0),
      targetPointA: new THREE.Vector3(0, 0, 0),
      targetPointB: new THREE.Vector3(-1, 0, 0)
    });

    const rotated = new THREE.Vector3(1, 0, 0).applyQuaternion(result.rotation);
    expect(rotated.angleTo(new THREE.Vector3(-1, 0, 0))).toBeCloseTo(0, 12);
    expect(result.scale).toBeCloseTo(1, 12);
  });

  it("returns identity rotation and scale 1 when source segment collapses", () => {
    const result = deriveKabschRotationForTwoPointPairs({
      sourcePointA: new THREE.Vector3(2, 2, 2),
      sourcePointB: new THREE.Vector3(2, 2, 2),
      targetPointA: new THREE.Vector3(0, 0, 0),
      targetPointB: new THREE.Vector3(0, 1, 0)
    });

    expect(result.rotation.equals(new THREE.Quaternion())).toBe(true);
    expect(result.scale).toBe(1);
  });

  it("returns identity rotation and scale 0 when target segment collapses", () => {
    const result = deriveKabschRotationForTwoPointPairs({
      sourcePointA: new THREE.Vector3(0, 0, 0),
      sourcePointB: new THREE.Vector3(1, 0, 0),
      targetPointA: new THREE.Vector3(3, 3, 3),
      targetPointB: new THREE.Vector3(3, 3, 3)
    });

    expect(result.rotation.equals(new THREE.Quaternion())).toBe(true);
    expect(result.scale).toBe(0);
  });

  it("returns neutral transform when both source and target segments collapse", () => {
    const result = deriveKabschRotationForTwoPointPairs({
      sourcePointA: new THREE.Vector3(1, 1, 1),
      sourcePointB: new THREE.Vector3(1, 1, 1),
      targetPointA: new THREE.Vector3(9, 9, 9),
      targetPointB: new THREE.Vector3(9, 9, 9)
    });

    expect(result.rotation.equals(new THREE.Quaternion())).toBe(true);
    expect(result.scale).toBe(1);
  });
});

describe("removeRollFromRotation", () => {
  it("preserves derived latitude/longitude while removing roll", () => {
    const input = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(30),
        THREE.MathUtils.degToRad(-55),
        THREE.MathUtils.degToRad(40),
        "XYZ"
      )
    );

    const inputLatLng = getLatitudeLongitude(input);
    const output = removeRollFromRotation(input);
    const outputLatLng = getLatitudeLongitude(output);
    const outputMatrixElements = new THREE.Matrix4().makeRotationFromQuaternion(output).elements;

    expect(outputLatLng.latitude).toBeCloseTo(inputLatLng.latitude, 12);
    expect(outputLatLng.longitude).toBeCloseTo(inputLatLng.longitude, 12);
    expect(outputMatrixElements[4]).toBeCloseTo(0, 12);
    expect(output.length()).toBeCloseTo(1, 12);
  });

  it("writes into outRotation and is idempotent", () => {
    const input = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(-22),
        THREE.MathUtils.degToRad(18),
        THREE.MathUtils.degToRad(70),
        "XYZ"
      )
    );
    const outRotation = new THREE.Quaternion();

    const first = removeRollFromRotation(input, outRotation);
    const second = removeRollFromRotation(first.clone());

    expect(first).toBe(outRotation);
    expect(first.angleTo(second)).toBeCloseTo(0, 12);
  });
});