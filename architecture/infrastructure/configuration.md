# Configuration Management

> **When to use**: Setting up typed configuration, validating environment variables, managing feature flags, environment-aware settings.

## Core Principle

Configuration should be typed, validated at startup, and fail fast on invalid values.

---

## Schema Definition with Zod

```typescript
// config/schema.ts
import { z } from 'zod';

const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test']);

export const ConfigSchema = z.object({
  env: EnvironmentSchema,

  api: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().min(1000).max(60000).default(10000),
    retries: z.number().min(0).max(5).default(3),
  }),

  features: z.object({
    enableAnalytics: z.boolean().default(false),
    enableExperimentalFeatures: z.boolean().default(false),
    maxItemsPerPage: z.number().min(10).max(100).default(25),
  }),

  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    enableConsole: z.boolean().default(true),
    enableRemote: z.boolean().default(false),
  }),

  cache: z.object({
    ttlSeconds: z.number().min(0).default(300),
    maxSize: z.number().min(1).default(1000),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
```

---

## Configuration Loader

```typescript
// config/loader.ts
export function loadConfig(): AppConfig {
  const rawConfig = {
    env: import.meta.env.MODE,

    api: {
      baseUrl: import.meta.env.VITE_API_BASE_URL,
      timeout: Number(import.meta.env.VITE_API_TIMEOUT) || undefined,
      retries: Number(import.meta.env.VITE_API_RETRIES) || undefined,
    },

    features: {
      enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
      enableExperimentalFeatures: import.meta.env.VITE_ENABLE_EXPERIMENTAL === 'true',
      maxItemsPerPage: Number(import.meta.env.VITE_MAX_ITEMS_PER_PAGE) || undefined,
    },

    logging: {
      level: import.meta.env.VITE_LOG_LEVEL,
      enableRemote: import.meta.env.VITE_ENABLE_REMOTE_LOGGING === 'true',
    },

    cache: {
      ttlSeconds: Number(import.meta.env.VITE_CACHE_TTL) || undefined,
    },
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Configuration validation failed:');
    console.error(result.error.format());
    throw new ConfigurationError(result.error);
  }

  return Object.freeze(result.data);
}
```

---

## Configuration Access

```typescript
// config/index.ts
let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

// For testing - allows config override
export function setConfig(config: AppConfig): void {
  cachedConfig = Object.freeze(config);
}

export function resetConfig(): void {
  cachedConfig = null;
}
```

---

## Environment Files

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_LOG_LEVEL=debug
VITE_ENABLE_ANALYTICS=false

# .env.staging
VITE_API_BASE_URL=https://staging-api.example.com
VITE_LOG_LEVEL=info
VITE_ENABLE_ANALYTICS=true

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_LOG_LEVEL=warn
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_REMOTE_LOGGING=true
```

---

## Feature Flags

### Simple Feature Flags

```typescript
// config/features.ts
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return getConfig().features[feature] as boolean;
}

// Usage
if (isFeatureEnabled('enableExperimentalFeatures')) {
  showExperimentalUI();
}
```

### Advanced Feature Flags with Conditions

```typescript
// config/featureFlags.ts
interface FeatureFlag {
  enabled: boolean;
  rolloutPercentage?: number;
  enabledFor?: string[];  // User IDs or groups
}

interface FeatureFlags {
  darkMode: FeatureFlag;
  newCheckout: FeatureFlag;
  betaFeatures: FeatureFlag;
}

export class FeatureFlagService {
  constructor(private readonly flags: FeatureFlags) {}

  isEnabled(flag: keyof FeatureFlags, context?: { userId?: string }): boolean {
    const config = this.flags[flag];

    if (!config.enabled) return false;

    // Check user-specific enablement
    if (config.enabledFor && context?.userId) {
      return config.enabledFor.includes(context.userId);
    }

    // Check rollout percentage
    if (config.rolloutPercentage !== undefined && context?.userId) {
      const hash = this.hashUserId(context.userId);
      return hash < config.rolloutPercentage;
    }

    return config.enabled;
  }

  private hashUserId(userId: string): number {
    // Simple hash to 0-100 range
    let hash = 0;
    for (const char of userId) {
      hash = (hash << 5) - hash + char.charCodeAt(0);
    }
    return Math.abs(hash) % 100;
  }
}
```

---

## Environment-Specific Behavior

```typescript
// config/helpers.ts
export function isDevelopment(): boolean {
  return getConfig().env === 'development';
}

export function isProduction(): boolean {
  return getConfig().env === 'production';
}

export function isTest(): boolean {
  return getConfig().env === 'test';
}

// Usage
if (isDevelopment()) {
  enableDevTools();
  mockExternalServices();
}
```

---

## Runtime Configuration Updates

For settings that can change without restart:

```typescript
// config/RuntimeConfig.ts
export class RuntimeConfig<T> {
  private value: T;
  private listeners = new Set<(value: T) => void>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    this.value = newValue;
    this.listeners.forEach(listener => listener(newValue));
  }

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// Usage
const maintenanceMode = new RuntimeConfig(false);

// Check
if (maintenanceMode.get()) {
  showMaintenancePage();
}

// React to changes
maintenanceMode.subscribe((enabled) => {
  if (enabled) redirectToMaintenance();
});

// Update (e.g., from admin panel or websocket)
maintenanceMode.set(true);
```

---

## Testing Configuration

```typescript
// test/setup.ts
import { setConfig } from '../config';

export const testConfig: AppConfig = {
  env: 'test',
  api: {
    baseUrl: 'http://localhost:9999',
    timeout: 1000,
    retries: 0,
  },
  features: {
    enableAnalytics: false,
    enableExperimentalFeatures: true,
    maxItemsPerPage: 10,
  },
  logging: {
    level: 'error',
    enableConsole: false,
    enableRemote: false,
  },
  cache: {
    ttlSeconds: 0,
    maxSize: 10,
  },
};

beforeAll(() => {
  setConfig(testConfig);
});
```

---

## Best Practices

| Practice | Reason |
|----------|--------|
| Validate at startup | Fail fast, not in production |
| Use defaults wisely | Development should just work |
| Freeze config object | Prevent accidental mutation |
| Type everything | Catch typos at compile time |
| Never commit secrets | Use environment variables |
| Document each setting | Explain what each value controls |
