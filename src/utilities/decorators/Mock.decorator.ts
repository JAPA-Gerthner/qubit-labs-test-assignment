import 'reflect-metadata';

const MOCK_METADATA_KEY = Symbol('mock:generator');
const MOCK_KEYS_METADATA_KEY = Symbol('mock:keys');

export function Mock<T>(generator: () => T): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const key = String(propertyKey);

    // Store generator for this property
    Reflect.defineMetadata(MOCK_METADATA_KEY, generator, target, propertyKey);

    // Track all mock keys on the class
    const existingKeys: string[] = Reflect.getMetadata(MOCK_KEYS_METADATA_KEY, target) || [];
    if (!existingKeys.includes(key)) {
      Reflect.defineMetadata(MOCK_KEYS_METADATA_KEY, [...existingKeys, key], target);
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EnableMocks<T extends new (...args: unknown[]) => object>(
  constructor: T
): T {
  // Using 'any' here is necessary for decorator class extension pattern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return class extends (constructor as new (...args: any[]) => object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);

      const keys: string[] = Reflect.getMetadata(MOCK_KEYS_METADATA_KEY, constructor.prototype) || [];

      keys.forEach((key) => {
        if ((this as Record<string, unknown>)[key] === undefined) {
          const generator = Reflect.getMetadata(MOCK_METADATA_KEY, constructor.prototype, key);
          if (generator) {
            Object.defineProperty(this, key, {
              value: generator(),
              writable: true,
              enumerable: true,
            });
          }
        }
      });
    }
  };
}
