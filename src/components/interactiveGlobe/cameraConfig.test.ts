import { describe, expect, it } from "vitest";

import { DEFAULT_GLOBE_RADIUS } from "../Globe";
import {
  MAX_FOCUS_GLOBE_CAMERA_DISTANCE,
  clampFocusGlobeCameraDistance,
  getMinFocusGlobeCameraDistance,
  getMinGlobeCameraDistance
} from "./cameraConfig";

describe("cameraConfig", () => {
  it("derives the minimum focus distance from the safe globe camera clearance", () => {
    expect(getMinFocusGlobeCameraDistance(DEFAULT_GLOBE_RADIUS)).toBe(
      getMinGlobeCameraDistance(DEFAULT_GLOBE_RADIUS)
    );
  });

  it("clamps focus distance to the named min and max focus distances", () => {
    expect(clampFocusGlobeCameraDistance(1, DEFAULT_GLOBE_RADIUS)).toBe(
      getMinFocusGlobeCameraDistance(DEFAULT_GLOBE_RADIUS)
    );
    expect(
      clampFocusGlobeCameraDistance(
        MAX_FOCUS_GLOBE_CAMERA_DISTANCE + 100,
        DEFAULT_GLOBE_RADIUS
      )
    ).toBe(MAX_FOCUS_GLOBE_CAMERA_DISTANCE);
  });
});
