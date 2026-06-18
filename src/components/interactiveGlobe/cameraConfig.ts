// The globe is a mesh sphere with country overlays slightly above the surface.
// Keep the camera outside a shell that is comfortably wider than the near plane
// and beyond elevated polygon/stroke geometry, or close zoom can clip the globe.
export const GLOBE_CAMERA_NEAR = 0.25;
export const GLOBE_CAMERA_FAR = 1000;
export const MIN_GLOBE_SURFACE_CLEARANCE = 10;
export const DEFAULT_GLOBE_CAMERA_DISTANCE = 320;
export const MAX_GLOBE_CAMERA_DISTANCE = 540;
export const MAX_FOCUS_GLOBE_CAMERA_DISTANCE = 480;

export function getMinGlobeCameraDistance(globeRadius: number) {
  return globeRadius + MIN_GLOBE_SURFACE_CLEARANCE;
}

export function getMinFocusGlobeCameraDistance(globeRadius: number) {
  return getMinGlobeCameraDistance(globeRadius);
}

export function clampFocusGlobeCameraDistance(distance: number, globeRadius: number) {
  return Math.min(
    Math.max(distance, getMinFocusGlobeCameraDistance(globeRadius)),
    MAX_FOCUS_GLOBE_CAMERA_DISTANCE
  );
}
