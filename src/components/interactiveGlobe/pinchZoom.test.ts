import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

const { deriveKabschRotationForTwoPointPairsMock, removeRollFromRotationMock } = vi.hoisted(() => ({
  deriveKabschRotationForTwoPointPairsMock: vi.fn(),
  removeRollFromRotationMock: vi.fn()
}));

vi.mock("../../utils/interaction", async () => {
  const actual = await vi.importActual<typeof import("../../utils/interaction")>(
    "../../utils/interaction"
  );

  return {
    ...actual,
    deriveKabschRotationForTwoPointPairs: deriveKabschRotationForTwoPointPairsMock,
    removeRollFromRotation: removeRollFromRotationMock
  };
});

import type Globe from "../Globe";
import { MAX_GLOBE_CAMERA_DISTANCE, getMinGlobeCameraDistance } from "./cameraConfig";
import { createPinchGestureController } from "./pinchZoom";

type Listener = (event: Event) => void;
const TEST_GLOBE_RADIUS = 100;
const TEST_MIN_CAMERA_DISTANCE = getMinGlobeCameraDistance(TEST_GLOBE_RADIUS);
const TEST_MAX_CAMERA_DISTANCE = MAX_GLOBE_CAMERA_DISTANCE;

function createDomElementMock() {
  const listeners = new Map<string, Listener[]>();

  const element = {
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const callback =
        typeof listener === "function"
          ? (listener as Listener)
          : (event: Event) => listener.handleEvent(event);
      const handlers = listeners.get(type) ?? [];
      handlers.push(callback);
      listeners.set(type, handlers);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const callback =
        typeof listener === "function"
          ? (listener as Listener)
          : (event: Event) => listener.handleEvent(event);
      const handlers = listeners.get(type) ?? [];
      listeners.set(
        type,
        handlers.filter((handler) => handler !== callback)
      );
    })
  } as unknown as HTMLElement;

  return {
    element,
    dispatch(type: string, event: Event) {
      for (const listener of listeners.get(type) ?? []) {
        listener(event);
      }
    }
  };
}

function createTouchList(
  first: { x: number; y: number },
  second: { x: number; y: number }
): TouchList {
  const t1 = { clientX: first.x, clientY: first.y } as Touch;
  const t2 = { clientX: second.x, clientY: second.y } as Touch;
  return {
    0: t1,
    1: t2,
    length: 2,
    item(index: number) {
      return (index === 0 ? t1 : index === 1 ? t2 : null) as Touch | null;
    },
    [Symbol.iterator]: function* () {
      yield t1;
      yield t2;
    }
  } as TouchList;
}

afterEach(() => {
  vi.restoreAllMocks();
  deriveKabschRotationForTwoPointPairsMock.mockReset();
  removeRollFromRotationMock.mockReset();
});

