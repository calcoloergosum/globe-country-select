import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import Globe from "./Globe";
import type { CountryFeature } from "./globeTypes";

function makeCountryFeature(): CountryFeature {
  return {
    type: "Feature",
    properties: {
      ADMIN: "Testland",
      ISO_A2: "TL"
    },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [8, 0], [0, 8], [0, 0]]]
    }
  };
}

function flushMicrotasks() {
  return Promise.resolve();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Globe", () => {
  it("disposes a late globe texture callback after dispose without attaching it", () => {
    let loadCallback: ((texture: THREE.Texture) => void) | undefined;
    vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
      (_url: string, onLoad?: (texture: THREE.Texture) => void) => {
        loadCallback = onLoad;
        return {} as THREE.Texture;
      }
    );

    const globe = new Globe();
    const globeMesh = globe.children[0] as THREE.Mesh;
    const material = globeMesh.material as THREE.MeshPhongMaterial;

    globe.globeImageUrl("earth");
    globe.dispose();

    const lateTexture = new THREE.Texture();
    const lateDisposeSpy = vi.spyOn(lateTexture, "dispose");
    loadCallback?.(lateTexture);

    expect(lateDisposeSpy).toHaveBeenCalledTimes(1);
    expect(material.map).toBeNull();
  });

  it("drops stale globe texture requests and disposes replaced textures", () => {
    const loadCallbacks: Array<(texture: THREE.Texture) => void> = [];
    vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
      (_url: string, onLoad?: (texture: THREE.Texture) => void) => {
        if (onLoad) {
          loadCallbacks.push(onLoad);
        }
        return {} as THREE.Texture;
      }
    );

    const globe = new Globe();
    const globeMesh = globe.children[0] as THREE.Mesh;
    const material = globeMesh.material as THREE.MeshPhongMaterial;

    globe.globeImageUrl("first");
    globe.globeImageUrl("second");

    const staleTexture = new THREE.Texture();
    const staleDisposeSpy = vi.spyOn(staleTexture, "dispose");
    loadCallbacks[0](staleTexture);

    expect(staleDisposeSpy).toHaveBeenCalledTimes(1);
    expect(material.map).toBeNull();

    const activeTexture = new THREE.Texture();
    const versionBeforeActiveLoad = material.version;
    const activeDisposeSpy = vi.spyOn(activeTexture, "dispose");
    loadCallbacks[1](activeTexture);
    expect(material.map).toBe(activeTexture);
    expect(material.version).toBeGreaterThan(versionBeforeActiveLoad);

    globe.globeImageUrl("third");
    const replacementTexture = new THREE.Texture();
    loadCallbacks[2](replacementTexture);

    expect(activeDisposeSpy).toHaveBeenCalledTimes(1);
    expect(material.map).toBe(replacementTexture);
  });

  it("disposes prior bump texture when a new one loads", () => {
    const loadCallbacks: Array<(texture: THREE.Texture) => void> = [];
    vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
      (_url: string, onLoad?: (texture: THREE.Texture) => void) => {
        if (onLoad) {
          loadCallbacks.push(onLoad);
        }
        return {} as THREE.Texture;
      }
    );

    const globe = new Globe();
    const globeMesh = globe.children[0] as THREE.Mesh;
    const material = globeMesh.material as THREE.MeshPhongMaterial;

    globe.bumpImageUrl("b1");
    const first = new THREE.Texture();
    const firstDisposeSpy = vi.spyOn(first, "dispose");
    loadCallbacks[0](first);

    expect(material.bumpMap).toBe(first);
    expect(material.bumpScale).toBe(2);

    globe.bumpImageUrl("b2");
    const second = new THREE.Texture();
    const versionBeforeSecondBumpLoad = material.version;
    loadCallbacks[1](second);

    expect(firstDisposeSpy).toHaveBeenCalledTimes(1);
    expect(material.bumpMap).toBe(second);
    expect(material.version).toBeGreaterThan(versionBeforeSecondBumpLoad);
  });

  it("updates polygon materials and radius via queued style refresh", async () => {
    const globe = new Globe();
    globe.polygonsData([makeCountryFeature()]);

    const polygonsGroup = globe.children[1] as THREE.Group;
    const fillMesh = polygonsGroup.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh;
    const stroke = polygonsGroup.children.find((child) => child instanceof THREE.LineLoop) as THREE.LineLoop;

    const fillMaterial = fillMesh.material as THREE.MeshPhongMaterial;
    const strokeMaterial = stroke.material as THREE.LineBasicMaterial;
    const firstVertex = new THREE.Vector3();

    const fillPositionsBefore = fillMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    firstVertex.set(fillPositionsBefore.getX(0), fillPositionsBefore.getY(0), fillPositionsBefore.getZ(0));
    expect(firstVertex.length()).toBeCloseTo(100, 5);

    globe
      .polygonAltitude(() => 0.1)
      .polygonCapColor(() => "rgba(120, 140, 200, 0.6)")
      .polygonStrokeColor(() => "rgba(20, 30, 40, 0.5)");

    await flushMicrotasks();

    const fillPositionsAfter = fillMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    firstVertex.set(fillPositionsAfter.getX(0), fillPositionsAfter.getY(0), fillPositionsAfter.getZ(0));
    expect(firstVertex.length()).toBeCloseTo(110, 5);

    expect(fillMaterial.opacity).toBeCloseTo(0.6, 6);
    expect(fillMaterial.transparent).toBe(true);
    expect(fillMaterial.visible).toBe(true);

    expect(strokeMaterial.opacity).toBeCloseTo(0.5, 6);
    expect(strokeMaterial.transparent).toBe(true);
    expect(strokeMaterial.visible).toBe(true);
  });

  it("disposes previous polygon visuals when rebuilding", () => {
    const globe = new Globe();
    globe.polygonsData([makeCountryFeature()]);

    const polygonsGroup = globe.children[1] as THREE.Group;
    const fillMesh = polygonsGroup.children.find((child) => child instanceof THREE.Mesh) as THREE.Mesh;
    const stroke = polygonsGroup.children.find((child) => child instanceof THREE.LineLoop) as THREE.LineLoop;

    const fillGeometryDisposeSpy = vi.spyOn(fillMesh.geometry, "dispose");
    const fillMaterialDisposeSpy = vi.spyOn(fillMesh.material as THREE.MeshPhongMaterial, "dispose");
    const strokeGeometryDisposeSpy = vi.spyOn(stroke.geometry, "dispose");
    const strokeMaterialDisposeSpy = vi.spyOn(stroke.material as THREE.LineBasicMaterial, "dispose");

    globe.polygonsData([]);

    expect(fillGeometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(fillMaterialDisposeSpy).toHaveBeenCalledTimes(1);
    expect(strokeGeometryDisposeSpy).toHaveBeenCalledTimes(1);
    expect(strokeMaterialDisposeSpy).toHaveBeenCalledTimes(1);
    expect((globe.children[1] as THREE.Group).children).toHaveLength(0);
  });
});
