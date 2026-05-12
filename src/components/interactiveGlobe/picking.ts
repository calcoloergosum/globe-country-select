import * as THREE from "three";
import Globe from "../Globe";
import type { CountryFeature, GlobeEventData } from "../globeTypes";
import { SphericalSurfacePolygonFinder } from "../SphericalSurfacePolygonFinder";
import {
  createSphereSurfaceIntersectionScratch,
  intersectSphereAtClientPoint
} from "../../utils/interaction";
import { getCountryLabel, getCountryLatLng, getFeatureIso2 } from "../../utils/countryData";

type GlobePickerDeps = {
  globe: Globe;
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  polygonFinder: SphericalSurfacePolygonFinder;
};

export function toGlobeEventData(country: CountryFeature): GlobeEventData {
  const { lat, lng } = getCountryLatLng(country);

  return {
    lat,
    lng,
    label: getCountryLabel(country),
    isoAlpha2: getFeatureIso2(country)
  };
}

export function createGlobePicker({ globe, camera, domElement, polygonFinder }: GlobePickerDeps) {
  const surfaceIntersectionScratch = createSphereSurfaceIntersectionScratch();
  const globeCenter = new THREE.Vector3();
  const hitPointOnGlobe = new THREE.Vector3();
  const hitPointOnGlobeLocal = new THREE.Vector3();
  const inverseGlobeQuaternion = new THREE.Quaternion();

  const intersectGlobeAtClientPoint = (
    clientX: number,
    clientY: number,
    outPointOnSurface: THREE.Vector3
  ) => {
    globe.getWorldPosition(globeCenter);
    return intersectSphereAtClientPoint({
      clientX,
      clientY,
      camera,
      domElement,
      sphereCenter: globeCenter,
      sphereRadius: globe.getGlobeRadius(),
      outPointOnSurface,
      scratch: surfaceIntersectionScratch
    });
  };

  const pickCountryAtClientPoint = (clientX: number, clientY: number) => {
    const hitPoint = intersectGlobeAtClientPoint(clientX, clientY, hitPointOnGlobe);
    if (!hitPoint) {
      return null;
    }

    // Convert world-space hit to globe-local coordinates so lat/lng lookup
    // remains correct after user-driven globe rotations.
    inverseGlobeQuaternion.copy(globe.quaternion).invert();
    hitPointOnGlobeLocal.copy(hitPoint).applyQuaternion(inverseGlobeQuaternion);

    const lat = THREE.MathUtils.radToDeg(
      Math.asin(THREE.MathUtils.clamp(hitPointOnGlobeLocal.y, -1, 1))
    );
    const lng = THREE.MathUtils.radToDeg(
      Math.atan2(hitPointOnGlobeLocal.x, hitPointOnGlobeLocal.z)
    );

    return polygonFinder.findCountryAtLatLng(lat, lng);
  };

  return {
    intersectGlobeAtClientPoint,
    pickCountryAtClientPoint
  };
}
