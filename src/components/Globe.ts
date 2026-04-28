import * as THREE from "three";
import type { CountryFeature } from "./globeTypes";

type LngLat = readonly [number, number];
type PolygonRing = LngLat[];
type CountryPolygon = PolygonRing[];
type NumericAccessor = number | ((country: object) => number);
type ColorAccessor = string | ((country: object) => string);

type PolygonVisual = {
  country: CountryFeature;
  fillGeometry: THREE.BufferGeometry | null;
  fillUnitVectors: THREE.Vector3[];
  fillMaterial: THREE.MeshPhongMaterial | null;
  strokeGeometries: THREE.BufferGeometry[];
  strokeUnitVectors: THREE.Vector3[][];
  strokeMaterials: THREE.LineBasicMaterial[];
};

const DEFAULT_GLOBE_RADIUS = 100;
const DEFAULT_SEGMENTS = 64;
const STROKE_ALTITUDE_OFFSET = 0.0012;

export default class Globe extends THREE.Group {
  private readonly globeRadius = DEFAULT_GLOBE_RADIUS;
  private readonly globeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
  private readonly globeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(DEFAULT_GLOBE_RADIUS, DEFAULT_SEGMENTS, DEFAULT_SEGMENTS),
    this.globeMaterial
  );
  private readonly polygonsGroup = new THREE.Group();
  private readonly textureLoader = new THREE.TextureLoader();

  private countries: CountryFeature[] = [];
  private polygonAltitudeAccessor: NumericAccessor = 0;
  private polygonCapColorAccessor: ColorAccessor = "rgba(0, 0, 0, 0)";
  private polygonSideColorAccessor: ColorAccessor = "rgba(0, 0, 0, 0)";
  private polygonStrokeColorAccessor: ColorAccessor = "rgba(0, 0, 0, 0)";
  private polygonVisuals: PolygonVisual[] = [];
  private globeTextureRequestId = 0;
  private bumpTextureRequestId = 0;
  private polygonRefreshQueued = false;

  constructor() {
    super();
    this.globeMesh.castShadow = false;
    this.globeMesh.receiveShadow = false;
    this.globeMesh.rotation.y = -Math.PI / 2;
    this.globeMesh.renderOrder = 0;
    this.polygonsGroup.renderOrder = 1;
    this.add(this.globeMesh);
    this.add(this.polygonsGroup);
  }

  globeImageUrl(url: string) {
    const requestId = ++this.globeTextureRequestId;
    this.textureLoader.load(url, (texture) => {
      if (requestId !== this.globeTextureRequestId) {
        texture.dispose();
        return;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
      this.globeMaterial.map?.dispose();
      this.globeMaterial.map = texture;
      this.globeMaterial.needsUpdate = true;
    });

    return this;
  }

  bumpImageUrl(url: string) {
    const requestId = ++this.bumpTextureRequestId;
    this.textureLoader.load(url, (texture) => {
      if (requestId !== this.bumpTextureRequestId) {
        texture.dispose();
        return;
      }

      this.globeMaterial.bumpMap?.dispose();
      this.globeMaterial.bumpMap = texture;
      this.globeMaterial.bumpScale = 2;
      this.globeMaterial.needsUpdate = true;
    });

    return this;
  }

  polygonsData(countries: CountryFeature[]) {
    this.countries = countries;
    this.rebuildPolygonVisuals();
    return this;
  }

  polygonAltitude(value: NumericAccessor) {
    this.polygonAltitudeAccessor = value;
    this.queuePolygonRefresh();
    return this;
  }

  polygonCapColor(value: ColorAccessor) {
    this.polygonCapColorAccessor = value;
    this.queuePolygonRefresh();
    return this;
  }

  polygonSideColor(value: ColorAccessor) {
    this.polygonSideColorAccessor = value;
    this.queuePolygonRefresh();
    return this;
  }

  polygonStrokeColor(value: ColorAccessor) {
    this.polygonStrokeColorAccessor = value;
    this.queuePolygonRefresh();
    return this;
  }

  getGlobeRadius() {
    return this.globeRadius;
  }

  private queuePolygonRefresh() {
    if (this.polygonRefreshQueued) {
      return;
    }

    this.polygonRefreshQueued = true;
    queueMicrotask(() => {
      this.polygonRefreshQueued = false;
      this.refreshPolygonStyles();
    });
  }

  private rebuildPolygonVisuals() {
    for (const visual of this.polygonVisuals) {
      visual.fillGeometry?.dispose();
      visual.fillMaterial?.dispose();
      visual.strokeGeometries.forEach((geometry) => geometry.dispose());
      visual.strokeMaterials.forEach((material) => material.dispose());
    }

    this.polygonVisuals = [];
    this.polygonsGroup.clear();

    for (const country of this.countries) {
      const polygons = extractCountryPolygons(country);

      for (const polygon of polygons) {
        const geometryData = buildPolygonGeometryData(polygon, this.globeRadius);
        if (!geometryData) {
          continue;
        }

        const fillMaterial = geometryData.fillGeometry
          ? new THREE.MeshPhongMaterial({
              transparent: true,
              depthTest: false,
              depthWrite: false,
              side: THREE.DoubleSide,
              color: 0xffffff
            })
          : null;
        const fillMesh = geometryData.fillGeometry && fillMaterial
          ? new THREE.Mesh(geometryData.fillGeometry, fillMaterial)
          : null;

        if (fillMesh) {
          fillMesh.renderOrder = 1;
          this.polygonsGroup.add(fillMesh);
        }

        const strokeMaterials = geometryData.strokeGeometries.map(
          () =>
            new THREE.LineBasicMaterial({
              transparent: true,
              depthTest: false,
              depthWrite: false,
              color: 0xffffff
            })
        );

        const strokeLines = geometryData.strokeGeometries.map((geometry, index) => {
          const line = new THREE.LineLoop(geometry, strokeMaterials[index]);
          line.renderOrder = 1;
          this.polygonsGroup.add(line);
          return line;
        });

        void strokeLines;

        this.polygonVisuals.push({
          country,
          fillGeometry: geometryData.fillGeometry,
          fillUnitVectors: geometryData.fillUnitVectors,
          fillMaterial,
          strokeGeometries: geometryData.strokeGeometries,
          strokeUnitVectors: geometryData.strokeUnitVectors,
          strokeMaterials
        });
      }
    }

    this.refreshPolygonStyles();
  }

  private refreshPolygonStyles() {
    for (const visual of this.polygonVisuals) {
      const altitude = resolveNumericAccessor(this.polygonAltitudeAccessor, visual.country);
      const capColor = resolveColorAccessor(this.polygonCapColorAccessor, visual.country);
      const sideColor = resolveColorAccessor(this.polygonSideColorAccessor, visual.country);
      const strokeColor = resolveColorAccessor(this.polygonStrokeColorAccessor, visual.country);

      const fillStyle = pickFillColor(capColor, sideColor);
      const fillRadius = this.globeRadius * (1 + altitude);
      const strokeRadius = this.globeRadius * (1 + altitude + STROKE_ALTITUDE_OFFSET);

      if (visual.fillGeometry && visual.fillMaterial) {
        applyColorToMaterial(visual.fillMaterial, fillStyle);
        updateGeometryRadius(visual.fillGeometry, visual.fillUnitVectors, fillRadius);
        visual.fillMaterial.visible = fillStyle.opacity > 0;
      }

      visual.strokeGeometries.forEach((geometry, index) => {
        applyColorToMaterial(visual.strokeMaterials[index], strokeColor);
        updateGeometryRadius(geometry, visual.strokeUnitVectors[index], strokeRadius);
        visual.strokeMaterials[index].visible = strokeColor.opacity > 0;
      });
    }
  }
}

