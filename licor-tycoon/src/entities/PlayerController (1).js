// ============================================================
// FASE 3 - JUGADOR | Licor Tycoon
// PlayerController.js
// Movimiento WASD, sprint, interacción E, colisiones
// ============================================================

import * as THREE from '../../vendor/three/build/three.module.js';

export class PlayerController {
  constructor(scene, camera, domElement) {
    this.scene        = scene;
    this.camera       = camera;
    this.domElement   = domElement;

    // ── Estado de movimiento ──────────────────────────────────
    this.keys = {
      w: false, a: false, s: false, d: false,
      shift: false, e: false,
    };

    // ── Parámetros físicos ────────────────────────────────────
    this.walkSpeed   = 5;      // m/s
    this.sprintSpeed = 10;     // m/s
    this.jumpForce   = 8;
    this.gravity     = -20;

    // ── Estado interno ────────────────────────────────────────
    this.velocity        = new THREE.Vector3();
    this.isGrounded      = false;
    this.isSprinting     = false;
    this.isInteracting   = false;
    this.interactionRange = 2.5;   // metros

    // ── Cámara en primera/tercera persona ─────────────────────
    this.yaw   = 0;   // rotación horizontal
    this.pitch = 0;   // rotación vertical
    this.cameraDistance = 4;        // distancia en 3ª persona
    this.cameraHeight   = 1.8;
    this.isFirstPerson  = false;

    // ── Mesh del jugador ──────────────────────────────────────
    this._buildMesh();

    // ── Colisionador ──────────────────────────────────────────
    this.collider = new THREE.Box3();
    this._updateCollider();

    // ── Objetos interactuables registrados ────────────────────
    this.interactables = [];

    // ── Eventos ───────────────────────────────────────────────
    this._bindEvents();

    // ── Estado para callbacks externos ───────────────────────
    this.onInteract = null;   // fn(objeto) → llamado al presionar E
    this.onSprint   = null;
  }

  // ─────────────────────────────────────────────────────────────
  // CONSTRUCCIÓN DEL MESH
  // ─────────────────────────────────────────────────────────────
  _buildMesh() {
    // Cuerpo principal (cápsula aproximada con cilindro + esferas)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a86ff });
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.castShadow    = true;
    this.mesh.receiveShadow = false;
    this.mesh.position.set(0, 0.9, 0);
    this.mesh.name = 'player';

    // Cabeza
    const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffd6a5 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 0.85, 0);
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // Punto de la cámara (en la cabeza)
    this.cameraAnchor = new THREE.Object3D();
    this.cameraAnchor.position.set(0, 0.85, 0);
    this.mesh.add(this.cameraAnchor);

