import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { MAX_GLOBE_CAMERA_DISTANCE, getMinGlobeCameraDistance } from "./cameraConfig";
import { createFocusTransitionController } from "./focusTransition";

const TEST_GLOBE_RADIUS = 100;
const TEST_MIN_CAMERA_DISTANCE = getMinGlobeCameraDistance(TEST_GLOBE_RADIUS);
const TEST_MAX_CAMERA_DISTANCE = MAX_GLOBE_CAMERA_DISTANCE;

describe("createFocusTransitionController", () => {
  it("returns the input state unchanged when there is no focus target", () => {
    const controller = createFocusTransitionController();

    const next = controller.step({
      focusTarget: null,
      rotationLatitude: 0.3,
      rotationLongitude: -0.2,
      cameraDistance: 240,
      deltaSeconds: 1 / 60,
      maxLatitudeRotation: Math.PI / 2,
      minCameraDistance: TEST_MIN_CAMERA_DISTANCE,
      maxCameraDistance: TEST_MAX_CAMERA_DISTANCE
    });

    expect(next).toEqual({
      rotationLatitude: 0.3,
      rotationLongitude: -0.2,
      cameraDistance: 240,
      isActive: false
    });
  });

  it("eases toward target rotation and performs zoom-out then zoom-in", () => {
    const controller = createFocusTransitionController();

    let state = {
      rotationLatitude: 0,
      rotationLongitude: 0,
      cameraDistance: 200
    };
    let peakDistance = state.cameraDistance;

    for (let i = 0; i < 260; i += 1) {
      state = controller.step({
        focusTarget: {
          lat: 38,
          lng: 30,
          zoomDistance: 140
        },
        rotationLatitude: state.rotationLatitude,
        rotationLongitude: state.rotationLongitude,
        cameraDistance: state.cameraDistance,
        deltaSeconds: 1 / 60,
        maxLatitudeRotation: THREE.MathUtils.degToRad(89.5),
        minCameraDistance: TEST_MIN_CAMERA_DISTANCE,
        maxCameraDistance: TEST_MAX_CAMERA_DISTANCE
      });

      peakDistance = Math.max(peakDistance, state.cameraDistance);
    }

    expect(peakDistance).toBeGreaterThan(200);
    expect(state.cameraDistance).toBeLessThan(peakDistance);
    expect(state.cameraDistance).toBeGreaterThanOrEqual(139.4);
    expect(state.cameraDistance).toBeLessThanOrEqual(141.0);
    expect(state.rotationLatitude).toBeGreaterThan(0);
    expect(state.rotationLongitude).toBeLessThan(0);
  });

  it("clamps focus zoom distance to camera bounds", () => {
    const controller = createFocusTransitionController();

    let state = {
      rotationLatitude: 0,
      rotationLongitude: 0,
      cameraDistance: 260
    };

    for (let i = 0; i < 260; i += 1) {
      state = controller.step({
        focusTarget: {
          lat: 0,
          lng: 0,
          zoomDistance: 20
        },
        rotationLatitude: state.rotationLatitude,
        rotationLongitude: state.rotationLongitude,
        cameraDistance: state.cameraDistance,
        deltaSeconds: 1 / 60,
        maxLatitudeRotation: Math.PI / 2,
        minCameraDistance: TEST_MIN_CAMERA_DISTANCE,
        maxCameraDistance: 360
      });
    }

    expect(state.cameraDistance).toBeGreaterThanOrEqual(TEST_MIN_CAMERA_DISTANCE - 0.5);
    expect(state.cameraDistance).toBeLessThanOrEqual(TEST_MIN_CAMERA_DISTANCE + 2);
  });
});
