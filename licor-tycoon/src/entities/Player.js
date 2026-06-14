import AnimationComponent from "../components/AnimationComponent.js";

export default class Player {
  constructor(model) {
    this.model = model;
    this.animation = new AnimationComponent(model);
    this.state = "Idle"; // Estado inicial
  }

  setState(newState) {
    this.state = newState;
    this.animation.play(newState);
  }
}