    this.scene.add(this.mesh);
  }

  // ─────────────────────────────────────────────────────────────
  // EVENTOS DE TECLADO Y RATÓN
  // ─────────────────────────────────────────────────────────────
  _bindEvents() {
    // Teclado
    this._onKeyDown = (e) => this._handleKeyDown(e);
    this._onKeyUp   = (e) => this._handleKeyUp(e);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);

    // Pointer lock para cámara de ratón
    this._onMouseMove  = (e) => this._handleMouseMove(e);
    this._onPointerLock = () => {
      document.addEventListener('mousemove', this._onMouseMove);
    };
    this._onPointerUnlock = () => {
      document.removeEventListener('mousemove', this._onMouseMove);
    };
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.domElement) {
        this._onPointerLock();
      } else {
        this._onPointerUnlock();
      }
    });

    // Click en canvas → activar pointer lock
    this.domElement.addEventListener('click', () => {
      this.domElement.requestPointerLock();
    });

    // Cambiar perspectiva con V
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV') this.isFirstPerson = !this.isFirstPerson;
    });
  }

  _handleKeyDown(e) {
    switch (e.code) {
      case 'KeyW':      this.keys.w     = true; break;
      case 'KeyA':      this.keys.a     = true; break;
      case 'KeyS':      this.keys.s     = true; break;
      case 'KeyD':      this.keys.d     = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.shift = true; break;
      case 'KeyE':      this._tryInteract(); break;
    }
  }

  _handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW':      this.keys.w     = false; break;
      case 'KeyA':      this.keys.a     = false; break;
      case 'KeyS':      this.keys.s     = false; break;
      case 'KeyD':      this.keys.d     = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.shift = false; break;
    }
  }

  _handleMouseMove(e) {
    const sensitivity = 0.002;
    this.yaw   -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;
    // Limitar pitch para no voltear la cámara
    this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
  }

  // ─────────────────────────────────────────────────────────────
  // ACTUALIZACIÓN PRINCIPAL (llamar en el game loop)
  // ─────────────────────────────────────────────────────────────
  update(delta, collidables = []) {
    this._updateMovement(delta, collidables);
    this._updateCamera();
    this._updateCollider();
    this._highlightInteractable();
  }

  // ─────────────────────────────────────────────────────────────
  // MOVIMIENTO Y COLISIONES
  // ─────────────────────────────────────────────────────────────
  _updateMovement(delta, collidables) {
    this.isSprinting = this.keys.shift;
    const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    // Dirección de movimiento en el plano XZ
    const dir = new THREE.Vector3();
    if (this.keys.w) dir.z -= 1;
    if (this.keys.s) dir.z += 1;
    if (this.keys.a) dir.x -= 1;
    if (this.keys.d) dir.x += 1;

    // Rotar la dirección según el yaw de la cámara
    dir.applyEuler(new THREE.Euler(0, this.yaw, 0));
    dir.normalize();

    // Aplicar velocidad horizontal
    this.velocity.x = dir.x * speed;
    this.velocity.z = dir.z * speed;

    // Gravedad
    this.velocity.y += this.gravity * delta;

    // Mover
    const movement = this.velocity.clone().multiplyScalar(delta);
    this.mesh.position.add(movement);

    // Suelo básico (Y = 0)
    if (this.mesh.position.y <= 0.9) {
      this.mesh.position.y = 0.9;
      this.velocity.y      = 0;
      this.isGrounded      = true;
    } else {
      this.isGrounded = false;
    }

    // Colisiones AABB con objetos de la escena
    this._resolveCollisions(collidables);

    // Rotar el mesh del jugador hacia la dirección de movimiento
    if (dir.length() > 0.01) {
      const targetAngle = Math.atan2(dir.x, dir.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y, targetAngle, 10 * delta
      );
    }

    // Callback sprint
    if (this.onSprint) this.onSprint(this.isSprinting);
  }

  _resolveCollisions(collidables) {
    this._updateCollider();

    for (const obj of collidables) {
      if (!obj.geometry) continue;
      const objBox = new THREE.Box3().setFromObject(obj);

      if (this.collider.intersectsBox(objBox)) {
        // Calcular solapamiento y empujar al jugador fuera
        const overlap = new THREE.Box3();
        overlap.copy(this.collider).intersect(objBox);

        const size = new THREE.Vector3();
        overlap.getSize(size);

        // Resolver por el eje de menor solapamiento
        if (size.x < size.z) {
          const sign = this.mesh.position.x < objBox.getCenter(new THREE.Vector3()).x ? -1 : 1;
          this.mesh.position.x += sign * size.x;
          this.velocity.x = 0;
        } else {
          const sign = this.mesh.position.z < objBox.getCenter(new THREE.Vector3()).z ? -1 : 1;
          this.mesh.position.z += sign * size.z;
          this.velocity.z = 0;
        }
        this._updateCollider();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CÁMARA
  // ─────────────────────────────────────────────────────────────
  _updateCamera() {
    const worldAnchor = new THREE.Vector3();
    this.cameraAnchor.getWorldPosition(worldAnchor);

    if (this.isFirstPerson) {
      // Primera persona: cámara en la cabeza
      this.camera.position.copy(worldAnchor);
    } else {
      // Tercera persona: cámara detrás y arriba
      const offset = new THREE.Vector3(
        Math.sin(this.yaw) * -this.cameraDistance,
        this.cameraHeight + Math.sin(this.pitch) * this.cameraDistance,
        Math.cos(this.yaw) * -this.cameraDistance
      );
      this.camera.position.copy(worldAnchor).add(offset);
    }

    // La cámara siempre mira hacia el ancla (cabeza del jugador)
    const lookTarget = worldAnchor.clone().add(new THREE.Vector3(0, 0.2, 0));
    this.camera.lookAt(lookTarget);
  }

  // ─────────────────────────────────────────────────────────────
  // INTERACCIÓN (tecla E)
  // ─────────────────────────────────────────────────────────────
  registerInteractable(object) {
    // object debe tener: { mesh, onInteract(), label? }
    this.interactables.push(object);
  }

  unregisterInteractable(object) {
    this.interactables = this.interactables.filter(i => i !== object);
  }

  _getNearestInteractable() {
    let nearest  = null;
    let minDist  = Infinity;

    for (const item of this.interactables) {
      const itemPos = new THREE.Vector3();
      item.mesh.getWorldPosition(itemPos);
      const dist = this.mesh.position.distanceTo(itemPos);

      if (dist < this.interactionRange && dist < minDist) {
        minDist = dist;
        nearest = item;
      }
    }
    return nearest;
  }

  _tryInteract() {
    const target = this._getNearestInteractable();
    if (!target) return;

    // Llamar al callback propio del objeto
    if (typeof target.onInteract === 'function') {
      target.onInteract(this);
    }
    // Llamar al callback global
    if (typeof this.onInteract === 'function') {
      this.onInteract(target);
    }
  }

  _highlightInteractable() {
    // Resaltar el objeto más cercano (si está en rango)
    const nearest = this._getNearestInteractable();

    for (const item of this.interactables) {
      if (item.mesh && item.mesh.material) {
        item.mesh.material.emissive = item === nearest
          ? new THREE.Color(0xffff00)
          : new THREE.Color(0x000000);
        item.mesh.material.emissiveIntensity = item === nearest ? 0.4 : 0;
      }
    }

    // Actualizar el HUD de prompt de interacción
    this._updateInteractPrompt(nearest);
  }

  _updateInteractPrompt(target) {
    let prompt = document.getElementById('interact-prompt');
    if (!prompt) return;

    if (target) {
      prompt.style.display = 'block';
      prompt.textContent   = `[E] ${target.label || 'Interactuar'}`;
    } else {
      prompt.style.display = 'none';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // COLISIONADOR
  // ─────────────────────────────────────────────────────────────
  _updateCollider() {
    this.collider.setFromObject(this.mesh);
  }

  // ─────────────────────────────────────────────────────────────
  // POSICIÓN / UTILIDADES
  // ─────────────────────────────────────────────────────────────
  getPosition() {
    return this.mesh.position.clone();
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  // ─────────────────────────────────────────────────────────────
  // LIMPIEZA
  // ─────────────────────────────────────────────────────────────
  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup',   this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    this.scene.remove(this.mesh);
  }
}
