// Focus transition controller for smooth rotate/zoom camera movements to target countries.
import * as THREE from "three";

type FocusTransitionPhase = "zoomOut" | "zoomIn";

type FocusTransitionState = {
  signature: string;
  phase: FocusTransitionPhase;
  zoomOutDistance: number;
  desiredDistance: number;
};

export type FocusTarget = {
  lat: number;
  lng: number;
  zoomDistance?: number;
};

type FocusStepInput = {
  focusTarget: FocusTarget | null;
  rotationLatitude: number;
  rotationLongitude: number;
  cameraDistance: number;
  maxLatitudeRotation: number;
  minCameraDistance: number;
  maxCameraDistance: number;
};

type FocusStepOutput = {
  rotationLatitude: number;
  rotationLongitude: number;
  cameraDistance: number;
};

function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

export function createFocusTransitionController() {
  let activeFocusTransition: FocusTransitionState | null = null;
  let lastFocusSignature: string | null = null;

  return {
    step(input: FocusStepInput): FocusStepOutput {
      const {
        focusTarget,
        maxLatitudeRotation,
        minCameraDistance,
        maxCameraDistance
      } = input;

      let { rotationLatitude, rotationLongitude, cameraDistance } = input;

      if (!focusTarget) {
        activeFocusTransition = null;
        lastFocusSignature = null;
        return {
          rotationLatitude,
          rotationLongitude,
          cameraDistance
        };
      }

      const desiredDistance = THREE.MathUtils.clamp(
        typeof focusTarget.zoomDistance === "number" ? focusTarget.zoomDistance : cameraDistance,
        minCameraDistance,
        maxCameraDistance
      );
      const focusSignature = `${focusTarget.lat.toFixed(4)}|${focusTarget.lng.toFixed(4)}|${desiredDistance.toFixed(3)}`;

      if (lastFocusSignature !== focusSignature) {
        const zoomOutDistance = THREE.MathUtils.clamp(
          Math.max(cameraDistance, desiredDistance) + 70,
          minCameraDistance,
          maxCameraDistance
        );

        activeFocusTransition = {
          signature: focusSignature,
          phase: "zoomOut",
          zoomOutDistance,
          desiredDistance
        };
        lastFocusSignature = focusSignature;
      }

      const targetLat = THREE.MathUtils.clamp(
        THREE.MathUtils.degToRad(focusTarget.lat),
        -maxLatitudeRotation,
        maxLatitudeRotation
      );
      const targetLng = -THREE.MathUtils.degToRad(focusTarget.lng);
      const nextLat = lerpAngle(rotationLatitude, targetLat, 0.08);
      const nextLng = lerpAngle(rotationLongitude, targetLng, 0.08);

      if (
        Math.abs(nextLat - rotationLatitude) > 0.0001 ||
        Math.abs(nextLng - rotationLongitude) > 0.0001
      ) {
        rotationLatitude = nextLat;
        rotationLongitude = nextLng;
      }

      if (activeFocusTransition?.signature === focusSignature) {
        if (activeFocusTransition.phase === "zoomOut") {
          const nextDistance = THREE.MathUtils.lerp(
            cameraDistance,
            activeFocusTransition.zoomOutDistance,
            0.11
          );
          if (Math.abs(nextDistance - cameraDistance) > 0.05) {
            cameraDistance = nextDistance;
          }

          if (Math.abs(activeFocusTransition.zoomOutDistance - nextDistance) <= 0.6) {
            activeFocusTransition.phase = "zoomIn";
          }
        } else {
          const nextDistance = THREE.MathUtils.lerp(
            cameraDistance,
            activeFocusTransition.desiredDistance,
            0.1
          );
          if (Math.abs(nextDistance - cameraDistance) > 0.05) {
            cameraDistance = nextDistance;
          }

          if (Math.abs(activeFocusTransition.desiredDistance - nextDistance) <= 0.6) {
            activeFocusTransition = null;
          }
        }
      }

      return {
        rotationLatitude,
        rotationLongitude,
        cameraDistance
      };
    }
  };
}
