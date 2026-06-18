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
  function setupRenderLoop({
    focusActive = false,
    controlsChanged = false
  }: {
    focusActive?: boolean;
    controlsChanged?: boolean;
  } = {}) {
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    let rafId = 0;
    let now = 1000;

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        rafId += 1;
        rafCallbacks.set(rafId, callback);
        return rafId;
      })
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((id: number) => {
        rafCallbacks.delete(id);
      })
    );
    vi.spyOn(performance, "now").mockImplementation(() => {
      now += 16;
      return now;
    });

    stepMock.mockReturnValue({
      rotationLatitude: 0.25,
      rotationLongitude: -0.4,
      cameraDistance: 150,
      isActive: focusActive
    });

    const controls = {
      update: vi.fn(() => controlsChanged),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as OrbitControls;
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

    const runNextFrame = () => {
      const nextEntry = rafCallbacks.entries().next().value as
        | [number, FrameRequestCallback]
        | undefined;
      if (!nextEntry) {
        return false;
      }
      const [id, callback] = nextEntry;
      rafCallbacks.delete(id);
      callback(now);
      return true;
    };

    return {
      camera,
      controller,
      controls,
      getFocusTarget,
      getRotation,
      rafCallbacks,
      renderer,
      runNextFrame,
      setRotation
    };
  }

  it("start renders at least one frame", () => {
    const { camera, controller, controls, getFocusTarget, renderer, runNextFrame, setRotation } =
      setupRenderLoop();

    controller.start();
    expect(runNextFrame()).toBe(true);

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
    expect(getFocusTarget).toHaveBeenCalledTimes(1);
  });

  it("stops scheduling frames after an idle render", () => {
    const { controller, rafCallbacks, renderer, runNextFrame } = setupRenderLoop();

    controller.start();
    expect(runNextFrame()).toBe(true);

    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.size).toBe(0);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("requestRender schedules another frame after the loop is idle", () => {
    const { controller, renderer, runNextFrame } = setupRenderLoop();

    controller.start();
    expect(runNextFrame()).toBe(true);

    controller.requestRender();
    expect(runNextFrame()).toBe(true);

    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it("keeps scheduling frames while focus transition is active", () => {
    const { controller, rafCallbacks, runNextFrame } = setupRenderLoop({ focusActive: true });

    controller.start();
    expect(runNextFrame()).toBe(true);

    expect(rafCallbacks.size).toBe(1);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it("stop cancels scheduled work", () => {
    const { controller } = setupRenderLoop();

    controller.start();
    controller.start();
    controller.stop();
    controller.stop();

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
