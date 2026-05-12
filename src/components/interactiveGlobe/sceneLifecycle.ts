import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 560;

type SceneLifecycleOptions = {
  container: HTMLDivElement;
  minCameraDistance: number;
  maxCameraDistance: number;
  initialCameraDistance: number;
};

type SceneLifecycle = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  dispose: () => void;
};

export function createSceneLifecycle({
  container,
  minCameraDistance,
  maxCameraDistance,
  initialCameraDistance
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

  return {
    scene,
    camera,
    renderer,
    controls,
    dispose
  };
}