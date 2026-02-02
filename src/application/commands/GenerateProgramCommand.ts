import { Result, ok, err, combine } from '@/shared/Result';
import { ValidationError } from '@/domain/errors/ValidationError';
import { Horse, HorseProps } from '@/domain/value-objects/Horse';
import { Distance, VALID_DISTANCES } from '@/domain/value-objects/Distance';
import { Race } from '@/domain/entities/Race';
import { GameStateStore } from '@/application/ports/output/GameStateStore';
import { EventPublisher } from '@/application/ports/output/EventPublisher';

/**
 * Input parameters for generating a race program.
 */
export interface GenerateProgramInput {
  /**
   * Total number of horses to generate.
   * @default 20
   */
  horseCount?: number;

  /**
   * Number of races to generate.
   * @default 6
   */
  raceCount?: number;

  /**
   * Number of horses per race.
   * @default 10
   */
  horsesPerRace?: number;
}

/**
 * Output of program generation.
 */
export interface GenerateProgramOutput {
  /**
   * All generated horses.
   */
  horses: Horse[];

  /**
   * All generated races.
   */
  races: Race[];
}

/**
 * Horse name parts for random generation.
 */
const HORSE_NAME_PREFIXES = [
  'Thunder', 'Lightning', 'Storm', 'Shadow', 'Midnight', 'Golden',
  'Silver', 'Royal', 'Wild', 'Swift', 'Blazing', 'Mystic',
  'Noble', 'Brave', 'Lucky', 'Dancing', 'Flying', 'Racing',
  'Proud', 'Majestic',
];

const HORSE_NAME_SUFFIXES = [
  'Runner', 'Star', 'Spirit', 'Dream', 'Wind', 'Fire',
  'Arrow', 'Knight', 'Prince', 'Beauty', 'Legend', 'Champion',
  'Flash', 'Bolt', 'Storm', 'Thunder', 'Glory', 'Heart',
  'Dancer', 'Rider',
];

/**
 * Generates a random horse name.
 */
function generateHorseName(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const prefix = HORSE_NAME_PREFIXES[Math.floor(Math.random() * HORSE_NAME_PREFIXES.length)];
    const suffix = HORSE_NAME_SUFFIXES[Math.floor(Math.random() * HORSE_NAME_SUFFIXES.length)];
    const name = `${prefix} ${suffix}`;

    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }

  // Fallback with number suffix if we can't find a unique name
  const fallback = `Horse ${Date.now()}`;
  usedNames.add(fallback);
  return fallback;
}

/**
 * Generates a random hex color.
 */
function generateHorseColor(): string {
  const r = Math.floor(Math.random() * 200) + 55; // 55-255 to avoid too dark colors
  const g = Math.floor(Math.random() * 200) + 55;
  const b = Math.floor(Math.random() * 200) + 55;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generates a random condition (1-100).
 */
function generateCondition(): number {
  return Math.floor(Math.random() * 100) + 1;
}

/**
 * Command to generate a race program with horses and races.
 */
export class GenerateProgramCommand {
  constructor(
    private readonly stateStore: GameStateStore,
    private readonly eventPublisher: EventPublisher
  ) {}

  /**
   * Executes the command to generate a race program.
   *
   * @param input - Configuration for program generation
   * @returns Ok with generated horses and races, or Err with validation error
   */
  async execute(
    input: GenerateProgramInput = {}
  ): Promise<Result<GenerateProgramOutput, ValidationError>> {
    const {
      horseCount = 20,
      raceCount = 6,
      horsesPerRace = 10,
    } = input;

    // Validate inputs
    if (horseCount < horsesPerRace) {
      return err(
        new ValidationError(
          'horseCount',
          `must be at least ${horsesPerRace} (horsesPerRace)`
        )
      );
    }

    if (raceCount < 1) {
      return err(new ValidationError('raceCount', 'must be at least 1'));
    }

    if (horsesPerRace < 2) {
      return err(new ValidationError('horsesPerRace', 'must be at least 2'));
    }

    // Generate horses
    const horsesResult = this.generateHorses(horseCount);
    if (horsesResult.isErr()) {
      return err(horsesResult.error);
    }
    const horses = horsesResult.value;

    // Generate races
    const racesResult = this.generateRaces(horses, raceCount, horsesPerRace);
    if (racesResult.isErr()) {
      return err(racesResult.error);
    }
    const races = racesResult.value;

    // Update state store
    this.stateStore.setHorses(horses);
    this.stateStore.setRaces(races);
    this.stateStore.setCurrentRaceIndex(0);
    this.stateStore.setIsRunning(false);
    this.stateStore.resetTick();

    return ok({ horses, races });
  }

  /**
   * Generates the specified number of horses.
   */
  private generateHorses(count: number): Result<Horse[], ValidationError> {
    const usedNames = new Set<string>();
    const horseResults: Result<Horse, ValidationError>[] = [];

    for (let i = 0; i < count; i++) {
      const props: HorseProps = {
        id: crypto.randomUUID(),
        name: generateHorseName(usedNames),
        color: generateHorseColor(),
        condition: generateCondition(),
      };

      horseResults.push(Horse.create(props));
    }

    const combined = combine(horseResults);
    if (combined.isErr()) {
      return err(combined.error);
    }

    return ok(combined.value);
  }

  /**
   * Generates races with random horse selections and distances.
   */
  private generateRaces(
    horses: Horse[],
    raceCount: number,
    horsesPerRace: number
  ): Result<Race[], ValidationError> {
    const raceResults: Result<Race, ValidationError>[] = [];

    for (let i = 0; i < raceCount; i++) {
      // Select random horses for this race
      const selectedHorses = this.selectRandomHorses(horses, horsesPerRace);

      // Select random distance
      const distanceValue = VALID_DISTANCES[Math.floor(Math.random() * VALID_DISTANCES.length)];
      const distanceResult = Distance.create(distanceValue);
      if (distanceResult.isErr()) {
        return err(distanceResult.error);
      }

      // Create race
      const raceResult = Race.create(selectedHorses, distanceResult.value);
      if (raceResult.isErr()) {
        return err(new ValidationError('race', raceResult.error.message));
      }

      raceResults.push(raceResult as Result<Race, ValidationError>);
    }

    const combined = combine(raceResults);
    if (combined.isErr()) {
      return err(combined.error);
    }

    return ok(combined.value);
  }

  /**
   * Selects random horses from the pool without replacement.
   */
  private selectRandomHorses(horses: Horse[], count: number): Horse[] {
    const shuffled = [...horses].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
