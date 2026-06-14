import * as THREE from '../../vendor/three/build/three.module.js';

export function initScene(container) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc5e8);
    scene.fog = new THREE.FogExp2(0x9fc5e8, 0.012);

    const aspectRatio = Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
    
    camera.position.set(25, 30, 25);
    camera.lookAt(0, 0, 0);

    // Suelo temporal
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x4f6f52, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    return { scene, camera };
}
