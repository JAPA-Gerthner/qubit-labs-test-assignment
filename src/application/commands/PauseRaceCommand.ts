import { Result, ok } from '@/shared/Result';
import { StartRaceCommand } from './StartRaceCommand';
import { GameStateStore } from '@/application/ports/output/GameStateStore';

/**
 * Command to pause a running race simulation.
 * The race can be resumed by calling StartRaceCommand again.
 */
export class PauseRaceCommand {
  constructor(
    private readonly startRaceCommand: StartRaceCommand,
    private readonly stateStore: GameStateStore
  ) {}

  /**
   * Pauses the race simulation.
   * Stops the timer but preserves the current race state.
   *
   * @returns Ok always (pausing is always successful, even if not running)
   */
  execute(): Result<void, never> {
    this.startRaceCommand.stop();
    this.stateStore.setIsRunning(false);
    return ok(undefined);
  }
}
