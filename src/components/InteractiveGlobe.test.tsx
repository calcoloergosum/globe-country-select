// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  globeInstances: [] as Array<{
    quaternion: THREE.Quaternion;
    polygonsData: ReturnType<typeof vi.fn>;
    globeImageUrl: ReturnType<typeof vi.fn>;
    bumpImageUrl: ReturnType<typeof vi.fn>;
    getGlobeRadius: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>,
  orbitInstances: [] as Array<{
    options: {
      onHover?: (clientX: number, clientY: number, event: PointerEvent) => void;
      onClick?: (clientX: number, clientY: number, event: MouseEvent) => void;
      onRotate: (latitude: number, longitude: number) => void;
      onDoubleClick?: (event: MouseEvent) => void;
      onDragStart?: () => void;
      onMultiTouchStart?: () => void;
    };
    attach: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    cancelActiveDrag: ReturnType<typeof vi.fn>;
  }>,
  pinchInstances: [] as Array<{
    attach: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }>,
  renderLoopInstances: [] as Array<{
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    requestRender: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  }>,
  renderLoopDeps: [] as Array<{
    getFocusTarget: () => { lat: number; lng: number; zoomDistance?: number } | null;
  }>,
  sceneLifecycleReturns: [] as Array<{
    options: {
      minCameraDistance: number;
      maxCameraDistance: number;
      initialCameraDistance: number;
      container: HTMLDivElement;
      onResize?: () => void;
    };
    scene: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
    camera: THREE.PerspectiveCamera;
    renderer: { domElement: HTMLCanvasElement };
    controls: { update: ReturnType<typeof vi.fn> };
    dispose: ReturnType<typeof vi.fn>;
  }>,
  applyStyleFns: [] as Array<ReturnType<typeof vi.fn>>,
  pickCountry: null as unknown
}));

vi.mock("./Globe", () => ({
  default: class Globe {
    quaternion = new THREE.Quaternion();
    polygonsData = vi.fn(() => this);
    globeImageUrl = vi.fn(() => this);
    bumpImageUrl = vi.fn(() => this);
    getGlobeRadius = vi.fn(() => 100);
    dispose = vi.fn();

    constructor() {
      mockState.globeInstances.push(this);
    }
  }
}));

vi.mock("./OrbitControl", () => ({
  OrbitControl: class OrbitControl {
    options: {
      onHover?: (clientX: number, clientY: number, event: PointerEvent) => void;
      onClick?: (clientX: number, clientY: number, event: MouseEvent) => void;
      onRotate: (latitude: number, longitude: number) => void;
      onDoubleClick?: (event: MouseEvent) => void;
      onDragStart?: () => void;
      onMultiTouchStart?: () => void;
    };
    attach = vi.fn();
    dispose = vi.fn();
    cancelActiveDrag = vi.fn();

    constructor(options: {
      onHover?: (clientX: number, clientY: number, event: PointerEvent) => void;
      onClick?: (clientX: number, clientY: number, event: MouseEvent) => void;
      onRotate: (latitude: number, longitude: number) => void;
      onDoubleClick?: (event: MouseEvent) => void;
      onDragStart?: () => void;
      onMultiTouchStart?: () => void;
    }) {
      this.options = options;
      mockState.orbitInstances.push(this);
    }
  }
}));

vi.mock("./interactiveGlobe/sceneLifecycle", () => ({
  createSceneLifecycle: vi.fn(
    (options: {
      minCameraDistance: number;
      maxCameraDistance: number;
      initialCameraDistance: number;
      container: HTMLDivElement;
      onResize?: () => void;
    }) => {
      const camera = new THREE.PerspectiveCamera();
      camera.position.set(0, 0, 320);
      const scene = { add: vi.fn(), remove: vi.fn() };
      const controls = { update: vi.fn() };
      const renderer = { domElement: document.createElement("canvas") };
      const dispose = vi.fn();
      const lifecycle = {
        options,
        scene,
        camera,
        renderer,
        controls,
        dispose
      };
      mockState.sceneLifecycleReturns.push(lifecycle);
      return {
        scene,
        camera,
        renderer,
        controls,
        dispose
      };
    }
  )
}));

vi.mock("./interactiveGlobe/picking", () => ({
  createGlobePicker: vi.fn(() => ({
    intersectGlobeAtClientPoint: vi.fn((_x: number, _y: number, out: THREE.Vector3) =>
      out.set(0, 0, 1)
    ),
    pickCountryAtClientPoint: vi.fn(() => mockState.pickCountry)
  })),
  toGlobeEventData: vi.fn((country: { properties?: { ADMIN?: string; ISO_A2?: string } }) => ({
    lat: 11,
    lng: 22,
    label: `${country.properties?.ADMIN ?? "Unknown"} (${country.properties?.ISO_A2 ?? "??"})`,
    isoAlpha2: country.properties?.ISO_A2
  }))
}));

