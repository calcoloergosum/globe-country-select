import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  orbitControlsInstances,
  resizeObserverInstances,
  rendererInstances
} = vi.hoisted(() => ({
  orbitControlsInstances: [] as Array<{
    dispose: ReturnType<typeof vi.fn>;
    enablePan?: boolean;
    enableDamping?: boolean;
    enableZoom?: boolean;
    enableRotate?: boolean;
    touches: { TWO: unknown };
    zoomToCursor?: boolean;
    zoomSpeed?: number;
    minDistance?: number;
    maxDistance?: number;
  }>,
  resizeObserverInstances: [] as Array<{
    callback: ResizeObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }>,
  rendererInstances: [] as Array<{
    setPixelRatio: ReturnType<typeof vi.fn>;
    setSize: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    domElement: { style: Record<string, string>; parentElement: unknown };
    outputColorSpace?: unknown;
  }>
}));

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: class OrbitControls {
    enablePan = true;
    enableDamping = true;
    enableZoom = false;
    enableRotate = true;
    touches = { TWO: null as unknown };
    zoomToCursor = true;
    zoomSpeed = 0;
    minDistance = 0;
    maxDistance = 0;
    dispose = vi.fn();

    constructor() {
      orbitControlsInstances.push(this);
    }
  }
}));

vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");

  class WebGLRenderer {
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    dispose = vi.fn();
    domElement = {
      style: {} as Record<string, string>,
      parentElement: null as unknown
    };
    outputColorSpace?: unknown;

    constructor() {
      rendererInstances.push(this);
    }
  }

  return {
    ...actual,
    WebGLRenderer
  };
});

import { createSceneLifecycle } from "./sceneLifecycle";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  orbitControlsInstances.length = 0;
  resizeObserverInstances.length = 0;
  rendererInstances.length = 0;
});

