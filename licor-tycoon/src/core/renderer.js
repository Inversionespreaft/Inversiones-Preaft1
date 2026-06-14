import * as THREE from '../../vendor/three/build/three.module.js';

export function initRenderer(container) {
  const isCanvas = container instanceof HTMLCanvasElement;
  const width = Math.max(container.clientWidth || window.innerWidth, 1);
  const height = Math.max(container.clientHeight || window.innerHeight, 1);

  const renderer = new THREE.WebGLRenderer({
    canvas: isCanvas ? container : undefined,
    antialias: true,
    alpha: true,
  });

  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  if (!isCanvas) {
    container.appendChild(renderer.domElement);
  }

  return renderer;
}