vi.mock("./interactiveGlobe/polygonStyling", () => ({
  createPolygonStyleApplicator: vi.fn(() => {
    const applyStyle = vi.fn();
    mockState.applyStyleFns.push(applyStyle);
    return applyStyle;
  })
}));

vi.mock("./interactiveGlobe/pinchZoom", () => ({
  createPinchGestureController: vi.fn(() => {
    const controller = {
      attach: vi.fn(),
      dispose: vi.fn()
    };
    mockState.pinchInstances.push(controller);
    return controller;
  })
}));

vi.mock("./interactiveGlobe/renderLoop", () => ({
  createRenderLoopController: vi.fn((deps: { getFocusTarget: () => { lat: number; lng: number; zoomDistance?: number } | null }) => {
    mockState.renderLoopDeps.push(deps);
    const controller = {
      start: vi.fn(),
      stop: vi.fn(),
      requestRender: vi.fn(),
      invalidate: vi.fn()
    };
    mockState.renderLoopInstances.push(controller);
    return controller;
  })
}));

import { InteractiveGlobe, type CountryFeature } from "./InteractiveGlobe";

function makeCountryFeature(name: string, isoAlpha2: string): CountryFeature {
  return {
    type: "Feature",
    properties: {
      ADMIN: name,
      ISO_A2: isoAlpha2
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]]
    },
    bbox: [-5, 40, 10, 52]
  };
}

