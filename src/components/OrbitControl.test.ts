import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrbitControl } from "./OrbitControl";

type Listener = (event: Event) => void;

type DomElementMock = {
  element: HTMLElement;
  dispatch: (type: string, event: Event) => void;
  setPointerCapture: ReturnType<typeof vi.fn>;
  releasePointerCapture: ReturnType<typeof vi.fn>;
};

function createDomElementMock(): DomElementMock {
  const listeners = new Map<string, Listener[]>();
  const capturedPointers = new Set<number>();

  const setPointerCapture = vi.fn((pointerId: number) => {
    capturedPointers.add(pointerId);
  });

  const releasePointerCapture = vi.fn((pointerId: number) => {
    capturedPointers.delete(pointerId);
  });

  const element = {
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const callback =
        typeof listener === "function"
          ? (listener as Listener)
          : ((event: Event) => listener.handleEvent(event));
      const handlers = listeners.get(type) ?? [];
      handlers.push(callback);
      listeners.set(type, handlers);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      const callback =
        typeof listener === "function"
          ? (listener as Listener)
          : ((event: Event) => listener.handleEvent(event));
      const handlers = listeners.get(type) ?? [];
      const filtered = handlers.filter((handler) => handler !== callback);
      listeners.set(type, filtered);
    }),
    setPointerCapture,
    releasePointerCapture,
    hasPointerCapture: vi.fn((pointerId: number) => capturedPointers.has(pointerId))
  } as unknown as HTMLElement;

  const dispatch = (type: string, event: Event) => {
    for (const handler of listeners.get(type) ?? []) {
      handler(event);
    }
  };

  return {
    element,
    dispatch,
    setPointerCapture,
    releasePointerCapture
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("OrbitControl", () => {
  it("starts drag on pointerdown and applies visualViewport scaling during pointermove", () => {
    const dom = createDomElementMock();
    const onRotate = vi.fn();

    const getSurfacePointAtClientPoint = vi.fn(
      (clientX: number, clientY: number, outPointOnSurface: THREE.Vector3) => {
        if (clientX === 120 && clientY === 70) {
          return outPointOnSurface.set(0, 0, 1);
        }

        if (clientX === 150 && clientY === 80) {
          return outPointOnSurface.set(1, 0, 0);
        }

        return null;
      }
    );

    const orbitControl = new OrbitControl({
      domElement: dom.element,
      maxLatitudeRotation: Math.PI / 2,
      getSurfacePointAtClientPoint,
      onRotate
    });
    orbitControl.attach();

    vi.stubGlobal("navigator", { userAgent: "iPhone" });
    vi.stubGlobal("window", { visualViewport: { scale: 2 } });

    dom.dispatch(
      "pointerdown",
      {
        isPrimary: true,
        button: 0,
        pointerId: 7,
        clientX: 120,
        clientY: 70
      } as unknown as Event
    );

    dom.dispatch(
      "pointermove",
      {
        pointerId: 7,
        clientX: 200,
        clientY: 110,
        target: {
          getBoundingClientRect: () => ({ left: 100, top: 50 })
        }
      } as unknown as Event
    );

    expect(dom.setPointerCapture).toHaveBeenCalledWith(7);
    expect(getSurfacePointAtClientPoint).toHaveBeenNthCalledWith(2, 150, 80, expect.any(THREE.Vector3));
    expect(onRotate).toHaveBeenCalledTimes(1);
    expect(orbitControl.consumeDidDrag()).toBe(true);
    expect(orbitControl.consumeDidDrag()).toBe(false);
  });

  it("cancels active pointer drag when a two-touch gesture starts", () => {
    const dom = createDomElementMock();
    const onRotate = vi.fn();
    const onMultiTouchStart = vi.fn();

    const getSurfacePointAtClientPoint = vi.fn(
      (_clientX: number, _clientY: number, outPointOnSurface: THREE.Vector3) =>
        outPointOnSurface.set(0, 0, 1)
    );

    const orbitControl = new OrbitControl({
      domElement: dom.element,
      maxLatitudeRotation: Math.PI / 2,
      getSurfacePointAtClientPoint,
      onRotate,
      onMultiTouchStart
    });
    orbitControl.attach();

    dom.dispatch(
      "pointerdown",
      {
        isPrimary: true,
        button: 0,
        pointerId: 21,
        clientX: 10,
        clientY: 20
      } as unknown as Event
    );

    expect(orbitControl.isPointerDragging()).toBe(true);

    dom.dispatch(
      "touchstart",
      {
        touches: [{ identifier: 1 }, { identifier: 2 }]
      } as unknown as Event
    );

    dom.dispatch(
      "pointermove",
      {
        pointerId: 21,
        clientX: 30,
        clientY: 40
      } as unknown as Event
    );

    expect(onMultiTouchStart).toHaveBeenCalledTimes(1);
    expect(dom.releasePointerCapture).toHaveBeenCalledWith(21);
    expect(orbitControl.isPointerDragging()).toBe(false);
    expect(onRotate).not.toHaveBeenCalled();
  });
});
