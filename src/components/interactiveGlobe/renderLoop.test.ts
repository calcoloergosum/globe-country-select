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
import { MAX_GLOBE_CAMERA_DISTANCE, getMinGlobeCameraDistance } from "./cameraConfig";
import { createRenderLoopController } from "./renderLoop";

const TEST_GLOBE_RADIUS = 100;
const TEST_MIN_CAMERA_DISTANCE = getMinGlobeCameraDistance(TEST_GLOBE_RADIUS);
const TEST_MAX_CAMERA_DISTANCE = MAX_GLOBE_CAMERA_DISTANCE;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  stepMock.mockReset();
});

describe("createRenderLoopController", () => {
  function stubDocumentVisibility(initialVisibilityState: DocumentVisibilityState) {
    let visibilityState = initialVisibilityState;
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const addEventListener = vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "visibilitychange") {
          listeners.add(listener);
        }
      }
    );
    const removeEventListener = vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "visibilitychange") {
          listeners.delete(listener);
        }
      }
    );
    const documentStub = {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener,
      removeEventListener
    };

    vi.stubGlobal("document", documentStub);

    return {
      addEventListener,
      removeEventListener,
      setVisibilityState(nextVisibilityState: DocumentVisibilityState) {
        visibilityState = nextVisibilityState;
      },
      dispatchVisibilityChange() {
        for (const listener of Array.from(listeners)) {
          if (typeof listener === "function") {
            listener({ type: "visibilitychange" } as Event);
          } else {
            listener.handleEvent({ type: "visibilitychange" } as Event);
          }
        }
      }
    };
  }

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
      minCameraDistance: TEST_MIN_CAMERA_DISTANCE,
      maxCameraDistance: TEST_MAX_CAMERA_DISTANCE,
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

  it("preserves a pending render request while hidden and schedules it after becoming visible", () => {
    const visibility = stubDocumentVisibility("hidden");
    const { controller, renderer, runNextFrame } = setupRenderLoop();

    controller.start();

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(runNextFrame()).toBe(false);
    expect(renderer.render).not.toHaveBeenCalled();

    visibility.setVisibilityState("visible");
    visibility.dispatchVisibilityChange();

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(runNextFrame()).toBe(true);
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });

  it("stop removes the visibility listener and cancels pending scheduled work", () => {
    const visibility = stubDocumentVisibility("visible");
    const { controller, runNextFrame } = setupRenderLoop();

    controller.start();
    controller.stop();

    expect(visibility.addEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    expect(visibility.removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);

    visibility.dispatchVisibilityChange();

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(runNextFrame()).toBe(false);
  });
});
