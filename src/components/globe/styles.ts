// Polygon material style helpers for resolving accessors and parsing colors.
import * as THREE from "three";
import type { CountryFeature } from "../globeTypes";
import type { ColorAccessor, NumericAccessor, ParsedColor } from "./types";

export function applyColorToMaterial(
  material: THREE.MeshPhongMaterial | THREE.LineBasicMaterial,
  style: ParsedColor
) {
  material.color.copy(style.color);
  material.opacity = style.opacity;
  material.transparent = style.opacity < 1;
}

export function pickFillColor(primary: ParsedColor, fallback: ParsedColor) {
  return primary.opacity > 0 ? primary : fallback;
}

export function resolveNumericAccessor(accessor: NumericAccessor, country: CountryFeature) {
  return typeof accessor === "function" ? accessor(country) : accessor;
}

export function resolveColorAccessor(accessor: ColorAccessor, country: CountryFeature) {
  const value = typeof accessor === "function" ? accessor(country) : accessor;
  return parseColor(value);
}

function parseColor(value: string): ParsedColor {
  const normalized = value.trim();

  if (!normalized || normalized.toLowerCase() === "transparent") {
    return { color: new THREE.Color(0xffffff), opacity: 0 };
  }

  const rgbaMatch = normalized.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbaMatch) {
    const red = clamp01(Number(rgbaMatch[1]) / 255);
    const green = clamp01(Number(rgbaMatch[2]) / 255);
    const blue = clamp01(Number(rgbaMatch[3]) / 255);
    const alpha = rgbaMatch[4] === undefined ? 1 : clamp01(Number(rgbaMatch[4]));

    return {
      color: new THREE.Color(red, green, blue),
      opacity: alpha
    };
  }

  return {
    color: new THREE.Color(normalized),
    opacity: 1
  };
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}
