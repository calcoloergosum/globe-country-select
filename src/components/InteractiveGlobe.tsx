// Main integration layer for renderer, controls, picking, highlighting, quiz focus camera behavior.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import Globe from "./Globe";
import type { CountryFeature, GlobeEventData } from "./globeTypes";
import { OrbitControl } from "./OrbitControl";
import { SphericalSurfacePolygonFinder } from "./SphericalSurfacePolygonFinder";
import { createFocusTransitionController } from "./interactiveGlobe/focusTransition";
import { createPinchGestureController } from "./interactiveGlobe/pinchZoom";
import { createSceneLifecycle } from "./interactiveGlobe/sceneLifecycle";
import { createGlobePicker, toGlobeEventData } from "./interactiveGlobe/picking";
import { createPolygonStyleApplicator } from "./interactiveGlobe/polygonStyling";

export type { CountryFeature, GlobeEventData } from "./globeTypes";

type InteractiveGlobeProps = {
  countries?: CountryFeature[];
  globeImageUrl?: string;
  bumpImageUrl?: string;
  highlightOnHover?: boolean;
  pinnedCountryIsoA2?: string;
  clearSelectionSignal?: number;
  focusLatLng?: { lat: number; lng: number };
  focusCountry?: CountryFeature;
  onPointHover?: (point: GlobeEventData | null) => void;
  onPointClick?: (point: GlobeEventData | null) => void;
};

const DEFAULT_CAMERA_DISTANCE = 320;

export function InteractiveGlobe({
  countries = [],
  globeImageUrl,
  bumpImageUrl,
  highlightOnHover = true,
  pinnedCountryIsoA2,
  clearSelectionSignal,
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
  const selectedCountryRef = useRef<CountryFeature | null>(null);
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
    selectedCountryRef.current = null;
    applyStylesRef.current?.();
  }, [clearSelectionSignal]);

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
    const globe = new Globe().polygonsData(countries);

    if (globeImageUrl) {
      globe.globeImageUrl(globeImageUrl);
    }

    if (bumpImageUrl) {
      globe.bumpImageUrl(bumpImageUrl);
    }

    const worldXAxis = new THREE.Vector3(1, 0, 0);
    const worldYAxis = new THREE.Vector3(0, 1, 0);
    const longitudeRotation = new THREE.Quaternion();
    const latitudeRotation = new THREE.Quaternion();
    const maxLatitudeRotation = THREE.MathUtils.degToRad(89.5);
    const minCameraDistance = globe.getGlobeRadius() + 0.1;
    const maxCameraDistance = 540;
    const { scene, camera, renderer, controls, dispose: disposeSceneLifecycle } =
      createSceneLifecycle({
        container,
        minCameraDistance,
        maxCameraDistance,
        initialCameraDistance: DEFAULT_CAMERA_DISTANCE
      });
    const focusTransitionController = createFocusTransitionController();
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

    const applyPolygonStyles = createPolygonStyleApplicator(globe, {
      pinnedIsoRef,
      selectedCountryRef,
      highlightOnHoverRef,
      getHoveredCountry: () => hoveredCountry
    });

    applyStylesRef.current = applyPolygonStyles;

    const { intersectGlobeAtClientPoint, pickCountryAtClientPoint } = createGlobePicker({
      globe,
      camera,
      domElement: renderer.domElement,
      polygonFinder
    });

    const emitHover = (country: CountryFeature | null) => {
      if (hoveredCountry === country) {
        return;
      }

      hoveredCountry = country;
      if (highlightOnHoverRef.current) {
        applyPolygonStyles();
      }

      if (onPointHoverRef.current) {
        onPointHoverRef.current(country ? toGlobeEventData(country) : null);
      }
    };


    // Hover/click logic now handled via OrbitControl callbacks
    const handleHover = (clientX: number, clientY: number, _event: PointerEvent) => {
      if (!highlightOnHoverRef.current && !onPointHoverRef.current) return;
      emitHover(pickCountryAtClientPoint(clientX, clientY));
    };

    const handleClick = (clientX: number, clientY: number, _event: MouseEvent) => {
      const country = pickCountryAtClientPoint(clientX, clientY);
      if (country) {
        selectedCountryRef.current = country;
        applyPolygonStyles();
        if (onPointClickRef.current) onPointClickRef.current(toGlobeEventData(country));
      } else {
        selectedCountryRef.current = null;
        applyPolygonStyles();
        if (onPointClickRef.current) onPointClickRef.current(null);
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


    // pointermove/click now handled by OrbitControl

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
      onMultiTouchStart: () => {
        // Pinch should stop answer-focus interpolation immediately.
        focusTargetRef.current = null;
      },
      onDoubleClick: onCanvasDoubleClick,
      onRotate: (latitude, longitude) => {
        rotationLatitude = latitude;
        rotationLongitude = longitude;
        updateGlobeRotation();
      },
      onHover: handleHover,
      onClick: handleClick
    });
    orbitControl.attach();

    const pinchController = createPinchGestureController({
      domElement: renderer.domElement,
      globe,
      camera,
      maxLatitudeRotation,
      minCameraDistance,
      maxCameraDistance,
      getRotation: () => ({
        latitude: rotationLatitude,
        longitude: rotationLongitude
      }),
      setRotation: (latitude, longitude) => {
        rotationLatitude = latitude;
        rotationLongitude = longitude;
        updateGlobeRotation();
      },
      intersectGlobeAtClientPoint,
      cancelActiveDrag: () => orbitControl?.cancelActiveDrag()
    });
    pinchController.attach();

    applyPolygonStyles();

    scene.add(globe);

    const render = () => {
      const nextFocusState = focusTransitionController.step({
        focusTarget: focusTargetRef.current,
        rotationLatitude,
        rotationLongitude,
        cameraDistance: camera.position.length(),
        maxLatitudeRotation,
        minCameraDistance,
        maxCameraDistance
      });

      if (
        Math.abs(nextFocusState.rotationLatitude - rotationLatitude) > 0.0001 ||
        Math.abs(nextFocusState.rotationLongitude - rotationLongitude) > 0.0001
      ) {
        rotationLatitude = nextFocusState.rotationLatitude;
        rotationLongitude = nextFocusState.rotationLongitude;
        updateGlobeRotation();
      }

      if (Math.abs(nextFocusState.cameraDistance - camera.position.length()) > 0.05) {
        camera.position.setLength(nextFocusState.cameraDistance);
      }

      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      orbitControl?.dispose();
      pinchController.dispose();
      disposeSceneLifecycle();
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
    for (const ring of country.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        points.push([lng, lat]);
      }
    }
  }

  if (country.geometry.type === "MultiPolygon") {
    for (const polygon of country.geometry.coordinates) {
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