function buildPolygonGeometryData(polygon: CountryPolygon, globeRadius: number) {
  const outerRing = normalizeRing(polygon[0] ?? []);
  if (outerRing.length < 3) {
    return null;
  }

  const holes = polygon
    .slice(1)
    .map((ring) => normalizeRing(ring))
    .filter((ring) => ring.length >= 3);

  const outerUnitVectors = outerRing.map(([lng, lat]) => latLngToUnitVector(lat, lng));
  const holeUnitVectors = holes.map((ring) => ring.map(([lng, lat]) => latLngToUnitVector(lat, lng)));
  const projectionFrame = createProjectionFrame(outerUnitVectors);
  if (!projectionFrame) {
    return null;
  }

  const outerProjected = projectUnitRing(outerUnitVectors, projectionFrame);
  const holeProjected = holeUnitVectors.map((ring) => projectUnitRing(ring, projectionFrame));

  const normalizedOuter = orientRing(outerProjected, outerUnitVectors, true);
  const normalizedHoles = holeProjected.map((ring, index) => orientRing(ring, holeUnitVectors[index], false));

  const faces = THREE.ShapeUtils.triangulateShape(
    normalizedOuter.projected,
    normalizedHoles.map((ring) => ring.projected)
  );

  const fillUnitVectors = normalizedOuter.unitVectors.concat(
    normalizedHoles.flatMap((ring) => ring.unitVectors)
  );

  const fillGeometry = faces.length
    ? createIndexedGeometry(fillUnitVectors, globeRadius, faces.flat())
    : null;

  const strokeUnitVectors = [normalizedOuter.unitVectors, ...normalizedHoles.map((ring) => ring.unitVectors)];
  const strokeGeometries = strokeUnitVectors.map((ringVectors) =>
    createLineGeometry(ringVectors, globeRadius * (1 + STROKE_ALTITUDE_OFFSET))
  );

  return {
    fillGeometry,
    fillUnitVectors,
    strokeGeometries,
    strokeUnitVectors
  };
}

