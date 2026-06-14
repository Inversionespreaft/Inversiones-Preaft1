import * as THREE from '../vendor/three/build/three.module.js';
import { FBXLoader } from '../vendor/three/examples/jsm/loaders/FBXLoader.js';

export class PlayerLoader {
  constructor(scene) {
    this.scene = scene;
    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;
    this.loader = new FBXLoader();
  }

  loadModel(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (object) => {
        this.model = object;
        this.model.name = 'mixamo-player';
        this.model.scale.setScalar(0.01);

        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.scene.add(this.model);
        this.mixer = new THREE.AnimationMixer(this.model);
        resolve(this.model);
      }, undefined, reject);
    });
  }

  loadAnimation(name, path) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, (anim) => {
        if (!this.mixer || !anim.animations.length) {
          resolve(null);
          return;
        }

        const action = this.mixer.clipAction(anim.animations[0]);
        action.clampWhenFinished = name === 'Interact';
        action.loop = name === 'Interact' ? THREE.LoopOnce : THREE.LoopRepeat;
        this.actions[name] = action;
        resolve(action);
      }, undefined, reject);
    });
  }

  play(name) {
    const nextAction = this.actions[name];
    if (!nextAction || this.currentAction === nextAction) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(0.15);
    }

    nextAction.reset().fadeIn(0.15).play();
    this.currentAction = nextAction;
  }

  update(delta) {
    if (this.mixer) this.mixer.update(delta);
  }
}
