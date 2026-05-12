// Main integration layer for renderer, controls, picking, highlighting, quiz focus camera behavior.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Globe from "./Globe";
import type { CountryFeature, GlobeEventData } from "./globeTypes";
import { OrbitControl } from "./OrbitControl";
import { SphericalSurfacePolygonFinder } from "./SphericalSurfacePolygonFinder";
import { createFocusTransitionController } from "./interactiveGlobe/focusTransition";
import { createGlobePicker, toGlobeEventData } from "./interactiveGlobe/picking";
import { createPolygonStyleApplicator } from "./interactiveGlobe/polygonStyling";
import {
  deriveKabschRotationForTwoPointPairs,
  removeRollFromRotation
} from "../utils/interaction";

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

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 560;
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
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    const keyDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyDirectionalLight.position.set(-280, 220, 320);
    const fillDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.55);
    fillDirectionalLight.position.set(240, -140, -240);
    scene.add(ambientLight, keyDirectionalLight, fillDirectionalLight);

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
    const pinchAnchorLocalA = new THREE.Vector3();
    const pinchAnchorLocalB = new THREE.Vector3();
    const pinchAnchorWorldA = new THREE.Vector3();
    const pinchAnchorWorldB = new THREE.Vector3();
    const pinchCenterAnchorLocal = new THREE.Vector3();
    const pinchCenterAnchorWorld = new THREE.Vector3();
    const pinchTargetSurfaceA = new THREE.Vector3();
    const pinchTargetSurfaceB = new THREE.Vector3();
    const pinchTargetSurfaceCenter = new THREE.Vector3();
    const pinchRotationDelta = new THREE.Quaternion();
    const pinchCenterRotationDelta = new THREE.Quaternion();
    const pinchComposedOrientation = new THREE.Quaternion();
    const pinchOrientationMatrix = new THREE.Matrix4();
    const pinchInverseOrientation = new THREE.Quaternion();
    const maxLatitudeRotation = THREE.MathUtils.degToRad(89.5);
    const minCameraDistance = globe.getGlobeRadius() + 0.1;
    const maxCameraDistance = 540;
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

    const normalizeRadians = (angle: number) => {
      const wrapped = THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2);
      return wrapped - Math.PI;
    };

    const latLngFromQuaternion = (orientation: THREE.Quaternion) => {
      pinchOrientationMatrix.makeRotationFromQuaternion(orientation);
      const e = pinchOrientationMatrix.elements;
      return {
        latitude: Math.asin(THREE.MathUtils.clamp(e[6], -1, 1)),
        longitude: Math.atan2(e[8], e[0])
      };
    };

    // --- Pinch-to-zoom handler for mobile ---
    let lastPinchDist: number | null = null;
    let lastPinchCenter: { x: number; y: number } | null = null;
    let hasPinchAnchors = false;
    let hasPinchCenterAnchor = false;
    const minPinchRotationPixelSpan = 24;
    const minPinchRotationChord = 0.04;
    const minPinchRotationChordSq = minPinchRotationChord * minPinchRotationChord;
    const minPinchCenterMotionPixels = 1.5;

    const canSolvePinchRotation = (
      pointA: THREE.Vector3,
      pointB: THREE.Vector3,
      pixelDistance: number
    ) => {
      if (pixelDistance < minPinchRotationPixelSpan) {
        return false;
      }

      return pointA.distanceToSquared(pointB) >= minPinchRotationChordSq;
    };

    const updatePinchAnchorsFromWorld = (
      worldPointA: THREE.Vector3,
      worldPointB: THREE.Vector3,
      pixelDistance: number
    ) => {
      if (!canSolvePinchRotation(worldPointA, worldPointB, pixelDistance)) {
        hasPinchAnchors = false;
        return;
      }

      pinchInverseOrientation.copy(globe.quaternion).invert();
      pinchAnchorLocalA.copy(worldPointA).applyQuaternion(pinchInverseOrientation).normalize();
      pinchAnchorLocalB.copy(worldPointB).applyQuaternion(pinchInverseOrientation).normalize();
      hasPinchAnchors = true;
    };

    function getTouchCenterAndDist(touches: TouchList) {
      if (touches.length !== 2) return null;
      const [t1, t2] = touches;
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return {
        center: {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        },
        dist: Math.sqrt(dx * dx + dy * dy)
      };
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        orbitControl?.cancelActiveDrag();
        const info = getTouchCenterAndDist(e.touches);
        if (info) {
          lastPinchDist = info.dist;
          lastPinchCenter = {
            x: info.center.x,
            y: info.center.y
          };

          const centerSurface = intersectGlobeAtClientPoint(
            info.center.x,
            info.center.y,
            pinchTargetSurfaceCenter
          );

          if (centerSurface) {
            pinchInverseOrientation.copy(globe.quaternion).invert();
            pinchCenterAnchorLocal
              .copy(centerSurface)
              .applyQuaternion(pinchInverseOrientation)
              .normalize();
            hasPinchCenterAnchor = true;
          } else {
            hasPinchCenterAnchor = false;
          }

          const touchA = e.touches[0];
          const touchB = e.touches[1];
          const anchorWorldA = intersectGlobeAtClientPoint(
            touchA.clientX,
            touchA.clientY,
            pinchAnchorWorldA
          );
          const anchorWorldB = intersectGlobeAtClientPoint(
            touchB.clientX,
            touchB.clientY,
            pinchAnchorWorldB
          );

          if (anchorWorldA && anchorWorldB) {
            updatePinchAnchorsFromWorld(anchorWorldA, anchorWorldB, info.dist);
          } else {
            hasPinchAnchors = false;
          }
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && lastPinchDist !== null) {
        e.preventDefault();
        const info = getTouchCenterAndDist(e.touches);
        if (!info) return;

        const centerMotionPx = lastPinchCenter
          ? Math.hypot(info.center.x - lastPinchCenter.x, info.center.y - lastPinchCenter.y)
          : 0;

        const touchA = e.touches[0];
        const touchB = e.touches[1];
        const targetSurfaceA = intersectGlobeAtClientPoint(
          touchA.clientX,
          touchA.clientY,
          pinchTargetSurfaceA
        );
        const targetSurfaceB = intersectGlobeAtClientPoint(
          touchB.clientX,
          touchB.clientY,
          pinchTargetSurfaceB
        );
        const targetSurfaceCenter = intersectGlobeAtClientPoint(
          info.center.x,
          info.center.y,
          pinchTargetSurfaceCenter
        );

        const canRotateFromTargets =
          !!targetSurfaceA &&
          !!targetSurfaceB &&
          canSolvePinchRotation(targetSurfaceA, targetSurfaceB, info.dist);
        const canRotateFromCenter =
          centerMotionPx >= minPinchCenterMotionPixels &&
          hasPinchCenterAnchor &&
          !!targetSurfaceCenter;

        const distancePinchScale = THREE.MathUtils.clamp(info.dist / lastPinchDist, 0.92, 1.08);
        let pinchScale = distancePinchScale;

        if (canRotateFromCenter && targetSurfaceCenter) {
          pinchCenterAnchorWorld
            .copy(pinchCenterAnchorLocal)
            .applyQuaternion(globe.quaternion)
            .normalize();

          pinchCenterRotationDelta.setFromUnitVectors(
            pinchCenterAnchorWorld,
            targetSurfaceCenter
          );
          pinchComposedOrientation
            .copy(pinchCenterRotationDelta)
            .multiply(globe.quaternion);

          const { latitude, longitude } = latLngFromQuaternion(pinchComposedOrientation);
          rotationLatitude = THREE.MathUtils.clamp(
            latitude,
            -maxLatitudeRotation,
            maxLatitudeRotation
          );
          rotationLongitude = normalizeRadians(longitude);
          updateGlobeRotation();
        } else if (hasPinchAnchors && canRotateFromTargets && targetSurfaceA && targetSurfaceB) {
          pinchAnchorWorldA.copy(pinchAnchorLocalA).applyQuaternion(globe.quaternion).normalize();
          pinchAnchorWorldB.copy(pinchAnchorLocalB).applyQuaternion(globe.quaternion).normalize();

          const kabschResult = deriveKabschRotationForTwoPointPairs({
            sourcePointA: pinchAnchorWorldA,
            sourcePointB: pinchAnchorWorldB,
            targetPointA: targetSurfaceA,
            targetPointB: targetSurfaceB,
            outRotation: pinchRotationDelta
          });

          // Remove roll, keep only yaw/pitch
          removeRollFromRotation(kabschResult.rotation, pinchRotationDelta);

          // Compose new orientation from current orientation and pinch delta
          pinchComposedOrientation.copy(pinchRotationDelta).multiply(globe.quaternion);
          const { latitude, longitude } = latLngFromQuaternion(pinchComposedOrientation);
          rotationLatitude = THREE.MathUtils.clamp(
            latitude,
            -maxLatitudeRotation,
            maxLatitudeRotation
          );
          rotationLongitude = normalizeRadians(longitude);

          // Clamp and apply
          updateGlobeRotation();

          if (kabschResult.scale > 1e-6 && Number.isFinite(kabschResult.scale)) {
            const clampedKabschScale = THREE.MathUtils.clamp(kabschResult.scale, 0.92, 1.08);
            // Blend geometric fit with raw finger-distance scale to reduce jitter.
            pinchScale = THREE.MathUtils.lerp(distancePinchScale, clampedKabschScale, 0.35);
          }
        }

        const newDistance = THREE.MathUtils.clamp(
          camera.position.length() / pinchScale,
          minCameraDistance,
          maxCameraDistance
        );
        camera.position.setLength(newDistance);

        lastPinchDist = info.dist;
        lastPinchCenter = {
          x: info.center.x,
          y: info.center.y
        };

        if (targetSurfaceCenter) {
          pinchInverseOrientation.copy(globe.quaternion).invert();
          pinchCenterAnchorLocal
            .copy(targetSurfaceCenter)
            .applyQuaternion(pinchInverseOrientation)
            .normalize();
          hasPinchCenterAnchor = true;
        } else {
          hasPinchCenterAnchor = false;
        }

        if (targetSurfaceA && targetSurfaceB) {
          // Re-anchor each frame so pinch rotation uses incremental deltas
          // and does not accumulate drift from the initial touch pair.
          updatePinchAnchorsFromWorld(targetSurfaceA, targetSurfaceB, info.dist);
        } else {
          hasPinchAnchors = false;
        }
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        lastPinchDist = null;
        lastPinchCenter = null;
        hasPinchAnchors = false;
        hasPinchCenterAnchor = false;
      }
    }

    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd);
    renderer.domElement.addEventListener("touchcancel", onTouchEnd);

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

    applyPolygonStyles();

    scene.add(globe);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.enableZoom = true;
    controls.enableRotate = false;
    controls.touches.TWO = THREE.TOUCH.PAN;
    controls.zoomToCursor = false;
    controls.zoomSpeed = 1.0;
    controls.minDistance = minCameraDistance;
    controls.maxDistance = maxCameraDistance;

    let lastKnownWidth = DEFAULT_WIDTH;
    let lastKnownHeight = DEFAULT_HEIGHT;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(Math.round(rect.width), 1);
      const height = Math.max(Math.round(rect.height), 1);

      // During mobile orientation/layout transitions, dimensions can briefly
      // collapse to 0; keep the last stable size until the next update.
      const stableWidth = width > 1 ? width : lastKnownWidth;
      const stableHeight = height > 1 ? height : lastKnownHeight;

      lastKnownWidth = stableWidth;
      lastKnownHeight = stableHeight;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      camera.aspect = stableWidth / stableHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stableWidth, stableHeight, false);
    };

    const observer = new ResizeObserver(() => resize());
    observer.observe(container);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    window.visualViewport?.addEventListener("resize", resize);

    resize();

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
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      orbitControl?.dispose();
      controls.dispose();

      // pointermove/click listeners now managed by OrbitControl
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      renderer.domElement.removeEventListener("touchcancel", onTouchEnd);

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