function createIndexedGeometry(unitVectors: THREE.Vector3[], radius: number, indices: number[]) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(unitVectors.length * 3);
  const normals = new Float32Array(unitVectors.length * 3);

  for (let index = 0; index < unitVectors.length; index += 1) {
    const vector = unitVectors[index];
    const offset = index * 3;

    positions[offset] = vector.x * radius;
    positions[offset + 1] = vector.y * radius;
    positions[offset + 2] = vector.z * radius;
    normals[offset] = vector.x;
    normals[offset + 1] = vector.y;
    normals[offset + 2] = vector.z;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function createLineGeometry(unitVectors: THREE.Vector3[], radius: number) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(unitVectors.length * 3);

  for (let index = 0; index < unitVectors.length; index += 1) {
    const vector = unitVectors[index];
    const offset = index * 3;

    positions[offset] = vector.x * radius;
    positions[offset + 1] = vector.y * radius;
    positions[offset + 2] = vector.z * radius;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function updateGeometryRadius(
  geometry: THREE.BufferGeometry,
  unitVectors: THREE.Vector3[],
  radius: number
) {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!positions) {
    return;
  }

  for (let index = 0; index < unitVectors.length; index += 1) {
    const vector = unitVectors[index];
    positions.setXYZ(index, vector.x * radius, vector.y * radius, vector.z * radius);
  }

  positions.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function applyColorToMaterial(
  material: THREE.MeshPhongMaterial | THREE.LineBasicMaterial,
  style: ParsedColor
) {
  material.color.copy(style.color);
  material.opacity = style.opacity;
  material.transparent = style.opacity < 1;
}

function pickFillColor(primary: ParsedColor, fallback: ParsedColor) {
  return primary.opacity > 0 ? primary : fallback;
}

function resolveNumericAccessor(accessor: NumericAccessor, country: CountryFeature) {
  return typeof accessor === "function" ? accessor(country) : accessor;
}

function resolveColorAccessor(accessor: ColorAccessor, country: CountryFeature) {
  const value = typeof accessor === "function" ? accessor(country) : accessor;
  return parseColor(value);
}

type ParsedColor = {
  color: THREE.Color;
  opacity: number;
};

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

type ProjectionFrame = {
  center: THREE.Vector3;
  east: THREE.Vector3;
  north: THREE.Vector3;
};

function createProjectionFrame(unitVectors: THREE.Vector3[]): ProjectionFrame | null {
  if (!unitVectors.length) {
    return null;
  }

  const center = unitVectors
    .reduce((sum, vector) => sum.add(vector), new THREE.Vector3())
    .normalize();

  if (center.lengthSq() === 0) {
    return null;
  }

  const worldUp = new THREE.Vector3(0, 1, 0);
  const fallbackAxis = new THREE.Vector3(1, 0, 0);
  const east = new THREE.Vector3().crossVectors(worldUp, center);

  if (east.lengthSq() < 1e-8) {
    east.crossVectors(fallbackAxis, center);
  }

  if (east.lengthSq() < 1e-8) {
    return null;
  }

  east.normalize();

  const north = new THREE.Vector3().crossVectors(center, east).normalize();
  if (north.lengthSq() === 0) {
    return null;
  }

  return { center, east, north };
}

function projectUnitRing(ring: THREE.Vector3[], frame: ProjectionFrame) {
  return ring.map((vector) => {
    const cosCenterAngle = THREE.MathUtils.clamp(frame.center.dot(vector), -0.999999, 1);
    const scale = Math.sqrt(2 / (1 + cosCenterAngle));

    return new THREE.Vector2(vector.dot(frame.east) * scale, vector.dot(frame.north) * scale);
  });
}

function orientRing(projected: THREE.Vector2[], unitVectors: THREE.Vector3[], clockwise: boolean) {
  const isClockwise = THREE.ShapeUtils.isClockWise(projected);
  if (isClockwise === clockwise) {
    return { projected, unitVectors };
  }

  return {
    projected: [...projected].reverse(),
    unitVectors: [...unitVectors].reverse()
  };
}

function extractCountryPolygons(country: CountryFeature): CountryPolygon[] {
  const geometry = country.geometry;

  if (geometry.type === "Polygon") {
    const polygon = parsePolygonCoordinates(geometry.coordinates);
    return polygon.length ? [polygon] : [];
  }

  if (geometry.type === "MultiPolygon") {
    return parseMultiPolygonCoordinates(geometry.coordinates);
  }

  return [];
}

function parseMultiPolygonCoordinates(value: unknown): CountryPolygon[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((polygonValue) => parsePolygonCoordinates(polygonValue))
    .filter((polygon) => polygon.length > 0);
}

function parsePolygonCoordinates(value: unknown): CountryPolygon {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((ringValue) => parseRingCoordinates(ringValue))
    .filter((ring) => ring.length > 0);
}

function parseRingCoordinates(value: unknown): PolygonRing {
  if (!Array.isArray(value)) {
    return [];
  }

  const ring: LngLat[] = [];

  for (const coordinate of value) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      continue;
    }

    const lng = Number(coordinate[0]);
    const lat = Number(coordinate[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      continue;
    }

    ring.push([normalizeLongitude(lng), clampLatitude(lat)]);
  }

  return ring;
}

function normalizeRing(ring: PolygonRing): PolygonRing {
  const normalized: LngLat[] = [];

  for (const point of ring) {
    const previous = normalized[normalized.length - 1];
    if (previous && previous[0] === point[0] && previous[1] === point[1]) {
      continue;
    }

    normalized.push(point);
  }

  if (normalized.length > 1) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      normalized.pop();
    }
  }

  return normalized;
}

function normalizeLongitude(lng: number) {
  let normalized = lng;

  while (normalized > 180) {
    normalized -= 360;
  }

  while (normalized < -180) {
    normalized += 360;
  }

  return normalized;
}

function clampLatitude(lat: number) {
  return Math.min(Math.max(lat, -90), 90);
}

function latLngToUnitVector(lat: number, lng: number) {
  const latRad = THREE.MathUtils.degToRad(lat);
  const lngRad = THREE.MathUtils.degToRad(lng);
  const cosLat = Math.cos(latRad);

  return new THREE.Vector3(
    cosLat * Math.sin(lngRad),
    Math.sin(latRad),
    cosLat * Math.cos(lngRad)
  ).normalize();
}