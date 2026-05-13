import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

const { intersectSphereAtClientPointMock, createSphereSurfaceIntersectionScratchMock } = vi.hoisted(
  () => ({
    intersectSphereAtClientPointMock: vi.fn(),
    createSphereSurfaceIntersectionScratchMock: vi.fn(() => ({ marker: "scratch" }))
  })
);

vi.mock("../../utils/interaction", () => ({
  createSphereSurfaceIntersectionScratch: createSphereSurfaceIntersectionScratchMock,
  intersectSphereAtClientPoint: intersectSphereAtClientPointMock
}));

import type Globe from "../Globe";
import type { CountryFeature } from "../globeTypes";
import { createGlobePicker, toGlobeEventData } from "./picking";

function makeCountryFeature(): CountryFeature {
  return {
    type: "Feature",
    properties: {
      ADMIN: "France",
      ISO_A2: "FR",
      LABEL_X: 2.3,
      LABEL_Y: 48.8
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]]
    }
  };
}

describe("picking", () => {
  it("maps a country feature to GlobeEventData", () => {
    const country = makeCountryFeature();

    expect(toGlobeEventData(country)).toEqual({
      lat: 48.8,
      lng: 2.3,
      label: "France (FR)",
      isoAlpha2: "FR"
    });
  });

  it("converts world-space hit points to local lat/lng using inverse globe quaternion", () => {
    const country = makeCountryFeature();
    const polygonFinder = {
      findCountryAtLatLng: vi.fn((lat: number, lng: number) => {
        if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
          return country;
        }

        return null;
      })
    };

    const globe = {
      quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
      getWorldPosition: vi.fn((out: THREE.Vector3) => out.set(0, 0, 0)),
      getGlobeRadius: vi.fn(() => 1)
    } as unknown as Globe;

    intersectSphereAtClientPointMock.mockImplementation(
      ({ outPointOnSurface }: { outPointOnSurface: THREE.Vector3 }) => outPointOnSurface.set(1, 0, 0)
    );

    const { pickCountryAtClientPoint, intersectGlobeAtClientPoint } = createGlobePicker({
      globe,
      camera: {} as THREE.PerspectiveCamera,
      domElement: {} as HTMLElement,
      polygonFinder: polygonFinder as never
    });

    const out = new THREE.Vector3();
    const hit = intersectGlobeAtClientPoint(12, 34, out);

    expect(hit).toBe(out);
    expect(intersectSphereAtClientPointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientX: 12,
        clientY: 34,
        sphereRadius: 1,
        outPointOnSurface: out
      })
    );

    const result = pickCountryAtClientPoint(55, 66);

    expect(result).toBe(country);
    expect(polygonFinder.findCountryAtLatLng).toHaveBeenCalledWith(
      expect.closeTo(0, 5),
      expect.closeTo(0, 5)
    );
  });

  it("returns null when there is no globe hit", () => {
    const polygonFinder = {
      findCountryAtLatLng: vi.fn()
    };

    const globe = {
      quaternion: new THREE.Quaternion(),
      getWorldPosition: vi.fn((out: THREE.Vector3) => out.set(0, 0, 0)),
      getGlobeRadius: vi.fn(() => 100)
    } as unknown as Globe;

    intersectSphereAtClientPointMock.mockReturnValueOnce(null);

    const { pickCountryAtClientPoint } = createGlobePicker({
      globe,
      camera: {} as THREE.PerspectiveCamera,
      domElement: {} as HTMLElement,
      polygonFinder: polygonFinder as never
    });

    expect(pickCountryAtClientPoint(1, 2)).toBeNull();
    expect(polygonFinder.findCountryAtLatLng).not.toHaveBeenCalled();
  });
});