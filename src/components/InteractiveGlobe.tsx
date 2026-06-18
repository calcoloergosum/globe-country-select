// Main integration layer for renderer, controls, picking, highlighting, quiz focus camera behavior.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import Globe, { DEFAULT_GLOBE_RADIUS } from "./Globe";
import type { CountryFeature, GlobeEventData } from "./globeTypes";
import { OrbitControl } from "./OrbitControl";
import { SphericalSurfacePolygonFinder } from "./SphericalSurfacePolygonFinder";
import { createPinchGestureController } from "./interactiveGlobe/pinchZoom";
import { createRenderLoopController } from "./interactiveGlobe/renderLoop";
import { createSceneLifecycle } from "./interactiveGlobe/sceneLifecycle";
import { createGlobePicker, toGlobeEventData } from "./interactiveGlobe/picking";
import { createPolygonStyleApplicator } from "./interactiveGlobe/polygonStyling";
import {
  DEFAULT_GLOBE_CAMERA_DISTANCE,
  MAX_GLOBE_CAMERA_DISTANCE,
  clampFocusGlobeCameraDistance,
  getMinGlobeCameraDistance
} from "./interactiveGlobe/cameraConfig";

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
  enableProximityPicking?: boolean;
  onPointHover?: (point: GlobeEventData | null) => void;
  onPointClick?: (point: GlobeEventData | null) => void;
};

export function InteractiveGlobe({
  countries = [],
  globeImageUrl,
  bumpImageUrl,
  highlightOnHover = true,
  pinnedCountryIsoA2,
  clearSelectionSignal,
  focusLatLng,
  focusCountry,
  enableProximityPicking = true,
  onPointHover,
  onPointClick
}: InteractiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const polygonFinder = useMemo(
    () => new SphericalSurfacePolygonFinder(countries, { enableProximity: enableProximityPicking }),
    [countries, enableProximityPicking]
  );
  const onPointHoverRef = useRef(onPointHover);
  const onPointClickRef = useRef(onPointClick);
  const pinnedIsoRef = useRef(pinnedCountryIsoA2);
  const selectedCountryRef = useRef<CountryFeature | null>(null);
  const highlightOnHoverRef = useRef(highlightOnHover);
  const applyStylesRef = useRef<(() => void) | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
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
      requestRenderRef.current?.();
      return;
    }

    focusTargetRef.current = {
      lat: focusLatLng.lat,
      lng: focusLatLng.lng,
      zoomDistance: focusCountry ? getFitDistanceForCountry(focusCountry) : undefined
    };
    requestRenderRef.current?.();
  }, [focusCountry, focusLatLng]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const requestRender = () => requestRenderRef.current?.();
    const globe = new Globe({ requestRender }).polygonsData(countries);

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
    const minCameraDistance = getMinGlobeCameraDistance(globe.getGlobeRadius());
    const maxCameraDistance = MAX_GLOBE_CAMERA_DISTANCE;
    const { scene, camera, renderer, controls, dispose: disposeSceneLifecycle } =
      createSceneLifecycle({
        container,
        minCameraDistance,
        maxCameraDistance,
        initialCameraDistance: DEFAULT_GLOBE_CAMERA_DISTANCE,
        onResize: requestRender
      });
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
      camera.position.set(0, 0, DEFAULT_GLOBE_CAMERA_DISTANCE);
      controls.update();
      requestRender();
    };


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
        requestRender();
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
      cancelActiveDrag: () => orbitControl?.cancelActiveDrag(),
      onChange: requestRender
    });
    pinchController.attach();

    applyPolygonStyles();

    scene.add(globe);

    const renderLoopController = createRenderLoopController({
      scene,
      camera,
      renderer,
      controls,
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
        requestRender();
      },
      getFocusTarget: () => focusTargetRef.current
    });
    requestRenderRef.current = renderLoopController.requestRender;
    renderLoopController.start();

    return () => {
      requestRenderRef.current = null;
      renderLoopController.stop();
      orbitControl?.dispose();
      pinchController.dispose();
      scene.remove(globe);
      globe.dispose();
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

  const globeRadius = DEFAULT_GLOBE_RADIUS;
  const fovY = THREE.MathUtils.degToRad(45);
  const marginFactor = 0.72;
  const tangent = Math.tan(fovY / 2) * marginFactor;

  const distance =
    globeRadius * Math.cos(angularRadius) +
    (globeRadius * Math.sin(angularRadius)) / Math.max(tangent, 0.01);

  return clampFocusGlobeCameraDistance(distance, globeRadius);
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
