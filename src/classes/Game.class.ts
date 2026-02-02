import { Horse } from './Horse.class';
import { Race } from './Race.class';
import { RunningHorse } from './RunningHorse.class';

export const DISTANCES = [1200, 1400, 1600, 1800, 2000, 2200];

export class Game {
  static generateHorses(count: number = 20): Horse[] {
    return Array.from({ length: count }, () => new Horse());
  }

  static generateRaces(horses: Horse[]): Race[] {
    return DISTANCES.map((distance) => {
      const selectedHorses = Game.pickRandomHorses(horses, 10);
      const runningHorses = selectedHorses.map((horse) => new RunningHorse(horse));
      return new Race(runningHorses, distance);
    });
  }

  static pickRandomHorses(horses: Horse[], count: number): Horse[] {
    const shuffled = [...horses].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