describe("createPinchGestureController", () => {
  it("uses center-anchor rotation path and updates camera distance", () => {
    const dom = createDomElementMock();
    const setRotation = vi.fn();
    const cancelActiveDrag = vi.fn();
    const camera = { position: new THREE.Vector3(0, 0, 200) } as THREE.PerspectiveCamera;
    const globe = { quaternion: new THREE.Quaternion() } as Globe;

    const intersectGlobeAtClientPoint = vi.fn(
      (clientX: number, clientY: number, out: THREE.Vector3) => {
        if (clientX === 50 && clientY === 0) return out.set(0, 0, 1);
        if (clientX === 0 && clientY === 0) return out.set(0, 0, 1);
        if (clientX === 100 && clientY === 0) return out.set(1, 0, 0).normalize();
        if (clientX === 70 && clientY === 10) return out.set(0.25, 0, 0.97).normalize();
        if (clientX === 20 && clientY === 10) return out.set(0.15, 0, 0.99).normalize();
        if (clientX === 120 && clientY === 10) return out.set(0.99, 0, -0.12).normalize();
        return null;
      }
    );

    const controller = createPinchGestureController({
      domElement: dom.element,
      globe,
      camera,
      maxLatitudeRotation: Math.PI / 2,
      minCameraDistance: TEST_MIN_CAMERA_DISTANCE,
      maxCameraDistance: TEST_MAX_CAMERA_DISTANCE,
      getRotation: () => ({ latitude: 0, longitude: 0 }),
      setRotation,
      intersectGlobeAtClientPoint,
      cancelActiveDrag
    });

    controller.attach();

    dom.dispatch(
      "touchstart",
      {
        touches: createTouchList({ x: 0, y: 0 }, { x: 100, y: 0 })
      } as unknown as Event
    );

    const preventDefault = vi.fn();
    dom.dispatch(
      "touchmove",
      {
        touches: createTouchList({ x: 20, y: 10 }, { x: 120, y: 10 }),
        preventDefault
      } as unknown as Event
    );

    expect(cancelActiveDrag).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(setRotation).toHaveBeenCalledTimes(1);
    expect(camera.position.length()).toBeCloseTo(200, 6);
    expect(deriveKabschRotationForTwoPointPairsMock).not.toHaveBeenCalled();
  });

  it("uses two-point rotation fallback when center motion is too small", () => {
    const dom = createDomElementMock();
    const setRotation = vi.fn();
    const camera = { position: new THREE.Vector3(0, 0, 200) } as THREE.PerspectiveCamera;
    const globe = { quaternion: new THREE.Quaternion() } as Globe;

    deriveKabschRotationForTwoPointPairsMock.mockImplementation(
      ({ outRotation }: { outRotation: THREE.Quaternion }) => {
        outRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-12));
        return {
          rotation: outRotation,
          scale: 2
        };
      }
    );
    removeRollFromRotationMock.mockImplementation((rotation: THREE.Quaternion) => rotation);

    const intersectGlobeAtClientPoint = vi.fn(
      (clientX: number, _clientY: number, out: THREE.Vector3) => {
        if (clientX === 50) return out.set(0, 0, 1);
        if (clientX === 0) return out.set(0, 0, 1);
        if (clientX === 100) return out.set(1, 0, 0).normalize();
        if (clientX === 10) return out.set(0.2, 0, 0.98).normalize();
        if (clientX === 90) return out.set(0.98, 0, -0.2).normalize();
        return out.set(0, 0, 1);
      }
    );

    const controller = createPinchGestureController({
      domElement: dom.element,
      globe,
      camera,
      maxLatitudeRotation: Math.PI / 2,
      minCameraDistance: TEST_MIN_CAMERA_DISTANCE,
      maxCameraDistance: TEST_MAX_CAMERA_DISTANCE,
      getRotation: () => ({ latitude: 0, longitude: 0 }),
      setRotation,
      intersectGlobeAtClientPoint
    });

    controller.attach();

    dom.dispatch(
      "touchstart",
      {
        touches: createTouchList({ x: 0, y: 0 }, { x: 100, y: 0 })
      } as unknown as Event
    );

    const preventDefault = vi.fn();
    dom.dispatch(
      "touchmove",
      {
        touches: createTouchList({ x: 10, y: 0 }, { x: 90, y: 0 }),
        preventDefault
      } as unknown as Event
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(deriveKabschRotationForTwoPointPairsMock).toHaveBeenCalledTimes(1);
    expect(removeRollFromRotationMock).toHaveBeenCalledTimes(1);
    expect(setRotation).toHaveBeenCalledTimes(1);
    expect(camera.position.length()).toBeGreaterThan(200);
    expect(camera.position.length()).toBeLessThanOrEqual(TEST_MAX_CAMERA_DISTANCE);
  });

  it("resets active pinch state when touch count drops and does not process further moves", () => {
    const dom = createDomElementMock();
    const setRotation = vi.fn();

    const controller = createPinchGestureController({
      domElement: dom.element,
      globe: { quaternion: new THREE.Quaternion() } as Globe,
      camera: { position: new THREE.Vector3(0, 0, 160) } as THREE.PerspectiveCamera,
      maxLatitudeRotation: Math.PI / 2,
      minCameraDistance: TEST_MIN_CAMERA_DISTANCE,
      maxCameraDistance: TEST_MAX_CAMERA_DISTANCE,
      getRotation: () => ({ latitude: 0, longitude: 0 }),
      setRotation,
      intersectGlobeAtClientPoint: vi.fn((_x, _y, out) => out.set(0, 0, 1))
    });

    controller.attach();

    dom.dispatch(
      "touchstart",
      {
        touches: createTouchList({ x: 0, y: 0 }, { x: 100, y: 0 })
      } as unknown as Event
    );

    dom.dispatch(
      "touchend",
      {
        touches: {
          length: 1,
          item: () => null
        }
      } as unknown as Event
    );

    dom.dispatch(
      "touchmove",
      {
        touches: createTouchList({ x: 0, y: 0 }, { x: 100, y: 0 }),
        preventDefault: vi.fn()
      } as unknown as Event
    );

    expect(setRotation).not.toHaveBeenCalled();

    controller.dispose();
    expect(dom.element.removeEventListener).toHaveBeenCalledWith("touchstart", expect.any(Function));
    expect(dom.element.removeEventListener).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(dom.element.removeEventListener).toHaveBeenCalledWith("touchend", expect.any(Function));
    expect(dom.element.removeEventListener).toHaveBeenCalledWith("touchcancel", expect.any(Function));
  });

  it("ignores small pinch-distance noise to keep zoom stable", () => {
    const dom = createDomElementMock();
    const camera = { position: new THREE.Vector3(0, 0, 220) } as THREE.PerspectiveCamera;

    const controller = createPinchGestureController({
      domElement: dom.element,
      globe: { quaternion: new THREE.Quaternion() } as Globe,
      camera,
      maxLatitudeRotation: Math.PI / 2,
      minCameraDistance: TEST_MIN_CAMERA_DISTANCE,
      maxCameraDistance: TEST_MAX_CAMERA_DISTANCE,
      getRotation: () => ({ latitude: 0, longitude: 0 }),
      setRotation: vi.fn(),
      intersectGlobeAtClientPoint: vi.fn((_x, _y, out) => out.set(0, 0, 1))
    });

    controller.attach();

    dom.dispatch(
      "touchstart",
      {
        touches: createTouchList({ x: 0, y: 0 }, { x: 200, y: 0 })
      } as unknown as Event
    );

    dom.dispatch(
      "touchmove",
      {
        touches: createTouchList({ x: 0, y: 0 }, { x: 201, y: 0 }),
        preventDefault: vi.fn()
      } as unknown as Event
    );

    dom.dispatch(
      "touchmove",
      {
        touches: createTouchList({ x: 0, y: 0 }, { x: 200, y: 0 }),
        preventDefault: vi.fn()
      } as unknown as Event
    );

    expect(camera.position.length()).toBeCloseTo(220, 6);
  });
});
