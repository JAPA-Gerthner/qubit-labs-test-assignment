import { faker } from '@faker-js/faker';
import { RunningHorse } from './RunningHorse.class';

export class Race {
  id: string = faker.string.uuid();
  horses: RunningHorse[];
  length: number;
  results: RunningHorse[] = [];

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
    const justFinished: RunningHorse[] = [];

    this.horses.forEach((horse) => {
      if (this.isHorseFinished(horse)) return;

      horse.run();
      if (horse.position >= this.length) {
        justFinished.push(horse);
      }
    });

    justFinished
        .sort((a, b) => b.position - a.position)
        .forEach((horse) => {
          this.results.push(horse);
          horse.position = this.length;
        });
  }
}
