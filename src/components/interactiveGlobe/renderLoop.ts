import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createFocusTransitionController, type FocusTarget } from "./focusTransition";

type RotationState = {
  latitude: number;
  longitude: number;
};

type RenderLoopControllerDeps = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  maxLatitudeRotation: number;
  minCameraDistance: number;
  maxCameraDistance: number;
  getRotation: () => RotationState;
  setRotation: (latitude: number, longitude: number) => void;
  getFocusTarget: () => FocusTarget | null;
};

export function createRenderLoopController({
  scene,
  camera,
  renderer,
  controls,
  maxLatitudeRotation,
  minCameraDistance,
  maxCameraDistance,
  getRotation,
  setRotation,
  getFocusTarget
}: RenderLoopControllerDeps) {
  const focusTransitionController = createFocusTransitionController();
  let animationFrameId = 0;
  let isRunning = false;
  let lastFrameTimeMs = 0;

  const render = () => {
    if (!isRunning) {
      return;
    }

    const currentFrameTimeMs = performance.now();
    const deltaSeconds =
      lastFrameTimeMs > 0
        ? (currentFrameTimeMs - lastFrameTimeMs) / 1000
        : 1 / 60;
    lastFrameTimeMs = currentFrameTimeMs;

    const rotation = getRotation();
    const nextFocusState = focusTransitionController.step({
      focusTarget: getFocusTarget(),
      rotationLatitude: rotation.latitude,
      rotationLongitude: rotation.longitude,
      cameraDistance: camera.position.length(),
      deltaSeconds,
      maxLatitudeRotation,
      minCameraDistance,
      maxCameraDistance
    });

    if (
      Math.abs(nextFocusState.rotationLatitude - rotation.latitude) > 0.0001 ||
      Math.abs(nextFocusState.rotationLongitude - rotation.longitude) > 0.0001
    ) {
      setRotation(nextFocusState.rotationLatitude, nextFocusState.rotationLongitude);
    }

    if (Math.abs(nextFocusState.cameraDistance - camera.position.length()) > 0.05) {
      camera.position.setLength(nextFocusState.cameraDistance);
    }

    controls.update();
    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(render);
  };

  return {
    start() {
      if (isRunning) {
        return;
      }

      isRunning = true;
      lastFrameTimeMs = 0;
      render();
    },
    stop() {
      if (!isRunning) {
        return;
      }

      isRunning = false;
      lastFrameTimeMs = 0;
      cancelAnimationFrame(animationFrameId);
    }
  };
}