import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

const { stepMock } = vi.hoisted(() => ({
  stepMock: vi.fn()
}));

vi.mock("./focusTransition", () => ({
  createFocusTransitionController: () => ({
    step: stepMock
  })
}));

import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createRenderLoopController } from "./renderLoop";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  stepMock.mockReset();
});

describe("createRenderLoopController", () => {
  it("runs a frame, applies focus step output, and schedules the next frame", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      })
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(performance, "now").mockReturnValue(1000);

    stepMock.mockReturnValue({
      rotationLatitude: 0.25,
      rotationLongitude: -0.4,
      cameraDistance: 150
    });

    const controls = { update: vi.fn() } as unknown as OrbitControls;
    const renderer = { render: vi.fn() } as unknown as THREE.WebGLRenderer;
    const camera = { position: new THREE.Vector3(0, 0, 200) } as THREE.PerspectiveCamera;
    const getRotation = vi.fn(() => ({ latitude: 0, longitude: 0 }));
    const setRotation = vi.fn();
    const getFocusTarget = vi.fn(() => ({ lat: 1, lng: 2 }));

    const controller = createRenderLoopController({
      scene: {} as THREE.Scene,
      camera,
      renderer,
      controls,
      maxLatitudeRotation: Math.PI / 2,
      minCameraDistance: 120,
      maxCameraDistance: 420,
      getRotation,
      setRotation,
      getFocusTarget
    });

    controller.start();

    expect(stepMock).toHaveBeenCalledWith(
      expect.objectContaining({
        focusTarget: { lat: 1, lng: 2 },
        rotationLatitude: 0,
        rotationLongitude: 0,
        cameraDistance: 200,
        deltaSeconds: 1 / 60
      })
    );
    expect(setRotation).toHaveBeenCalledWith(0.25, -0.4);
    expect(camera.position.length()).toBeCloseTo(150, 6);
    expect(controls.update).toHaveBeenCalledTimes(1);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(rafCallbacks).toHaveLength(1);
  });

  it("start is idempotent and stop cancels the scheduled frame", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 77));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(performance, "now").mockReturnValue(10);

    stepMock.mockReturnValue({
      rotationLatitude: 0,
      rotationLongitude: 0,
      cameraDistance: 200
    });

    const controller = createRenderLoopController({
      scene: {} as THREE.Scene,
      camera: { position: new THREE.Vector3(0, 0, 200) } as THREE.PerspectiveCamera,
      renderer: { render: vi.fn() } as unknown as THREE.WebGLRenderer,
      controls: { update: vi.fn() } as unknown as OrbitControls,
      maxLatitudeRotation: Math.PI / 2,
      minCameraDistance: 120,
      maxCameraDistance: 420,
      getRotation: () => ({ latitude: 0, longitude: 0 }),
      setRotation: vi.fn(),
      getFocusTarget: () => null
    });

    controller.start();
    controller.start();
    controller.stop();
    controller.stop();

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(77);
  });
});