/*
Core requirements for OrbitControl:
- Begin orbit only when primary pointer-down starts on the globe surface.
- Convert drag movement into stable yaw (longitude) + pitch (latitude) updates.
- Clamp pitch to maxLatitudeRotation and normalize yaw to [-PI, PI).
- Keep roll at zero by recomposing orientation from latitude/longitude only.
- Keep center of the view fixed at (0, 0).
- Use pointer capture so drag remains active outside the canvas bounds.
- Expose one-shot drag suppression for click handlers via consumeDidDrag().
- Keep math allocation-light by reusing vectors/quaternions per move event.
*/
import * as THREE from "three";

// Runtime dependencies injected by the parent scene.
// This keeps the control focused on pointer->rotation translation without
// directly depending on camera/globe implementation details.
type OrbitControlOptions = {
  // Canvas element receiving pointer events.
  domElement: HTMLElement;
  // Hard pitch limit in radians to avoid pole flip / upside-down orientation.
  maxLatitudeRotation: number;
  // Returns world-space unit vector where cursor ray intersects the globe.
  // Returning null means no globe hit at the given client point.
  getSurfacePointAtClientPoint: (
    clientX: number,
    clientY: number,
    outPointOnSurface: THREE.Vector3
  ) => THREE.Vector3 | null;
  // Callback for publishing updated pitch/yaw values.
  onRotate: (rotationLatitude: number, rotationLongitude: number) => void;
  // Returns the current external pitch/yaw, used to resync before drag starts.
  getRotation?: () => { latitude: number; longitude: number };
  // Optional hook fired once when a valid drag gesture starts.
  onDragStart?: () => void;
};

// Wrap angle to [-PI, PI) to keep longitude numerically stable over long drags.
const normalizeRadians = (angle: number) => {
  const wrapped = THREE.MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2);
  return wrapped - Math.PI;
};

// Pointer-driven orbit helper for custom globe rotation behavior.
//
// Design goals:
// - Start drag only when user presses directly on the globe.
// - Convert screen-space deltas into yaw/pitch in a deterministic way.
// - Suppress click selection immediately after drag gestures.
// - Keep state local so the parent component can remain declarative.
export class OrbitControl {
  private readonly options: OrbitControlOptions;
  // Surface point anchored at drag-start in globe-local coordinates.
  private readonly dragAnchorLocal = new THREE.Vector3();
  private hasDragAnchor = false;

  // Shared scratch objects for per-move math without allocations.
  private readonly dragStartSurfaceWorld = new THREE.Vector3();
  private readonly currentSurfaceWorld = new THREE.Vector3();
  private readonly currentAnchorWorld = new THREE.Vector3();
  private readonly inverseOrientation = new THREE.Quaternion();
  private readonly currentOrientation = new THREE.Quaternion();
  private readonly rotationDelta = new THREE.Quaternion();
  private readonly candidateOrientation = new THREE.Quaternion();
  private readonly composedOrientation = new THREE.Quaternion();
  private readonly longitudeRotation = new THREE.Quaternion();
  private readonly latitudeRotation = new THREE.Quaternion();
  private readonly worldXAxis = new THREE.Vector3(1, 0, 0);
  private readonly worldYAxis = new THREE.Vector3(0, 1, 0);
  private readonly orientationMatrix = new THREE.Matrix4();

  // Active pointer tracking for robust pointer-capture flow.
  private activePointerId: number | null = null;
  private isDragging = false;

  // One-shot click suppression flag consumed by the parent click handler.
  private didDrag = false;

  // Current persisted rotation values.
  private rotationLatitude = 0;
  private rotationLongitude = 0;

  constructor(options: OrbitControlOptions) {
    this.options = options;
  }

  // Register low-level pointer listeners.
  // Parent handlers (hover/click) can coexist and query current drag state.
  attach() {
    this.options.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.options.domElement.addEventListener("pointermove", this.onPointerMove);
    this.options.domElement.addEventListener("pointerup", this.endPointerDrag);
    this.options.domElement.addEventListener("pointercancel", this.endPointerDrag);
  }

  // Remove listeners to prevent leaks when scene/component unmounts.
  dispose() {
    this.options.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.options.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.options.domElement.removeEventListener("pointerup", this.endPointerDrag);
    this.options.domElement.removeEventListener("pointercancel", this.endPointerDrag);
  }

  // Read-only query for "currently dragging".
  // Used by hover logic to avoid expensive picking during active drag.
  isPointerDragging() {
    return this.isDragging;
  }

