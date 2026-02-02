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

export function EnableMocks<T extends new (...args: any[]) => object>(
  constructor: T
): T {
  return class extends constructor {
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
