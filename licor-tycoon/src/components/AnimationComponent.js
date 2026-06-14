export class AnimationComponent {
    constructor(loader) {
        this.loader = loader;
        this.current = 'Idle';
    }

    setAnimation(name) {
        if (this.current !== name) {
            this.loader.play(name);
            this.current = name;
        }
    }
}
