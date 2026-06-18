import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 560;

type SceneLifecycleOptions = {
  container: HTMLDivElement;
  minCameraDistance: number;
  maxCameraDistance: number;
  initialCameraDistance: number;
  onResize?: () => void;
};

type SceneLifecycle = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  dispose: () => void;
};

type MaterialWithUniforms = THREE.Material & {
  uniforms?: Record<string, { value: unknown }>;
};

function disposeTextureValue(value: unknown, disposedTextures: Set<string>) {
  if (value instanceof THREE.Texture) {
    if (!disposedTextures.has(value.uuid)) {
      disposedTextures.add(value.uuid);
      value.dispose();
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => disposeTextureValue(entry, disposedTextures));
  }
}

function disposeMaterialTextures(
  material: THREE.Material | null | undefined,
  disposedTextures: Set<string>
) {
  if (!material) {
    return;
  }

  const materialRecord = material as unknown as Record<string, unknown>;
  Object.values(materialRecord).forEach((value) => {
    disposeTextureValue(value, disposedTextures);
  });

  const uniforms = (material as MaterialWithUniforms).uniforms;
  if (!uniforms) {
    return;
  }

  Object.values(uniforms).forEach((uniform) => {
    disposeTextureValue(uniform?.value, disposedTextures);
  });
}

export function createSceneLifecycle({
  container,
  minCameraDistance,
  maxCameraDistance,
  initialCameraDistance,
  onResize
}: SceneLifecycleOptions): SceneLifecycle {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, DEFAULT_WIDTH / DEFAULT_HEIGHT, 1, 1000);
  camera.position.set(0, 0, initialCameraDistance);

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

    // Keep the last stable size while viewport/layout is transiently collapsed.
    const stableWidth = width > 1 ? width : lastKnownWidth;
    const stableHeight = height > 1 ? height : lastKnownHeight;

    lastKnownWidth = stableWidth;
    lastKnownHeight = stableHeight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = stableWidth / stableHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stableWidth, stableHeight, false);
    onResize?.();
  };

  const observer = new ResizeObserver(() => resize());
  observer.observe(container);
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  window.visualViewport?.addEventListener("resize", resize);
  resize();

  const dispose = () => {
    observer.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("orientationchange", resize);
    window.visualViewport?.removeEventListener("resize", resize);
    controls.dispose();
    renderer.dispose();

    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }

    const disposedTextures = new Set<string>();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose?.();

      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((m) => {
          if (!m) {
            return;
          }

          disposeMaterialTextures(m, disposedTextures);
          m.dispose?.();
        });
      } else {
        disposeMaterialTextures(material, disposedTextures);
        material?.dispose?.();
      }
    });
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    dispose
  };
}