describe("InteractiveGlobe", () => {
  beforeEach(() => {
    mockState.globeInstances.length = 0;
    mockState.orbitInstances.length = 0;
    mockState.pinchInstances.length = 0;
    mockState.renderLoopInstances.length = 0;
    mockState.renderLoopDeps.length = 0;
    mockState.sceneLifecycleReturns.length = 0;
    mockState.applyStyleFns.length = 0;
    mockState.pickCountry = null;
  });

  it("wires scene/controllers and disposes all resources on unmount", () => {
    const countries = [makeCountryFeature("France", "FR")];
    const { unmount } = render(
      <InteractiveGlobe countries={countries} globeImageUrl="earth.jpg" bumpImageUrl="bump.jpg" />
    );

    expect(mockState.globeInstances).toHaveLength(1);
    expect(mockState.orbitInstances).toHaveLength(1);
    expect(mockState.pinchInstances).toHaveLength(1);
    expect(mockState.renderLoopInstances).toHaveLength(1);
    expect(mockState.sceneLifecycleReturns).toHaveLength(1);

    const globe = mockState.globeInstances[0];
    const lifecycle = mockState.sceneLifecycleReturns[0];

    expect(globe.polygonsData).toHaveBeenCalledWith(countries);
    expect(globe.globeImageUrl).toHaveBeenCalledWith("earth.jpg");
    expect(globe.bumpImageUrl).toHaveBeenCalledWith("bump.jpg");

    expect(lifecycle.options.minCameraDistance).toBeCloseTo(100.1, 6);
    expect(lifecycle.options.maxCameraDistance).toBe(540);
    expect(lifecycle.options.initialCameraDistance).toBe(320);
    expect(lifecycle.scene.add).toHaveBeenCalledWith(globe);

    expect(mockState.orbitInstances[0].attach).toHaveBeenCalledTimes(1);
    expect(mockState.pinchInstances[0].attach).toHaveBeenCalledTimes(1);
    expect(mockState.renderLoopInstances[0].start).toHaveBeenCalledTimes(1);
    expect(mockState.applyStyleFns[0]).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockState.renderLoopInstances[0].stop).toHaveBeenCalledTimes(1);
    expect(mockState.orbitInstances[0].dispose).toHaveBeenCalledTimes(1);
    expect(mockState.pinchInstances[0].dispose).toHaveBeenCalledTimes(1);
    expect(lifecycle.scene.remove).toHaveBeenCalledWith(globe);
    expect(globe.dispose).toHaveBeenCalledTimes(1);
    expect(lifecycle.dispose).toHaveBeenCalledTimes(1);
  });

  it("routes hover/click picks to callbacks and suppresses duplicate hover payloads", () => {
    const country = makeCountryFeature("France", "FR");
    const onPointHover = vi.fn();
    const onPointClick = vi.fn();

    render(
      <InteractiveGlobe
        countries={[country]}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
        highlightOnHover
      />
    );

    const orbit = mockState.orbitInstances[0];

    mockState.pickCountry = country;
    act(() => {
      orbit.options.onHover?.(11, 22, {} as PointerEvent);
      orbit.options.onHover?.(11, 22, {} as PointerEvent);
    });

    expect(onPointHover).toHaveBeenCalledTimes(1);
    expect(onPointHover).toHaveBeenCalledWith(
      expect.objectContaining({ isoAlpha2: "FR", label: "France (FR)" })
    );

    mockState.pickCountry = null;
    act(() => {
      orbit.options.onHover?.(11, 22, {} as PointerEvent);
    });
    expect(onPointHover).toHaveBeenCalledTimes(2);
    expect(onPointHover).toHaveBeenLastCalledWith(null);

    mockState.pickCountry = country;
    act(() => {
      orbit.options.onClick?.(11, 22, {} as MouseEvent);
    });
    expect(onPointClick).toHaveBeenCalledWith(
      expect.objectContaining({ isoAlpha2: "FR", label: "France (FR)" })
    );

    mockState.pickCountry = null;
    act(() => {
      orbit.options.onClick?.(11, 22, {} as MouseEvent);
    });
    expect(onPointClick).toHaveBeenLastCalledWith(null);

    expect(mockState.applyStyleFns[0].mock.calls.length).toBeGreaterThan(1);
  });

  it("updates focus target from props, clears focus on user interaction, and resets camera on double-click", () => {
    const country = makeCountryFeature("France", "FR");
    const countries = [country];

    const { rerender } = render(
      <InteractiveGlobe
        countries={countries}
        focusLatLng={{ lat: 48.8, lng: 2.3 }}
        focusCountry={country}
      />
    );

    const orbit = mockState.orbitInstances[0];
    const renderLoopDeps = mockState.renderLoopDeps[0];
    const lifecycle = mockState.sceneLifecycleReturns[0];

    const focusTargetBeforeDrag = renderLoopDeps.getFocusTarget();
    expect(focusTargetBeforeDrag).toMatchObject({ lat: 48.8, lng: 2.3 });
    expect(focusTargetBeforeDrag?.zoomDistance).toBeGreaterThanOrEqual(120);
    expect(focusTargetBeforeDrag?.zoomDistance).toBeLessThanOrEqual(480);

    act(() => {
      orbit.options.onDragStart?.();
    });
    expect(renderLoopDeps.getFocusTarget()).toBeNull();

    act(() => {
      rerender(
        <InteractiveGlobe
          countries={countries}
          focusLatLng={{ lat: 40, lng: -75 }}
          focusCountry={undefined}
        />
      );
    });
    expect(renderLoopDeps.getFocusTarget()).toEqual({ lat: 40, lng: -75, zoomDistance: undefined });

    lifecycle.camera.position.set(5, 4, 3);
    act(() => {
      orbit.options.onRotate(0.4, -0.3);
      orbit.options.onDoubleClick?.({} as MouseEvent);
    });

    expect(lifecycle.camera.position.x).toBe(0);
    expect(lifecycle.camera.position.y).toBe(0);
    expect(lifecycle.camera.position.z).toBe(320);
    expect(lifecycle.controls.update).toHaveBeenCalledTimes(1);
  });

  it("uses latest click callback ref and reapplies polygon styles for pin/highlight/clear updates", () => {
    const country = makeCountryFeature("France", "FR");
    const countries = [country];
    const firstClickHandler = vi.fn();
    const secondClickHandler = vi.fn();

    const { rerender } = render(
      <InteractiveGlobe
        countries={countries}
        pinnedCountryIsoA2="FR"
        clearSelectionSignal={0}
        highlightOnHover
        onPointClick={firstClickHandler}
      />
    );

    const applyStyle = mockState.applyStyleFns[0];
    const initialApplyCount = applyStyle.mock.calls.length;

    act(() => {
      rerender(
        <InteractiveGlobe
          countries={countries}
          pinnedCountryIsoA2="US"
          clearSelectionSignal={1}
          highlightOnHover={false}
          onPointClick={secondClickHandler}
        />
      );
    });

    expect(applyStyle.mock.calls.length).toBeGreaterThanOrEqual(initialApplyCount + 3);

    mockState.pickCountry = country;
    const orbit = mockState.orbitInstances[0];
    act(() => {
      orbit.options.onClick?.(2, 3, {} as MouseEvent);
    });

    expect(firstClickHandler).not.toHaveBeenCalled();
    expect(secondClickHandler).toHaveBeenCalledTimes(1);
  });
});
