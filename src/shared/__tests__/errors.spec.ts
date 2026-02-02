import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BaseError,
  OperationalError,
  ProgrammerError,
  UnreachableError,
  AssertionError,
  assert,
  assertDefined,
  assertNever,
} from '../errors';

// Concrete implementation for testing abstract BaseError
class TestError extends BaseError {
  readonly code = 'TEST_ERROR';
  readonly isOperational = true;
}

// Concrete implementation for testing abstract OperationalError
class TestOperationalError extends OperationalError {
  readonly code = 'TEST_OPERATIONAL';
  readonly userMessage = 'Something went wrong';
  readonly httpStatus = 400;
}

// Concrete implementation for testing abstract ProgrammerError
class TestProgrammerError extends ProgrammerError {
  readonly code = 'TEST_PROGRAMMER';
}

describe('Error Hierarchy', () => {
  describe('BaseError', () => {
    it('should create error with message', () => {
      const error = new TestError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.name).toBe('TestError');
    });

    it('should have unique id', () => {
      const error1 = new TestError('Error 1');
      const error2 = new TestError('Error 2');

      expect(error1.id).toBeDefined();
      expect(error2.id).toBeDefined();
      expect(error1.id).not.toBe(error2.id);
    });

    it('should have timestamp', () => {
      const before = new Date();
      const error = new TestError('Test');
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should have code property', () => {
      const error = new TestError('Test');

      expect(error.code).toBe('TEST_ERROR');
    });

    it('should have isOperational property', () => {
      const error = new TestError('Test');

      expect(error.isOperational).toBe(true);
    });

    it('should store cause error', () => {
      const cause = new Error('Original error');
      const error = new TestError('Wrapped error', cause);

      expect(error.cause).toBe(cause);
    });

    it('should extend Error', () => {
      const error = new TestError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
    });

    it('should have stack trace', () => {
      const error = new TestError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestError');
    });

    describe('toJSON', () => {
      it('should serialize to JSON', () => {
        const error = new TestError('Test message');
        const json = error.toJSON();

        expect(json.id).toBe(error.id);
        expect(json.code).toBe('TEST_ERROR');
        expect(json.name).toBe('TestError');
        expect(json.message).toBe('Test message');
        expect(json.timestamp).toBe(error.timestamp.toISOString());
        expect(json.isOperational).toBe(true);
      });

      it('should include cause message if present', () => {
        const cause = new Error('Cause message');
        const error = new TestError('Test message', cause);
        const json = error.toJSON();

        expect(json.cause).toBe('Cause message');
      });

      it('should not include cause if not present', () => {
        const error = new TestError('Test message');
        const json = error.toJSON();

        expect(json.cause).toBeUndefined();
      });

      it('should be JSON serializable', () => {
        const error = new TestError('Test');
        const jsonString = JSON.stringify(error.toJSON());

        expect(() => JSON.parse(jsonString)).not.toThrow();
      });
    });

    describe('toString', () => {
      it('should return formatted string', () => {
        const error = new TestError('Something happened');

        expect(error.toString()).toBe('[TEST_ERROR] TestError: Something happened');
      });
    });
  });

  describe('OperationalError', () => {
    it('should have isOperational = true', () => {
      const error = new TestOperationalError('Test');

      expect(error.isOperational).toBe(true);
    });

    it('should have userMessage', () => {
      const error = new TestOperationalError('Technical details');

      expect(error.userMessage).toBe('Something went wrong');
    });

    it('should have optional httpStatus', () => {
      const error = new TestOperationalError('Test');

      expect(error.httpStatus).toBe(400);
    });

    it('should extend BaseError', () => {
      const error = new TestOperationalError('Test');

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(OperationalError);
    });

    it('should include httpStatus and userMessage in toJSON', () => {
      const error = new TestOperationalError('Test');
      const json = error.toJSON();

      expect(json.userMessage).toBe('Something went wrong');
      expect(json.httpStatus).toBe(400);
    });
  });

  describe('ProgrammerError', () => {
    it('should have isOperational = false', () => {
      const error = new TestProgrammerError('Bug found');

      expect(error.isOperational).toBe(false);
    });

    it('should extend BaseError', () => {
      const error = new TestProgrammerError('Bug');

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(ProgrammerError);
    });
  });

  describe('UnreachableError', () => {
    it('should have code UNREACHABLE', () => {
      // @ts-expect-error - Testing with non-never value
      const error = new UnreachableError('unexpected');

      expect(error.code).toBe('UNREACHABLE');
    });

    it('should include value in message', () => {
      // @ts-expect-error - Testing with non-never value
      const error = new UnreachableError({ type: 'unknown' });

      expect(error.message).toContain('unknown');
    });

    it('should use custom message if provided', () => {
      // @ts-expect-error - Testing with non-never value
      const error = new UnreachableError('value', 'Custom unreachable message');

      expect(error.message).toBe('Custom unreachable message');
    });

    it('should be a ProgrammerError', () => {
      // @ts-expect-error - Testing with non-never value
      const error = new UnreachableError('x');

      expect(error).toBeInstanceOf(ProgrammerError);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('AssertionError', () => {
    it('should have code ASSERTION_FAILED', () => {
      const error = new AssertionError('Condition not met');

      expect(error.code).toBe('ASSERTION_FAILED');
    });

    it('should store assertion message', () => {
      const error = new AssertionError('Expected x to be positive');

      expect(error.message).toBe('Expected x to be positive');
    });

    it('should be a ProgrammerError', () => {
      const error = new AssertionError('Failed');

      expect(error).toBeInstanceOf(ProgrammerError);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('assert', () => {
    it('should not throw when condition is true', () => {
      expect(() => assert(true, 'Should not throw')).not.toThrow();
      expect(() => assert(1 === 1, 'Math works')).not.toThrow();
    });

    it('should throw AssertionError when condition is false', () => {
      expect(() => assert(false, 'Condition failed')).toThrow(AssertionError);
      expect(() => assert(false, 'Condition failed')).toThrow('Condition failed');
    });

    it('should narrow type after assertion', () => {
      const value: unknown = 'hello';

      assert(typeof value === 'string', 'Value must be string');

      // TypeScript should know value is string here
      expect(value.toUpperCase()).toBe('HELLO');
    });
  });

  describe('assertDefined', () => {
    it('should not throw for defined values', () => {
      expect(() => assertDefined('hello', 'Should exist')).not.toThrow();
      expect(() => assertDefined(0, 'Zero is defined')).not.toThrow();
      expect(() => assertDefined(false, 'False is defined')).not.toThrow();
      expect(() => assertDefined('', 'Empty string is defined')).not.toThrow();
    });

    it('should throw for null', () => {
      expect(() => assertDefined(null, 'Value is null')).toThrow(AssertionError);
      expect(() => assertDefined(null, 'Value is null')).toThrow('Value is null');
    });

    it('should throw for undefined', () => {
      expect(() => assertDefined(undefined, 'Value is undefined')).toThrow(AssertionError);
    });

    it('should narrow type after assertion', () => {
      const value: string | null | undefined = 'hello';

      assertDefined(value, 'Value must be defined');

      // TypeScript should know value is string here
      expect(value.toUpperCase()).toBe('HELLO');
    });
  });

  describe('assertNever', () => {
    it('should throw UnreachableError', () => {
      // @ts-expect-error - Testing with non-never value
      expect(() => assertNever('unexpected')).toThrow(UnreachableError);
    });

    it('should be usable in exhaustive switch statements', () => {
      type Status = 'active' | 'inactive';

      function handleStatus(status: Status): string {
        switch (status) {
          case 'active':
            return 'Is active';
          case 'inactive':
            return 'Is inactive';
          default:
            return assertNever(status);
        }
      }

      expect(handleStatus('active')).toBe('Is active');
      expect(handleStatus('inactive')).toBe('Is inactive');
    });
  });
});
