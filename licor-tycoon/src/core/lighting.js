import * as THREE from '../../vendor/three/build/three.module.js';

export function createLighting(scene) {
    const lights = {};

    // 1. Luz Ambiental: Aporta claridad general (Estilo brillante de Roblox)
    lights.ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(lights.ambient);

    // 2. Luz Direccional Principal: Simula el sol/iluminación del techo y genera sombras
    lights.directional = new THREE.DirectionalLight(0xfff5ea, 0.8); // Tono ligeramente cálido
    lights.directional.position.set(20, 40, 20);
    lights.directional.castShadow = true;

    // Configuración de resolución de sombras para optimizar rendimiento en web
    lights.directional.shadow.mapSize.width = 2048;
    lights.directional.shadow.mapSize.height = 2048;
    lights.directional.shadow.camera.near = 0.5;
    lights.directional.shadow.camera.far = 100;
    
    // Dimensión del área que recibe sombras (ajustable según crezca la licorería)
    const d = 30;
    lights.directional.shadow.camera.left = -d;
    lights.directional.shadow.camera.right = d;
    lights.directional.shadow.camera.top = d;
    lights.directional.shadow.camera.bottom = -d;
    lights.directional.shadow.bias = -0.0005;

    scene.add(lights.directional);

    return lights;
}
