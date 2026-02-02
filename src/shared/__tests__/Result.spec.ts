import { describe, it, expect } from 'vitest';
import { Ok, Err, ok, err, combine, tryCatch, tryCatchAsync } from '../Result';

describe('Result', () => {
  describe('Ok', () => {
    it('should create an Ok instance with ok()', () => {
      const result = ok(42);

      expect(result).toBeInstanceOf(Ok);
      expect(result.value).toBe(42);
    });

    it('should return true for isOk()', () => {
      const result = ok('hello');

      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
    });

    it('should have _tag of "Ok"', () => {
      const result = ok(1);

      expect(result._tag).toBe('Ok');
    });

    it('should transform value with map()', () => {
      const result = ok(5).map((x) => x * 2);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should chain with flatMap()', () => {
      const result = ok(5).flatMap((x) => ok(x * 2));

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should propagate error in flatMap()', () => {
      const result = ok(5).flatMap(() => err('oops'));

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe('oops');
    });

    it('should return value with unwrap()', () => {
      const result = ok(42);

      expect(result.unwrap()).toBe(42);
    });

    it('should return value with unwrapOr()', () => {
      const result = ok(42);

      expect(result.unwrapOr(0)).toBe(42);
    });

    it('should return value with unwrapOrElse()', () => {
      const result = ok(42);

      expect(result.unwrapOrElse(() => 0)).toBe(42);
    });

    it('should call ok handler in match()', () => {
      const result = ok(42).match({
        ok: (v) => `value: ${v}`,
        err: () => 'error',
      });

      expect(result).toBe('value: 42');
    });

    it('should execute fn and return self with tap()', () => {
      let sideEffect = 0;
      const result = ok(5).tap((v) => {
        sideEffect = v;
      });

      expect(sideEffect).toBe(5);
      expect(result.value).toBe(5);
    });

    it('should pass through mapErr()', () => {
      const result = ok<number, string>(42).mapErr((e) => e.toUpperCase());

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(42);
    });
  });

  describe('Err', () => {
    it('should create an Err instance with err()', () => {
      const result = err('error message');

      expect(result).toBeInstanceOf(Err);
      expect(result.error).toBe('error message');
    });

    it('should return true for isErr()', () => {
      const result = err('error');

      expect(result.isErr()).toBe(true);
      expect(result.isOk()).toBe(false);
    });

    it('should have _tag of "Err"', () => {
      const result = err('error');

      expect(result._tag).toBe('Err');
    });

    it('should not transform with map()', () => {
      const result = err<string>('error').map((x: number) => x * 2);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe('error');
    });

    it('should not chain with flatMap()', () => {
      const result = err<string>('error').flatMap((x: number) => ok(x * 2));

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe('error');
    });

    it('should throw with unwrap()', () => {
      const result = err('oops');

      expect(() => result.unwrap()).toThrow('oops');
    });

    it('should return default with unwrapOr()', () => {
      const result = err('error');

      expect(result.unwrapOr(99)).toBe(99);
    });

    it('should return computed value with unwrapOrElse()', () => {
      const result = err('error');

      expect(result.unwrapOrElse((e) => e.length)).toBe(5);
    });

    it('should call err handler in match()', () => {
      const result = err('oops').match({
        ok: () => 'value',
        err: (e) => `error: ${e}`,
      });

      expect(result).toBe('error: oops');
    });

    it('should not execute fn in tap()', () => {
      let sideEffect = 0;
      const result = err('error').tap(() => {
        sideEffect = 1;
      });

      expect(sideEffect).toBe(0);
      expect(result.error).toBe('error');
    });

    it('should transform error with mapErr()', () => {
      const result = err('error').mapErr((e) => e.toUpperCase());

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe('ERROR');
    });
  });

  describe('combine', () => {
    it('should return Ok array when all results are Ok', () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = combine(results);

      expect(combined.isOk()).toBe(true);
      expect(combined.value).toEqual([1, 2, 3]);
    });

    it('should return first Err when any result is Err', () => {
      const results = [ok(1), err('first error'), ok(3), err('second error')];
      const combined = combine(results);

      expect(combined.isErr()).toBe(true);
      expect(combined.error).toBe('first error');
    });

    it('should return Ok empty array for empty input', () => {
      const combined = combine([]);

      expect(combined.isOk()).toBe(true);
      expect(combined.value).toEqual([]);
    });

    it('should return single Err for single Err input', () => {
      const combined = combine([err('only error')]);

      expect(combined.isErr()).toBe(true);
      expect(combined.error).toBe('only error');
    });
  });

  describe('tryCatch', () => {
    it('should return Ok for successful function', () => {
      const result = tryCatch(() => 42);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should return Err for throwing function', () => {
      const result = tryCatch(() => {
        throw new Error('oops');
      });

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('oops');
    });

    it('should use custom error mapper', () => {
      const result = tryCatch(
        () => {
          throw new Error('oops');
        },
        (e) => `caught: ${(e as Error).message}`
      );

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe('caught: oops');
    });
  });

  describe('tryCatchAsync', () => {
    it('should return Ok for successful async function', async () => {
      const result = await tryCatchAsync(async () => {
        return 42;
      });

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should return Err for throwing async function', async () => {
      const result = await tryCatchAsync(async () => {
        throw new Error('async oops');
      });

      expect(result.isErr()).toBe(true);
      expect((result.error as Error).message).toBe('async oops');
    });

    it('should use custom error mapper for async', async () => {
      const result = await tryCatchAsync(
        async () => {
          throw new Error('async oops');
        },
        (e) => `caught: ${(e as Error).message}`
      );

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe('caught: async oops');
    });
  });

  describe('type narrowing', () => {
    it('should narrow type after isOk() check', () => {
      const result = ok(42) as ReturnType<typeof ok<number>> | ReturnType<typeof err<string>>;

      if (result.isOk()) {
        // TypeScript should know result.value exists
        expect(result.value).toBe(42);
      } else {
        // This branch should not execute
        expect(true).toBe(false);
      }
    });

    it('should narrow type after isErr() check', () => {
      const result = err('error') as ReturnType<typeof ok<number>> | ReturnType<typeof err<string>>;

      if (result.isErr()) {
        // TypeScript should know result.error exists
        expect(result.error).toBe('error');
      } else {
        // This branch should not execute
        expect(true).toBe(false);
      }
    });
  });
});
