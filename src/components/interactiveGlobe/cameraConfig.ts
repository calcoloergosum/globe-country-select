export const GLOBE_CAMERA_NEAR = 0.25;
export const GLOBE_CAMERA_FAR = 1000;
export const MIN_GLOBE_SURFACE_CLEARANCE = 10;
export const DEFAULT_GLOBE_CAMERA_DISTANCE = 320;
export const MAX_GLOBE_CAMERA_DISTANCE = 540;

export function getMinGlobeCameraDistance(globeRadius: number) {
  return globeRadius + MIN_GLOBE_SURFACE_CLEARANCE;
}
