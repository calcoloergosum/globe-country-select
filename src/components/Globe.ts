// Custom Three.js globe object; polygon mesh/stroke generation, style updates, texture loading.
import * as THREE from "three";
import type { CountryFeature } from "./globeTypes";
import { extractCountryPolygons } from "./globe/geo";
import { buildPolygonGeometryData, updateGeometryRadius } from "./globe/geometry";
import {
  applyColorToMaterial,
  pickFillColor,
  resolveColorAccessor,
  resolveNumericAccessor
} from "./globe/styles";
import type { ColorAccessor, NumericAccessor, PolygonVisual } from "./globe/types";

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
        const geometryData = buildPolygonGeometryData(
          polygon,
          this.globeRadius,
          STROKE_ALTITUDE_OFFSET
        );
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