// ============================================================
// FASE 3 - JUGADOR | Licor Tycoon
// CollisionSystem.js
// Gestión de colisiones AABB para el jugador y objetos de escena
// ============================================================

import * as THREE from '../../vendor/three/build/three.module.js';

export class CollisionSystem {
  constructor() {
    /** @type {THREE.Box3[]} lista de colisionadores estáticos */
    this.staticColliders  = [];
    /** @type {Map<string, THREE.Box3>} colisionadores dinámicos con ID */
    this.dynamicColliders = new Map();

    this._helpers = [];   // para debug visual
    this.debugMode = false;
  }

  // ─────────────────────────────────────────────────────────────
  // REGISTRO DE COLISIONADORES
  // ─────────────────────────────────────────────────────────────

  /**
   * Registra un mesh estático (estante, pared, mostrador…)
   * @param {THREE.Object3D} mesh
   * @returns {THREE.Box3} el AABB creado
   */
  addStatic(mesh) {
    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.staticColliders.push(box);
    return box;
  }

  /**
   * Registra un colisionador dinámico (NPC, carro, etc.)
   * @param {string} id
   * @param {THREE.Object3D} mesh
   */
  addDynamic(id, mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    this.dynamicColliders.set(id, { box, mesh });
  }

  removeDynamic(id) {
    this.dynamicColliders.delete(id);
  }

  // ─────────────────────────────────────────────────────────────
  // RESOLUCIÓN DE COLISIÓN PARA EL JUGADOR
  // ─────────────────────────────────────────────────────────────

  /**
   * Dado el AABB del jugador y su desplazamiento deseado,
   * devuelve el desplazamiento corregido.
   * @param {THREE.Box3}    playerBox
   * @param {THREE.Vector3} velocity   velocidad * delta (desplazamiento)
   * @returns {{ resolved: THREE.Vector3, hitX: boolean, hitZ: boolean, hitY: boolean }}
   */
  resolve(playerBox, velocity) {
    let resolved = velocity.clone();
    let hitX = false, hitZ = false, hitY = false;

    // Probar cada eje por separado para evitar el problema del "corner catch"
    const axes = [
      { axis: 'x', hit: () => { hitX = true; } },
      { axis: 'y', hit: () => { hitY = true; } },
      { axis: 'z', hit: () => { hitZ = true; } },
    ];

    for (const { axis, hit } of axes) {
      const moved = playerBox.clone().translate(
        new THREE.Vector3(
          axis === 'x' ? resolved.x : 0,
          axis === 'y' ? resolved.y : 0,
          axis === 'z' ? resolved.z : 0,
        )
      );

      for (const staticBox of this.staticColliders) {
        if (moved.intersectsBox(staticBox)) {
          resolved[axis] = 0;
          hit();
          break;
        }
      }
    }

    return { resolved, hitX, hitZ, hitY };
  }

  // ─────────────────────────────────────────────────────────────
  // RAYCAST RÁPIDO CONTRA COLISIONADORES ESTÁTICOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Comprueba si un rayo intersecta con colisionadores estáticos.
   * Útil para line-of-sight de NPCs.
   * @param {THREE.Ray} ray
   * @param {number} maxDistance
   * @returns {boolean}
   */
  raycast(ray, maxDistance = Infinity) {
    const target = new THREE.Vector3();
    for (const box of this.staticColliders) {
      const hit = ray.intersectBox(box, target);
      if (hit && ray.origin.distanceTo(target) <= maxDistance) {
        return true;
      }
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // ACTUALIZAR COLISIONADORES DINÁMICOS
  // ─────────────────────────────────────────────────────────────

  update() {
    for (const [, entry] of this.dynamicColliders) {
      entry.box.setFromObject(entry.mesh);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DEBUG: VISUALIZAR AABB
  // ─────────────────────────────────────────────────────────────

  enableDebug(scene) {
    this.debugMode = true;
    this._scene    = scene;
    this._refreshHelpers();
  }

  _refreshHelpers() {
    if (!this.debugMode || !this._scene) return;
    this._helpers.forEach(h => this._scene.remove(h));
    this._helpers = [];

    for (const box of this.staticColliders) {
      const helper = new THREE.Box3Helper(box, 0x00ff00);
      this._scene.add(helper);
      this._helpers.push(helper);
    }
  }

  dispose() {
    if (this._scene) {
      this._helpers.forEach(h => this._scene.remove(h));
    }
    this.staticColliders  = [];
    this.dynamicColliders.clear();
  }
}
