import { FBXLoader } from '../../vendor/three/examples/jsm/loaders/FBXLoader.js';

export class AnimationLoader {
    constructor(model, mixer) {
        this.model = model;
        this.mixer = mixer;
        this.actions = {};
    }

    async loadAnimation(name, path) {
        const loader = new FBXLoader();
        return new Promise((resolve, reject) => {
            loader.load(path, (anim) => {
                const action = this.mixer.clipAction(anim.animations[0]);
                this.actions[name] = action;
                resolve(action);
            }, undefined, reject);
        });
    }

    play(name) {
        if (this.actions[name]) {
            Object.values(this.actions).forEach(a => a.stop());
            this.actions[name].play();
        }
    }
}
