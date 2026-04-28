import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Globe from "./Globe";
import type { CountryFeature, GlobeEventData } from "./globeTypes";
import { OrbitControl } from "./OrbitControl";
import { SphericalSurfacePolygonFinder } from "./SphericalSurfacePolygonFinder";

export type { CountryFeature, GlobeEventData } from "./globeTypes";

type InteractiveGlobeProps = {
  countries?: CountryFeature[];
  globeImageUrl?: string;
  bumpImageUrl?: string;
  highlightOnHover?: boolean;
  pinnedCountryIsoA2?: string;
  focusLatLng?: { lat: number; lng: number };
  focusCountry?: CountryFeature;
  onPointHover?: (point: GlobeEventData | null) => void;
  onPointClick?: (point: GlobeEventData) => void;
};

type FocusTransitionPhase = "zoomOut" | "zoomIn";

type FocusTransitionState = {
  signature: string;
  phase: FocusTransitionPhase;
  zoomOutDistance: number;
  desiredDistance: number;
};

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 560;
const DEFAULT_CAMERA_DISTANCE = 320;

export function InteractiveGlobe({
  countries = [],
  globeImageUrl,
  bumpImageUrl,
  highlightOnHover = true,
  pinnedCountryIsoA2,
  focusLatLng,
  focusCountry,
  onPointHover,
  onPointClick
}: InteractiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const polygonFinder = useMemo(() => new SphericalSurfacePolygonFinder(countries), [countries]);
  const onPointHoverRef = useRef(onPointHover);
  const onPointClickRef = useRef(onPointClick);
  const pinnedIsoRef = useRef(pinnedCountryIsoA2);
  const highlightOnHoverRef = useRef(highlightOnHover);
  const applyStylesRef = useRef<(() => void) | null>(null);
  const focusTargetRef = useRef<{ lat: number; lng: number; zoomDistance?: number } | null>(null);

  useEffect(() => {
    onPointHoverRef.current = onPointHover;
  }, [onPointHover]);

  useEffect(() => {
    onPointClickRef.current = onPointClick;
  }, [onPointClick]);

  useEffect(() => {
    pinnedIsoRef.current = pinnedCountryIsoA2;
    applyStylesRef.current?.();
  }, [pinnedCountryIsoA2]);

  useEffect(() => {
    highlightOnHoverRef.current = highlightOnHover;
    applyStylesRef.current?.();
  }, [highlightOnHover]);

  useEffect(() => {
    if (!focusLatLng) {
      focusTargetRef.current = null;
      return;
    }

    focusTargetRef.current = {
      lat: focusLatLng.lat,
      lng: focusLatLng.lng,
      zoomDistance: focusCountry ? getFitDistanceForCountry(focusCountry) : undefined
    };
  }, [focusCountry, focusLatLng]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let animationFrameId = 0;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, DEFAULT_WIDTH / DEFAULT_HEIGHT, 1, 1000);
    camera.position.set(0, 0, DEFAULT_CAMERA_DISTANCE);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    const keyDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyDirectionalLight.position.set(-280, 220, 320);
    const fillDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.55);
    fillDirectionalLight.position.set(240, -140, -240);
    scene.add(ambientLight, keyDirectionalLight, fillDirectionalLight);

    const toCountry = (value: object) => value as CountryFeature;

    const getCountryLabel = (country: CountryFeature) => {
      const name = country.properties.ADMIN ?? country.properties.NAME ?? "Unknown country";
      const isoAlpha2Candidates = [
        country.properties.ISO_A2,
        country.properties.ISO_A2_EH,
        country.properties.WB_A2
      ];

      const isoAlpha2 = isoAlpha2Candidates
        .map((value) => value?.trim().toUpperCase() ?? "")
        .find((value) => /^[A-Z]{2}$/.test(value));

      return isoAlpha2 ? `${name} (${isoAlpha2})` : name;
    };

    const toEventData = (country: CountryFeature): GlobeEventData => {
      const lat =
        country.properties.LABEL_Y ??
        (country.bbox ? (country.bbox[1] + country.bbox[3]) / 2 : 0);
      const lng =
        country.properties.LABEL_X ??
        (country.bbox ? (country.bbox[0] + country.bbox[2]) / 2 : 0);

      const isoAlpha2Candidates = [
        country.properties.ISO_A2,
        country.properties.ISO_A2_EH,
        country.properties.WB_A2
      ];
      const isoAlpha2 = isoAlpha2Candidates
        .map((value) => value?.trim().toUpperCase() ?? "")
        .find((value) => /^[A-Z]{2}$/.test(value));

      return {
        lat,
        lng,
        label: getCountryLabel(country),
        isoAlpha2
      };
    };

    const basePolygonAltitude = 0.0002;
    const activePolygonAltitude = 0.0003;
    const basePolygonCapColor = "rgba(0, 0, 0, 0)";
    const basePolygonSideColor = "rgba(0, 0, 0, 0)";
    const basePolygonStrokeColor = "rgba(0, 0, 0, 0)";
    const selectedPolygonCapColor = "rgba(231, 76, 60, 0.95)";
    const selectedPolygonSideColor = "rgba(192, 57, 43, 0.26)";
    const selectedPolygonStrokeColor = "rgba(120, 18, 13, 0.9)";
    const hoveredPolygonCapColor = "rgba(169, 222, 255, 0.95)";
    const hoveredPolygonSideColor = "rgba(86, 165, 221, 0.22)";
    const hoveredPolygonStrokeColor = "rgba(14, 42, 66, 0.85)";
    const pinnedPolygonCapColor = "rgba(255, 200, 0, 0.92)";
    const pinnedPolygonSideColor = "rgba(220, 160, 0, 0.3)";
    const pinnedPolygonStrokeColor = "rgba(160, 100, 0, 0.9)";

    const getFeatureIso2 = (feature: CountryFeature): string | undefined => {
      const candidates = [
        feature.properties.ISO_A2,
        feature.properties.ISO_A2_EH,
        feature.properties.WB_A2
      ];
      return candidates
        .map((v) => v?.trim().toUpperCase() ?? "")
        .find((v) => /^[A-Z]{2}$/.test(v));
    };

    const globe = new Globe()
      .polygonsData(countries)
      .polygonAltitude(basePolygonAltitude)
      .polygonCapColor(() => basePolygonCapColor)
      .polygonSideColor(() => basePolygonSideColor)
      .polygonStrokeColor(() => basePolygonStrokeColor);

    if (globeImageUrl) {
      globe.globeImageUrl(globeImageUrl);
    }

    if (bumpImageUrl) {
      globe.bumpImageUrl(bumpImageUrl);
    }

    const pointer = new THREE.Vector2();
    const rayOrigin = new THREE.Vector3();
    const rayDirection = new THREE.Vector3();
    const globeCenter = new THREE.Vector3();
    const hitPointOnGlobe = new THREE.Vector3();
    const hitPointOnGlobeLocal = new THREE.Vector3();
    const worldXAxis = new THREE.Vector3(1, 0, 0);
    const worldYAxis = new THREE.Vector3(0, 1, 0);
    const longitudeRotation = new THREE.Quaternion();
    const latitudeRotation = new THREE.Quaternion();
    const maxLatitudeRotation = THREE.MathUtils.degToRad(89.5);
    let selectedCountry: CountryFeature | null = null;
    let hoveredCountry: CountryFeature | null = null;
    let rotationLatitude = 0;
    let rotationLongitude = 0;
    let orbitControl: OrbitControl | null = null;
    const updateGlobeRotation = () => {
      // Compose with fixed world axes: yaw (longitude) then pitch (latitude).
      // This avoids mixed-axis twist that can make north appear tilted.
      longitudeRotation.setFromAxisAngle(worldYAxis, rotationLongitude);
      latitudeRotation.setFromAxisAngle(worldXAxis, rotationLatitude);
      globe.quaternion.copy(latitudeRotation).multiply(longitudeRotation);
    };

    const applyPolygonStyles = () => {
      globe
        .polygonAltitude((country: object) => {
          const feature = toCountry(country);
          if (pinnedIsoRef.current && getFeatureIso2(feature) === pinnedIsoRef.current) {
            return activePolygonAltitude;
          }

          if (selectedCountry && feature === selectedCountry) {
            return activePolygonAltitude;
          }

          if (highlightOnHoverRef.current && hoveredCountry && feature === hoveredCountry) {
            return activePolygonAltitude;
          }

          return basePolygonAltitude;
        })
        .polygonCapColor((country: object) => {
          const feature = toCountry(country);
          if (pinnedIsoRef.current && getFeatureIso2(feature) === pinnedIsoRef.current) {
            return pinnedPolygonCapColor;
          }

          if (selectedCountry && feature === selectedCountry) {
            return selectedPolygonCapColor;
          }

          if (highlightOnHoverRef.current && hoveredCountry && feature === hoveredCountry) {
            return hoveredPolygonCapColor;
          }

          return basePolygonCapColor;
        })
        .polygonSideColor((country: object) => {
          const feature = toCountry(country);
          if (pinnedIsoRef.current && getFeatureIso2(feature) === pinnedIsoRef.current) {
            return pinnedPolygonSideColor;
          }

          if (selectedCountry && feature === selectedCountry) {
            return selectedPolygonSideColor;
          }

          if (highlightOnHoverRef.current && hoveredCountry && feature === hoveredCountry) {
            return hoveredPolygonSideColor;
          }

          return basePolygonSideColor;
        })
        .polygonStrokeColor((country: object) => {
          const feature = toCountry(country);
          if (pinnedIsoRef.current && getFeatureIso2(feature) === pinnedIsoRef.current) {
            return pinnedPolygonStrokeColor;
          }

          if (selectedCountry && feature === selectedCountry) {
            return selectedPolygonStrokeColor;
          }

          if (highlightOnHoverRef.current && hoveredCountry && feature === hoveredCountry) {
            return hoveredPolygonStrokeColor;
          }

          return basePolygonStrokeColor;
        });
    };

    applyStylesRef.current = applyPolygonStyles;

    const intersectGlobeAtClientPoint = (
      clientX: number,
      clientY: number,
      outPointOnSurface: THREE.Vector3
    ) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }

      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      camera.getWorldPosition(rayOrigin);
      rayDirection
        .set(pointer.x, pointer.y, 0.5)
        .unproject(camera)
        .sub(rayOrigin)
        .normalize();

      globe.getWorldPosition(globeCenter);
      const globeRadius = globe.getGlobeRadius();

      const originToCenterX = rayOrigin.x - globeCenter.x;
      const originToCenterY = rayOrigin.y - globeCenter.y;
      const originToCenterZ = rayOrigin.z - globeCenter.z;

      const b =
        originToCenterX * rayDirection.x +
        originToCenterY * rayDirection.y +
        originToCenterZ * rayDirection.z;
      const c =
        originToCenterX * originToCenterX +
        originToCenterY * originToCenterY +
        originToCenterZ * originToCenterZ -
        globeRadius * globeRadius;
      const discriminant = b * b - c;

      if (discriminant < 0) {
        return null;
      }

      const sqrtDiscriminant = Math.sqrt(discriminant);
      const nearDistance = -b - sqrtDiscriminant;
      const farDistance = -b + sqrtDiscriminant;
      const intersectionDistance = nearDistance >= 0 ? nearDistance : farDistance >= 0 ? farDistance : null;

      if (intersectionDistance === null) {
        return null;
      }

      outPointOnSurface
        .copy(rayDirection)
        .multiplyScalar(intersectionDistance)
        .add(rayOrigin)
        .sub(globeCenter)
        .normalize();

      return outPointOnSurface;
    };

    const pickCountryAtClientPoint = (clientX: number, clientY: number) => {
      const hitPoint = intersectGlobeAtClientPoint(clientX, clientY, hitPointOnGlobe);
      if (!hitPoint) {
        return null;
      }

      // Convert world-space hit to globe-local coordinates so lat/lng lookup
      // remains correct after user-driven globe rotations.
      hitPointOnGlobeLocal
        .copy(hitPoint)
        .applyQuaternion(globe.quaternion.clone().invert());

      const lat = THREE.MathUtils.radToDeg(
        Math.asin(THREE.MathUtils.clamp(hitPointOnGlobeLocal.y, -1, 1))
      );
      const lng = THREE.MathUtils.radToDeg(Math.atan2(hitPointOnGlobeLocal.x, hitPointOnGlobeLocal.z));

      return polygonFinder.findCountryAtLatLng(lat, lng);
    };

    const emitHover = (country: CountryFeature | null) => {
      if (hoveredCountry === country) {
        return;
      }

      hoveredCountry = country;
      if (highlightOnHoverRef.current) {
        applyPolygonStyles();
      }

      if (onPointHoverRef.current) {
        onPointHoverRef.current(country ? toEventData(country) : null);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (orbitControl?.isPointerDragging()) {
        return;
      }

      if (!highlightOnHoverRef.current && !onPointHoverRef.current) {
        return;
      }

      emitHover(pickCountryAtClientPoint(event.clientX, event.clientY));
    };

    const onPointerLeave = () => {
      if (!highlightOnHoverRef.current && !onPointHoverRef.current) {
        return;
      }

      emitHover(null);
    };

    const onCanvasClick = (event: MouseEvent) => {
      if (orbitControl?.consumeDidDrag()) {
        return;
      }

      const country = pickCountryAtClientPoint(event.clientX, event.clientY);
      if (country) {
        selectedCountry = country;
        applyPolygonStyles();

        if (onPointClickRef.current) {
          onPointClickRef.current(toEventData(country));
        }
      } else {
        selectedCountry = null;
        applyPolygonStyles();
      }
    };

    const onCanvasDoubleClick = () => {
      // Stop ongoing answer-focus behavior after explicit user reset.
      focusTargetRef.current = null;
      rotationLatitude = 0;
      rotationLongitude = 0;
      updateGlobeRotation();
      camera.position.set(0, 0, DEFAULT_CAMERA_DISTANCE);
      controls.update();
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("click", onCanvasClick);
    renderer.domElement.addEventListener("dblclick", onCanvasDoubleClick);

    orbitControl = new OrbitControl({
      domElement: renderer.domElement,
      maxLatitudeRotation,
      getSurfacePointAtClientPoint: (clientX, clientY, outPointOnSurface) =>
        intersectGlobeAtClientPoint(clientX, clientY, outPointOnSurface),
      getRotation: () => ({
        latitude: rotationLatitude,
        longitude: rotationLongitude
      }),
      onDragStart: () => {
        // Hand control back to the user immediately to avoid drag jump
        // from competing with active focus interpolation.
        focusTargetRef.current = null;
      },
      onRotate: (latitude, longitude) => {
        rotationLatitude = latitude;
        rotationLongitude = longitude;
        updateGlobeRotation();
      }
    });
    orbitControl.attach();

    if (bumpImageUrl) {
      globe.bumpImageUrl(bumpImageUrl);
    }

    applyPolygonStyles();

    scene.add(globe);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.enableZoom = true;
    controls.enableRotate = false;
    controls.zoomToCursor = false;
    controls.zoomSpeed = 1.0;
    controls.minDistance = 100;
    controls.maxDistance = 540;

    const resize = () => {
      const width = Math.max(container.clientWidth, 320);
      const height = Math.max(container.clientHeight, 360);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const observer = new ResizeObserver(() => resize());
    observer.observe(container);

    resize();

    const lerpAngle = (a: number, b: number, t: number) => {
      let diff = b - a;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      return a + diff * t;
    };

    let activeFocusTransition: FocusTransitionState | null = null;
    let lastFocusSignature: string | null = null;

    const render = () => {
      const focus = focusTargetRef.current;
      if (focus) {
        const desiredDistance = THREE.MathUtils.clamp(
          typeof focus.zoomDistance === "number" ? focus.zoomDistance : camera.position.length(),
          controls.minDistance,
          controls.maxDistance
        );
        const focusSignature = `${focus.lat.toFixed(4)}|${focus.lng.toFixed(4)}|${desiredDistance.toFixed(3)}`;

        if (lastFocusSignature !== focusSignature) {
          const currentDistance = camera.position.length();
          const zoomOutDistance = THREE.MathUtils.clamp(
            Math.max(currentDistance, desiredDistance) + 70,
            controls.minDistance,
            controls.maxDistance
          );

          activeFocusTransition = {
            signature: focusSignature,
            phase: "zoomOut",
            zoomOutDistance,
            desiredDistance
          };
          lastFocusSignature = focusSignature;
        }

        const targetLat = THREE.MathUtils.clamp(
          THREE.MathUtils.degToRad(focus.lat),
          -maxLatitudeRotation,
          maxLatitudeRotation
        );
        const targetLng = -THREE.MathUtils.degToRad(focus.lng);
        const newLat = lerpAngle(rotationLatitude, targetLat, 0.08);
        const newLng = lerpAngle(rotationLongitude, targetLng, 0.08);
        if (Math.abs(newLat - rotationLatitude) > 0.0001 || Math.abs(newLng - rotationLongitude) > 0.0001) {
          rotationLatitude = newLat;
          rotationLongitude = newLng;
          updateGlobeRotation();
        }

        if (activeFocusTransition?.signature === focusSignature) {
          const currentDistance = camera.position.length();

          if (activeFocusTransition.phase === "zoomOut") {
            const nextDistance = THREE.MathUtils.lerp(
              currentDistance,
              activeFocusTransition.zoomOutDistance,
              0.11
            );
            if (Math.abs(nextDistance - currentDistance) > 0.05) {
              camera.position.setLength(nextDistance);
            }

            if (Math.abs(activeFocusTransition.zoomOutDistance - nextDistance) <= 0.6) {
              activeFocusTransition.phase = "zoomIn";
            }
          } else {
            const nextDistance = THREE.MathUtils.lerp(
              currentDistance,
              activeFocusTransition.desiredDistance,
              0.1
            );
            if (Math.abs(nextDistance - currentDistance) > 0.05) {
              camera.position.setLength(nextDistance);
            }

            if (Math.abs(activeFocusTransition.desiredDistance - nextDistance) <= 0.6) {
              activeFocusTransition = null;
            }
          }
        }
      } else {
        activeFocusTransition = null;
        lastFocusSignature = null;
      }
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      orbitControl?.dispose();
      controls.dispose();

      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      renderer.domElement.removeEventListener("dblclick", onCanvasDoubleClick);

      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();

        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose?.());
        } else {
          material?.dispose?.();
        }
      });
    };
  }, [bumpImageUrl, countries, globeImageUrl, polygonFinder]);

  return <div ref={containerRef} className="globe-canvas" aria-label="interactive globe" />;
}