  // Returns whether a drag occurred since the last call, then clears the flag.
  // This allows click handlers to ignore click events generated at drag end.
  consumeDidDrag() {
    const dragged = this.didDrag;
    this.didDrag = false;
    return dragged;
  }

  private onPointerDown = (event: PointerEvent) => {
    // Only handle primary left-button interactions and only one active drag.
    if (!event.isPrimary || event.button !== 0 || this.activePointerId !== null) {
      return;
    }

    const hitPoint = this.options.getSurfacePointAtClientPoint(
      event.clientX,
      event.clientY,
      this.dragStartSurfaceWorld
    );

    // Ignore presses that do not begin on the globe surface.
    if (!hitPoint) {
      return;
    }

    // External animation (focus) may update rotation while idle; resync so
    // drag math starts from the actual rendered orientation.
    const currentRotation = this.options.getRotation?.();
    if (currentRotation) {
      this.rotationLatitude = currentRotation.latitude;
      this.rotationLongitude = currentRotation.longitude;
    }

    this.orientationFromLatLng(
      this.rotationLatitude,
      this.rotationLongitude,
      this.currentOrientation
    );
    this.inverseOrientation.copy(this.currentOrientation).invert();
    this.dragAnchorLocal.copy(hitPoint).applyQuaternion(this.inverseOrientation);
    this.hasDragAnchor = true;
    this.options.onDragStart?.();

    // Capture this pointer so move/up still arrive even if cursor leaves canvas.
    this.activePointerId = event.pointerId;
    this.isDragging = true;
    this.didDrag = false;
    this.options.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    // Ignore unrelated pointers and idle moves.
    if (!this.isDragging || event.pointerId !== this.activePointerId) {
      return;
    }

    if (!this.hasDragAnchor) {
      return;
    }

    const targetSurface = this.options.getSurfacePointAtClientPoint(
      event.clientX,
      event.clientY,
      this.currentSurfaceWorld
    );
    if (!targetSurface) {
      return;
    }

    this.orientationFromLatLng(
      this.rotationLatitude,
      this.rotationLongitude,
      this.currentOrientation
    );

    this.currentAnchorWorld
      .copy(this.dragAnchorLocal)
      .applyQuaternion(this.currentOrientation)
      .normalize();

    this.rotationDelta.setFromUnitVectors(this.currentAnchorWorld, targetSurface);
    this.candidateOrientation.copy(this.rotationDelta).multiply(this.currentOrientation);

    const { latitude, longitude } = this.latLngFromOrientation(this.candidateOrientation);
    this.rotationLatitude = THREE.MathUtils.clamp(
      latitude,
      -this.options.maxLatitudeRotation,
      this.options.maxLatitudeRotation
    );
    this.rotationLongitude = normalizeRadians(longitude);

    // Push current orientation to parent renderer.
    this.options.onRotate(this.rotationLatitude, this.rotationLongitude);

    // Mark this gesture as drag so click selection can be suppressed once.
    this.didDrag = true;
  };

  private endPointerDrag = (event: PointerEvent) => {
    // Only the active pointer can end the gesture.
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.isDragging = false;
    this.activePointerId = null;
    this.hasDragAnchor = false;

    // Best-effort cleanup of pointer capture state.
    if (this.options.domElement.hasPointerCapture(event.pointerId)) {
      this.options.domElement.releasePointerCapture(event.pointerId);
    }
  };

  private orientationFromLatLng(lat: number, lng: number, out: THREE.Quaternion) {
    this.longitudeRotation.setFromAxisAngle(this.worldYAxis, lng);
    this.latitudeRotation.setFromAxisAngle(this.worldXAxis, lat);
    out.copy(this.latitudeRotation).multiply(this.longitudeRotation);
    return out;
  }

  private latLngFromOrientation(orientation: THREE.Quaternion) {
    this.orientationMatrix.makeRotationFromQuaternion(orientation);
    const e = this.orientationMatrix.elements;

    // Decompose R = Rx(latitude) * Ry(longitude).
    const latitude = Math.asin(THREE.MathUtils.clamp(e[6], -1, 1));
    const longitude = Math.atan2(e[8], e[0]);

    // Recompose to ensure the control remains roll-free and axis-stable.
    this.orientationFromLatLng(latitude, longitude, this.composedOrientation);

    return {
      latitude,
      longitude
    };
  }
}