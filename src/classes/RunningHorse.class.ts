import { Horse } from './Horse.class';

export class RunningHorse {
  position: number = 0;

  constructor(
      public horse: Horse
  ) {}

  run(): void {
    this.position += Math.floor(Math.random() * this.horse.condition) + 1;
  }
}