function getFitDistanceForCountry(country: CountryFeature) {
  const bounds = getCountryBounds(country);
  if (!bounds) {
    return 200;
  }

  const halfVertical = THREE.MathUtils.degToRad(Math.max((bounds.maxLat - bounds.minLat) * 0.5, 0.35));
  const halfHorizontalRaw = THREE.MathUtils.degToRad(Math.max(bounds.lngSpan * 0.5, 0.35));
  const centerLat = THREE.MathUtils.degToRad((bounds.minLat + bounds.maxLat) * 0.5);
  const halfHorizontal = halfHorizontalRaw * Math.max(Math.cos(centerLat), 0.1);
  const angularRadius = Math.max(Math.hypot(halfVertical, halfHorizontal), THREE.MathUtils.degToRad(0.6));

  const globeRadius = 100;
  const fovY = THREE.MathUtils.degToRad(45);
  const marginFactor = 0.72;
  const tangent = Math.tan(fovY / 2) * marginFactor;

  const distance =
    globeRadius * Math.cos(angularRadius) +
    (globeRadius * Math.sin(angularRadius)) / Math.max(tangent, 0.01);

  return THREE.MathUtils.clamp(distance, 120, 480);
}

function getCountryBounds(country: CountryFeature) {
  if (country.bbox && country.bbox.length >= 4) {
    const [minLng, minLat, maxLng, maxLat] = country.bbox;
    const rawSpan = Math.abs(maxLng - minLng);
    return {
      minLat,
      maxLat,
      lngSpan: Math.min(rawSpan, 360 - rawSpan)
    };
  }

  const points: Array<[number, number]> = [];

  if (country.geometry.type === "Polygon") {
    const polygonCoordinates = country.geometry.coordinates as Array<Array<[number, number]>>;
    for (const ring of polygonCoordinates) {
      for (const [lng, lat] of ring) {
        points.push([lng, lat]);
      }
    }
  }

  if (country.geometry.type === "MultiPolygon") {
    const multiPolygonCoordinates = country.geometry.coordinates as Array<Array<Array<[number, number]>>>;
    for (const polygon of multiPolygonCoordinates) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          points.push([lng, lat]);
        }
      }
    }
  }

  if (points.length === 0) {
    return null;
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const [lng, lat] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  const rawSpan = Math.abs(maxLng - minLng);
  return {
    minLat,
    maxLat,
    lngSpan: Math.min(rawSpan, 360 - rawSpan)
  };
}
