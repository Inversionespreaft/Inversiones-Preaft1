export default class AnimationSystem {
  constructor(player) {
    this.player = player;
  }

  update(input, delta) {
    if (input.forward) {
      this.player.setState("Walk");
      if (input.shift) this.player.setState("Run");
    } else if (input.interact) {
      this.player.setState("Interact");
    } else {
      this.player.setState("Idle");
    }
    this.player.animation.update(delta);
  }
}
