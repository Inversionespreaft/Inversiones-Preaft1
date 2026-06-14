import * as THREE from '../../vendor/three/build/three.module.js';
import { initScene } from '../core/scene.js';
import { initRenderer } from '../core/renderer.js';
import { createLighting } from '../core/lighting.js';
import { PlayerController } from '../entities/PlayerController.js';
import { CollisionSystem } from './CollisionSystem.js';
import { PlayerLoader } from '../entities/PlayerLoader.js';

const ASSET_ROOT = './assets/models/Player';

function getGameSurface() {
  return document.getElementById('game-canvas')
    || document.getElementById('game-container')
    || document.body;
}

function createBox(scene, collisionSystem, collidables, options) {
  const {
    name,
    size,
    position,
    color,
    emissive = 0x000000,
    roughness = 0.72,
    collidable = true,
  } = options;

  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshStandardMaterial({ color, emissive, roughness });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position.x, position.y + size.y / 2, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (collidable) {
    collisionSystem.addStatic(mesh);
    collidables.push(mesh);
  }

  return mesh;
}

function buildStore(scene, collisionSystem) {
  const collidables = [];

  createBox(scene, collisionSystem, collidables, {
    name: 'back-wall',
    size: new THREE.Vector3(30, 4, 0.5),
    position: new THREE.Vector3(0, 0, -15),
    color: 0x84563c,
  });
  createBox(scene, collisionSystem, collidables, {
    name: 'left-wall',
    size: new THREE.Vector3(0.5, 4, 30),
    position: new THREE.Vector3(-15, 0, 0),
    color: 0x84563c,
  });
  createBox(scene, collisionSystem, collidables, {
    name: 'right-wall',
    size: new THREE.Vector3(0.5, 4, 30),
    position: new THREE.Vector3(15, 0, 0),
    color: 0x84563c,
  });

  const shelves = [
    createBox(scene, collisionSystem, collidables, {
      name: 'beer-shelf',
      size: new THREE.Vector3(5, 2.6, 1),
      position: new THREE.Vector3(-6, 0, -9),
      color: 0x583722,
    }),
    createBox(scene, collisionSystem, collidables, {
      name: 'whisky-shelf',
      size: new THREE.Vector3(5, 2.6, 1),
      position: new THREE.Vector3(4, 0, -9),
      color: 0x5f3f28,
    }),
  ];

  createBox(scene, collisionSystem, collidables, {
    name: 'counter',
    size: new THREE.Vector3(6, 1.2, 1.8),
    position: new THREE.Vector3(0, 0, 6),
    color: 0x6a4a34,
  });

  for (const shelf of shelves) {
    for (let i = 0; i < 8; i += 1) {
      createBox(scene, collisionSystem, collidables, {
        name: `${shelf.name}-bottle-${i}`,
        size: new THREE.Vector3(0.28, 0.8, 0.28),
        position: new THREE.Vector3(
          shelf.position.x - 1.8 + i * 0.52,
          2.6,
          shelf.position.z + 0.15,
        ),
        color: i % 2 === 0 ? 0x1f8a4c : 0xb3312b,
        emissive: i % 2 === 0 ? 0x052611 : 0x260706,
        roughness: 0.38,
        collidable: false,
      });
    }
  }

  return { collidables, shelves };
}

async function loadAnimatedPlayer(scene, controller) {
  const loader = new PlayerLoader(scene);

  try {
    await loader.loadModel(`${ASSET_ROOT}/player_idle.fbx`);
    await Promise.all([
      loader.loadAnimation('Idle', `${ASSET_ROOT}/player_idle.fbx`),
      loader.loadAnimation('Walk', `${ASSET_ROOT}/player_walk.fbx`),
      loader.loadAnimation('Run', `${ASSET_ROOT}/player_run.fbx`),
      loader.loadAnimation('Interact', `${ASSET_ROOT}/player_interact.fbx`),
    ]);
    controller.mesh.visible = false;
    loader.play('Idle');
    return loader;
  } catch (error) {
    console.warn('[Licor Tycoon] No se pudo cargar el jugador FBX. Se usa el jugador basico.', error);
    return null;
  }
}

function connectHud(player) {
  const sprintIndicator = document.getElementById('sprint-indicator');
  player.onSprint = (active) => {
    if (sprintIndicator) sprintIndicator.classList.toggle('active', active);
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const surface = getGameSurface();
  const { scene, camera } = initScene(surface);
  const renderer = initRenderer(surface);
  const lights = createLighting(scene);
  lights.directional.position.set(10, 16, 8);

  const collisionSystem = new CollisionSystem();
  const { collidables, shelves } = buildStore(scene, collisionSystem);

  const player = new PlayerController(scene, camera, renderer.domElement);
  player.setPosition(0, 0.9, 10);
  connectHud(player);

  player.registerInteractable({
    mesh: shelves[0],
    label: 'Estante de cervezas',
    onInteract: () => console.log('[Licor Tycoon] Interaccion: estante de cervezas'),
  });
  player.registerInteractable({
    mesh: shelves[1],
    label: 'Estante de whisky',
    onInteract: () => console.log('[Licor Tycoon] Interaccion: estante de whisky'),
  });

  const animatedPlayer = await loadAnimatedPlayer(scene, player);
  let animationState = 'Idle';
  let interactionTimer = 0;

  player.onInteract = () => {
    interactionTimer = 0.75;
    animatedPlayer?.play('Interact');
  };

  function resize() {
    const width = Math.max(surface.clientWidth || window.innerWidth, 1);
    const height = Math.max(surface.clientHeight || window.innerHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    collisionSystem.update();
    player.update(delta, collidables);

    if (animatedPlayer?.model) {
      animatedPlayer.model.position.copy(player.mesh.position);
      animatedPlayer.model.rotation.y = player.mesh.rotation.y + Math.PI;

      interactionTimer = Math.max(0, interactionTimer - delta);
      if (interactionTimer <= 0) {
        const moving = player.keys.w || player.keys.a || player.keys.s || player.keys.d;
        const nextState = moving ? (player.isSprinting ? 'Run' : 'Walk') : 'Idle';
        if (nextState !== animationState) {
          animationState = nextState;
          animatedPlayer.play(animationState);
        }
      }

      animatedPlayer.update(delta);
    }

    renderer.render(scene, camera);
  }

  animate();
});
