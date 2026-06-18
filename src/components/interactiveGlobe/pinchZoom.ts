import * as THREE from "three";
import Globe from "../Globe";
import {
  deriveKabschRotationForTwoPointPairs,
  removeRollFromRotation
} from "../../utils/interaction";

type RotationState = {
  latitude: number;
  longitude: number;
};

type PinchGestureControllerDeps = {
  domElement: HTMLElement;
  globe: Globe;
  camera: THREE.PerspectiveCamera;
  maxLatitudeRotation: number;
  minCameraDistance: number;
  maxCameraDistance: number;
  getRotation: () => RotationState;
  setRotation: (latitude: number, longitude: number) => void;
  intersectGlobeAtClientPoint: (
    clientX: number,
    clientY: number,
    outPointOnSurface: THREE.Vector3
  ) => THREE.Vector3 | null;
  cancelActiveDrag?: () => void;
  onChange?: () => void;
};

function normalizeRadians(angle: number) {
  const wrapped = THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2);
  return wrapped - Math.PI;
}

function getTouchCenterAndDist(touches: TouchList) {
  if (touches.length !== 2) {
    return null;
  }

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

export function createPinchGestureController({
  domElement,
  globe,
  camera,
  maxLatitudeRotation,
  minCameraDistance,
  maxCameraDistance,
  getRotation,
  setRotation,
  intersectGlobeAtClientPoint,
  cancelActiveDrag,
  onChange
}: PinchGestureControllerDeps) {
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

  let lastPinchDist: number | null = null;
  let smoothedPinchDist: number | null = null;
  let lastPinchCenter: { x: number; y: number } | null = null;
  let hasPinchAnchors = false;
  let hasPinchCenterAnchor = false;

  const minPinchRotationPixelSpan = 24;
  const minPinchRotationChord = 0.04;
  const minPinchRotationChordSq = minPinchRotationChord * minPinchRotationChord;
  const minPinchCenterMotionPixels = 1.5;
  const pinchDistanceSmoothing = 0.35;
  const minPinchDistanceDeltaPixels = 1.5;
  const minPinchScaleLogDelta = 0.0035;

  const latLngFromQuaternion = (orientation: THREE.Quaternion) => {
    pinchOrientationMatrix.makeRotationFromQuaternion(orientation);
    const e = pinchOrientationMatrix.elements;

    return {
      latitude: Math.asin(THREE.MathUtils.clamp(e[6], -1, 1)),
      longitude: Math.atan2(e[8], e[0])
    };
  };

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

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 2) {
      return;
    }

    cancelActiveDrag?.();

    const info = getTouchCenterAndDist(event.touches);
    if (!info) {
      return;
    }

    lastPinchDist = info.dist;
    smoothedPinchDist = info.dist;
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

    const touchA = event.touches[0];
    const touchB = event.touches[1];
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
  };

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 2 || lastPinchDist === null) {
      return;
    }

    event.preventDefault();

    const info = getTouchCenterAndDist(event.touches);
    if (!info) {
      return;
    }

    const centerMotionPx = lastPinchCenter
      ? Math.hypot(info.center.x - lastPinchCenter.x, info.center.y - lastPinchCenter.y)
      : 0;

    const touchA = event.touches[0];
    const touchB = event.touches[1];
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

    const previousPinchDist = lastPinchDist;
    const nextSmoothedPinchDist =
      smoothedPinchDist === null
        ? info.dist
        : THREE.MathUtils.lerp(smoothedPinchDist, info.dist, pinchDistanceSmoothing);
    smoothedPinchDist = nextSmoothedPinchDist;

    const pinchDistanceDeltaPixels = Math.abs(nextSmoothedPinchDist - previousPinchDist);
    let distancePinchScale = 1;

    if (pinchDistanceDeltaPixels >= minPinchDistanceDeltaPixels && previousPinchDist > 0) {
      distancePinchScale = THREE.MathUtils.clamp(
        nextSmoothedPinchDist / previousPinchDist,
        0.92,
        1.08
      );

      if (Math.abs(Math.log(distancePinchScale)) < minPinchScaleLogDelta) {
        distancePinchScale = 1;
      }
    }

    let pinchScale = distancePinchScale;
    const currentRotation = getRotation();
    let nextLatitude = currentRotation.latitude;
    let nextLongitude = currentRotation.longitude;
    let didChange = false;

    if (canRotateFromCenter && targetSurfaceCenter) {
      pinchCenterAnchorWorld.copy(pinchCenterAnchorLocal).applyQuaternion(globe.quaternion).normalize();

      pinchCenterRotationDelta.setFromUnitVectors(
        pinchCenterAnchorWorld,
        targetSurfaceCenter
      );
      pinchComposedOrientation
        .copy(pinchCenterRotationDelta)
        .multiply(globe.quaternion);

      const { latitude, longitude } = latLngFromQuaternion(pinchComposedOrientation);
      nextLatitude = THREE.MathUtils.clamp(latitude, -maxLatitudeRotation, maxLatitudeRotation);
      nextLongitude = normalizeRadians(longitude);
      setRotation(nextLatitude, nextLongitude);
      didChange = true;
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

      // Remove roll and keep globe upright while applying pinch rotation.
      removeRollFromRotation(kabschResult.rotation, pinchRotationDelta);

      pinchComposedOrientation.copy(pinchRotationDelta).multiply(globe.quaternion);
      const { latitude, longitude } = latLngFromQuaternion(pinchComposedOrientation);
      nextLatitude = THREE.MathUtils.clamp(latitude, -maxLatitudeRotation, maxLatitudeRotation);
      nextLongitude = normalizeRadians(longitude);
      setRotation(nextLatitude, nextLongitude);
      didChange = true;

      if (
        distancePinchScale !== 1 &&
        kabschResult.scale > 1e-6 &&
        Number.isFinite(kabschResult.scale)
      ) {
        const clampedKabschScale = THREE.MathUtils.clamp(kabschResult.scale, 0.92, 1.08);
        pinchScale = THREE.MathUtils.lerp(distancePinchScale, clampedKabschScale, 0.2);
      }
    }

    if (pinchScale !== 1) {
      const newDistance = THREE.MathUtils.clamp(
        camera.position.length() / pinchScale,
        minCameraDistance,
        maxCameraDistance
      );
      camera.position.setLength(newDistance);
      didChange = true;
    }

    lastPinchDist = nextSmoothedPinchDist;
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
      updatePinchAnchorsFromWorld(targetSurfaceA, targetSurfaceB, info.dist);
    } else {
      hasPinchAnchors = false;
    }

    if (didChange) {
      onChange?.();
    }
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (event.touches.length >= 2) {
      return;
    }

    lastPinchDist = null;
    smoothedPinchDist = null;
    lastPinchCenter = null;
    hasPinchAnchors = false;
    hasPinchCenterAnchor = false;
  };

  return {
    attach() {
      domElement.addEventListener("touchstart", onTouchStart, { passive: false });
      domElement.addEventListener("touchmove", onTouchMove, { passive: false });
      domElement.addEventListener("touchend", onTouchEnd);
      domElement.addEventListener("touchcancel", onTouchEnd);
    },
    dispose() {
      domElement.removeEventListener("touchstart", onTouchStart);
      domElement.removeEventListener("touchmove", onTouchMove);
      domElement.removeEventListener("touchend", onTouchEnd);
      domElement.removeEventListener("touchcancel", onTouchEnd);
    }
  };
}
