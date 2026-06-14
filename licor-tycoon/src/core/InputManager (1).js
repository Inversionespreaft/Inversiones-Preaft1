// ============================================================
// FASE 3 - JUGADOR | Licor Tycoon
// InputManager.js
// Centraliza teclado, ratón y gamepad para todo el proyecto
// ============================================================

export class InputManager {
  constructor() {
    this.keys        = {};
    this.keysDown    = {};   // true solo en el frame que se presionó
    this.keysUp      = {};   // true solo en el frame que se soltó
    this.mouse       = { x: 0, y: 0, dx: 0, dy: 0, buttons: {} };
    this.pointerLocked = false;

    this._listeners = [];
    this._init();
  }

  _init() {
    const onDown = (e) => {
      const k = e.code;
      if (!this.keys[k]) this.keysDown[k] = true;
      this.keys[k] = true;
    };
    const onUp = (e) => {
      const k = e.code;
      this.keys[k]   = false;
      this.keysUp[k] = true;
    };
    const onMouseMove = (e) => {
      this.mouse.dx = e.movementX || 0;
      this.mouse.dy = e.movementY || 0;
    };
    const onPointerLock = () => {
      this.pointerLocked = document.pointerLockElement !== null;
    };

    document.addEventListener('keydown', onDown);
    document.addEventListener('keyup',   onUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLock);

    this._listeners = [
      () => document.removeEventListener('keydown', onDown),
      () => document.removeEventListener('keyup',   onUp),
      () => document.removeEventListener('mousemove', onMouseMove),
      () => document.removeEventListener('pointerlockchange', onPointerLock),
    ];
  }

  /** Llamar AL FINAL de cada frame para limpiar estados de un solo frame */
  flush() {
    this.keysDown = {};
    this.keysUp   = {};
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  isDown(code)      { return !!this.keys[code]; }
  wasPressed(code)  { return !!this.keysDown[code]; }
  wasReleased(code) { return !!this.keysUp[code]; }

  /** Devuelve vector de dirección normalizado WASD */
  getMovementVector() {
    return {
      x: (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0),
      z: (this.isDown('KeyS') ? 1 : 0) - (this.isDown('KeyW') ? 1 : 0),
    };
  }

  isSprinting()   { return this.isDown('ShiftLeft') || this.isDown('ShiftRight'); }
  isInteracting() { return this.wasPressed('KeyE'); }

  dispose() {
    this._listeners.forEach(fn => fn());
  }
}
