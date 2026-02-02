import { RunningHorse } from './RunningHorse.class';

export class Hippodrome {
  horses: RunningHorse[];
  length: number;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(horses: RunningHorse[], length: number) {
    this.horses = horses;
    this.length = length;
  }

  isHorseFinished(horse: RunningHorse): boolean {
    return horse.position >= this.length;
  }

  get isAllFinished(): boolean {
    return this.horses.every((horse) => this.isHorseFinished(horse));
  }

  turn(): void {
    this.horses.forEach((horse) => {
      if (this.isHorseFinished(horse)) return;
      horse.run();
    });
  }

  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.turn();

      if (this.isAllFinished) {
        clearInterval(this.interval!);
        this.interval = null;
      }
    }, 100);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  get horsePositions(): [RunningHorse, number][] {
    return this.horses.map((horse) => [
      horse,
      this.isHorseFinished(horse) ? this.length : horse.position,
    ]);
  }
}