describe("createSceneLifecycle", () => {
  it("configures renderer/controls and keeps last stable size across transient collapse", () => {
    const windowListeners = new Map<string, EventListener[]>();
    const visualViewportListeners = new Map<string, EventListener[]>();
    let rectWidth = 320;
    let rectHeight = 180;

    const windowMock = {
      devicePixelRatio: 3,
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        const handlers = windowListeners.get(type) ?? [];
        handlers.push(listener);
        windowListeners.set(type, handlers);
      }),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        const handlers = windowListeners.get(type) ?? [];
        windowListeners.set(
          type,
          handlers.filter((handler) => handler !== listener)
        );
      }),
      visualViewport: {
        addEventListener: vi.fn((type: string, listener: EventListener) => {
          const handlers = visualViewportListeners.get(type) ?? [];
          handlers.push(listener);
          visualViewportListeners.set(type, handlers);
        }),
        removeEventListener: vi.fn((type: string, listener: EventListener) => {
          const handlers = visualViewportListeners.get(type) ?? [];
          visualViewportListeners.set(
            type,
            handlers.filter((handler) => handler !== listener)
          );
        })
      }
    };

    vi.stubGlobal("window", windowMock);
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe = vi.fn();
        disconnect = vi.fn();
        callback: ResizeObserverCallback;

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
          resizeObserverInstances.push(this);
        }
      }
    );

    const container = {
      appendChild: vi.fn((element: { parentElement: unknown }) => {
        element.parentElement = container;
      }),
      removeChild: vi.fn((element: { parentElement: unknown }) => {
        element.parentElement = null;
      }),
      getBoundingClientRect: vi.fn(() => ({
        width: rectWidth,
        height: rectHeight
      }))
    } as unknown as HTMLDivElement;

    const lifecycle = createSceneLifecycle({
      container,
      minCameraDistance: 120,
      maxCameraDistance: 420,
      initialCameraDistance: 260
    });

    const renderer = rendererInstances[0];
    const controls = orbitControlsInstances[0];
    const observer = resizeObserverInstances[0];

    expect(container.appendChild).toHaveBeenCalledWith(renderer.domElement);
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(2);
    expect(renderer.setSize).toHaveBeenCalledWith(900, 560);
    expect(renderer.domElement.style.touchAction).toBe("none");
    expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace);

    expect(controls.enablePan).toBe(false);
    expect(controls.enableDamping).toBe(false);
    expect(controls.enableZoom).toBe(true);
    expect(controls.enableRotate).toBe(false);
    expect(controls.zoomToCursor).toBe(false);
    expect(controls.zoomSpeed).toBe(1);
    expect(controls.minDistance).toBe(120);
    expect(controls.maxDistance).toBe(420);

    expect(observer.observe).toHaveBeenCalledWith(container);
    expect(windowMock.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(windowMock.addEventListener).toHaveBeenCalledWith(
      "orientationchange",
      expect.any(Function)
    );
    expect(windowMock.visualViewport.addEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );

    expect(renderer.setSize).toHaveBeenLastCalledWith(320, 180, false);
    expect(lifecycle.camera.aspect).toBeCloseTo(320 / 180, 8);

    rectWidth = 1;
    rectHeight = 1;
    observer.callback([] as unknown as ResizeObserverEntry[], observer as unknown as ResizeObserver);

    expect(renderer.setSize).toHaveBeenLastCalledWith(320, 180, false);

    lifecycle.dispose();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(windowMock.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(windowMock.removeEventListener).toHaveBeenCalledWith(
      "orientationchange",
      expect.any(Function)
    );
    expect(windowMock.visualViewport.removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
    expect(controls.dispose).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(container.removeChild).toHaveBeenCalledWith(renderer.domElement);
  });

  it("disposes material textures once, including uniform-bound and array textures", () => {
    vi.stubGlobal("window", {
      devicePixelRatio: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visualViewport: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe = vi.fn();
        disconnect = vi.fn();
        callback: ResizeObserverCallback;

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
        }
      }
    );

    const container = {
      appendChild: vi.fn((element: { parentElement: unknown }) => {
        element.parentElement = container;
      }),
      removeChild: vi.fn((element: { parentElement: unknown }) => {
        element.parentElement = null;
      }),
      getBoundingClientRect: vi.fn(() => ({ width: 200, height: 200 }))
    } as unknown as HTMLDivElement;

    const lifecycle = createSceneLifecycle({
      container,
      minCameraDistance: 100,
      maxCameraDistance: 500,
      initialCameraDistance: 240
    });

    const textureA = new THREE.Texture();
    const textureB = new THREE.Texture();
    const textureADisposeSpy = vi.spyOn(textureA, "dispose");
    const textureBDisposeSpy = vi.spyOn(textureB, "dispose");

    const material = new THREE.MeshBasicMaterial();
    const materialDisposeSpy = vi.spyOn(material, "dispose");
    (material as unknown as { map?: THREE.Texture }).map = textureA;
    (material as unknown as { extraTextureArray?: THREE.Texture[] }).extraTextureArray = [textureA, textureB];
    (
      material as unknown as {
        uniforms: Record<string, { value: unknown }>;
      }
    ).uniforms = {
      sameTexture: { value: textureA },
      nestedArray: { value: [textureB] }
    };

    const geometry = new THREE.BufferGeometry();
    const geometryDisposeSpy = vi.spyOn(geometry, "dispose");
    const mesh = new THREE.Mesh(geometry, material);
    lifecycle.scene.add(mesh);

    const geometryOnlyNode = new THREE.Object3D() as THREE.Object3D & {
      geometry: { dispose: ReturnType<typeof vi.fn> };
      material: null;
    };
    geometryOnlyNode.geometry = { dispose: vi.fn() };
    geometryOnlyNode.material = null;
    lifecycle.scene.add(geometryOnlyNode);

    expect(() => lifecycle.dispose()).not.toThrow();
    expect(geometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(materialDisposeSpy).toHaveBeenCalledTimes(1);
    expect(textureADisposeSpy).toHaveBeenCalledTimes(1);
    expect(textureBDisposeSpy).toHaveBeenCalledTimes(1);
    expect(geometryOnlyNode.geometry.dispose).toHaveBeenCalledTimes(1);
  });
});