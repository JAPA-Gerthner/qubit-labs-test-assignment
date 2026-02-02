# Security Patterns

> **When to use**: Input validation, authentication, authorization, preventing common vulnerabilities (XSS, CSRF, injection), secrets management, audit logging.

## Core Principles

1. **Defense in depth** — Multiple layers of security
2. **Least privilege** — Minimum permissions required
3. **Fail secure** — Deny by default
4. **Never trust input** — Validate everything from outside the system
5. **Keep secrets secret** — Never log, expose, or hardcode credentials

---

## Input Validation

### Validation at System Boundaries

```typescript
// shared/validation/Validator.ts
export interface ValidationRule<T> {
  validate(value: T): boolean;
  message: string;
}

export class Validator<T> {
  private rules: ValidationRule<T>[] = [];

  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  validate(value: T): Result<T, ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        errors.push(new ValidationError(rule.message));
      }
    }

    return errors.length > 0 ? err(errors) : ok(value);
  }
}

// Common validation rules
export const Rules = {
  required: <T>(field: string): ValidationRule<T | null | undefined> => ({
    validate: (v) => v !== null && v !== undefined && v !== '',
    message: `${field} is required`,
  }),

  minLength: (field: string, min: number): ValidationRule<string> => ({
    validate: (v) => v.length >= min,
    message: `${field} must be at least ${min} characters`,
  }),

  maxLength: (field: string, max: number): ValidationRule<string> => ({
    validate: (v) => v.length <= max,
    message: `${field} must be at most ${max} characters`,
  }),

  pattern: (field: string, regex: RegExp, hint: string): ValidationRule<string> => ({
    validate: (v) => regex.test(v),
    message: `${field} ${hint}`,
  }),

  email: (field: string): ValidationRule<string> => ({
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: `${field} must be a valid email`,
  }),

  url: (field: string): ValidationRule<string> => ({
    validate: (v) => {
      try { new URL(v); return true; } catch { return false; }
    },
    message: `${field} must be a valid URL`,
  }),

  inRange: (field: string, min: number, max: number): ValidationRule<number> => ({
    validate: (v) => v >= min && v <= max,
    message: `${field} must be between ${min} and ${max}`,
  }),

  oneOf: <T>(field: string, allowed: T[]): ValidationRule<T> => ({
    validate: (v) => allowed.includes(v),
    message: `${field} must be one of: ${allowed.join(', ')}`,
  }),
};
```

### Sanitization

```typescript
// shared/validation/Sanitizer.ts
export const Sanitize = {
  // Remove HTML tags
  stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  },

  // Escape HTML entities
  escapeHtml(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return input.replace(/[&<>"']/g, (char) => map[char]);
  },

  // Remove null bytes and control characters
  stripControlChars(input: string): string {
    return input.replace(/[\x00-\x1F\x7F]/g, '');
  },

  // Normalize unicode to prevent homograph attacks
  normalizeUnicode(input: string): string {
    return input.normalize('NFKC');
  },

  // Trim and collapse whitespace
  normalizeWhitespace(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  },

  // Safe filename
  filename(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .slice(0, 255);
  },

  // Chain sanitizers
  chain(...sanitizers: ((s: string) => string)[]): (input: string) => string {
    return (input) => sanitizers.reduce((acc, fn) => fn(acc), input);
  },
};

// Usage
const sanitizeUserInput = Sanitize.chain(
  Sanitize.stripControlChars,
  Sanitize.normalizeWhitespace,
  Sanitize.escapeHtml
);
```

---

## Authentication

### Token Management

```typescript
// infrastructure/auth/TokenService.ts
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface TokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(tokens: TokenPair): void;
  clearTokens(): void;
}

// Secure storage - httpOnly cookies preferred, memory fallback
export class SecureTokenStorage implements TokenStorage {
  private memoryTokens: TokenPair | null = null;

  getAccessToken(): string | null {
    // Prefer httpOnly cookie (set by server)
    // Fall back to memory for SPAs without cookie support
    return this.memoryTokens?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.memoryTokens?.refreshToken ?? null;
  }

  setTokens(tokens: TokenPair): void {
    this.memoryTokens = tokens;
    // Never store in localStorage - vulnerable to XSS
  }

  clearTokens(): void {
    this.memoryTokens = null;
  }
}

// Token refresh logic
export class TokenManager {
  private refreshPromise: Promise<TokenPair> | null = null;

  constructor(
    private storage: TokenStorage,
    private authApi: AuthApi
  ) {}

  async getValidToken(): Promise<string | null> {
    const token = this.storage.getAccessToken();
    if (!token) return null;

    if (this.isTokenExpired(token)) {
      return this.refreshToken();
    }

    return token;
  }

  private async refreshToken(): Promise<string | null> {
    // Prevent concurrent refresh requests
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh();
    }

    try {
      const tokens = await this.refreshPromise;
      return tokens.accessToken;
    } catch {
      this.storage.clearTokens();
      return null;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<TokenPair> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const tokens = await this.authApi.refresh(refreshToken);
    this.storage.setTokens(tokens);
    return tokens;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now() - 30000; // 30s buffer
    } catch {
      return true;
    }
  }
}
```

### Password Handling

```typescript
// NEVER store plain passwords - this is server-side only
// infrastructure/auth/PasswordService.ts
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';

export class PasswordService {
  private readonly keyLength = 64;
  private readonly saltLength = 16;

  async hash(password: string): Promise<string> {
    const salt = randomBytes(this.saltLength);
    const hash = await this.scryptHash(password, salt);
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [saltHex, hashHex] = stored.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const storedHash = Buffer.from(hashHex, 'hex');
    const hash = await this.scryptHash(password, salt);

    // Timing-safe comparison prevents timing attacks
    return timingSafeEqual(hash, storedHash);
  }

  private scryptHash(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(password, salt, this.keyLength, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });
  }
}

// Password strength validation (client + server)
export function validatePasswordStrength(password: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (password.length < 12) {
    errors.push(new ValidationError('password', 'must be at least 12 characters'));
  }
  if (!/[a-z]/.test(password)) {
    errors.push(new ValidationError('password', 'must contain lowercase letter'));
  }
  if (!/[A-Z]/.test(password)) {
    errors.push(new ValidationError('password', 'must contain uppercase letter'));
  }
  if (!/[0-9]/.test(password)) {
    errors.push(new ValidationError('password', 'must contain a number'));
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push(new ValidationError('password', 'must contain a special character'));
  }

  return errors;
}
```

---

## Authorization

### Permission-Based Access Control

```typescript
// domain/auth/Permission.ts
export type Permission =
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'order:read'
  | 'order:write'
  | 'order:cancel'
  | 'admin:access';

export type Role = 'guest' | 'user' | 'moderator' | 'admin';

export const RolePermissions: Record<Role, Permission[]> = {
  guest: [],
  user: ['user:read', 'order:read', 'order:write'],
  moderator: ['user:read', 'user:write', 'order:read', 'order:write', 'order:cancel'],
  admin: ['user:read', 'user:write', 'user:delete', 'order:read', 'order:write', 'order:cancel', 'admin:access'],
};

// domain/auth/AuthContext.ts
export interface AuthContext {
  userId: UserId | null;
  role: Role;
  permissions: Set<Permission>;
}

export class AuthContextBuilder {
  static fromUser(user: User | null): AuthContext {
    if (!user) {
      return { userId: null, role: 'guest', permissions: new Set() };
    }

    const permissions = new Set(RolePermissions[user.role]);

    // Add any user-specific permissions
    user.additionalPermissions?.forEach(p => permissions.add(p));

    return { userId: user.id, role: user.role, permissions };
  }
}
```

### Authorization Guard

```typescript
// application/auth/AuthorizationGuard.ts
export class AuthorizationGuard {
  constructor(private context: AuthContext) {}

  hasPermission(permission: Permission): boolean {
    return this.context.permissions.has(permission);
  }

  hasAnyPermission(...permissions: Permission[]): boolean {
    return permissions.some(p => this.context.permissions.has(p));
  }

  hasAllPermissions(...permissions: Permission[]): boolean {
    return permissions.every(p => this.context.permissions.has(p));
  }

  isAuthenticated(): boolean {
    return this.context.userId !== null;
  }

  isOwner(resourceOwnerId: UserId): boolean {
    return this.context.userId === resourceOwnerId;
  }

  // Throws if not authorized
  requirePermission(permission: Permission): void {
    if (!this.hasPermission(permission)) {
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }
  }

  requireAuthenticated(): void {
    if (!this.isAuthenticated()) {
      throw new UnauthorizedError();
    }
  }

  requireOwnerOrPermission(resourceOwnerId: UserId, permission: Permission): void {
    if (!this.isOwner(resourceOwnerId) && !this.hasPermission(permission)) {
      throw new ForbiddenError();
    }
  }
}

// Usage in use case
export class DeleteUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private guard: AuthorizationGuard
  ) {}

  async execute(userId: UserId): Promise<Result<void, DomainError>> {
    this.guard.requirePermission('user:delete');

    // Prevent self-deletion
    if (this.guard.isOwner(userId)) {
      return err(new BusinessRuleViolationError('Cannot delete yourself'));
    }

    return this.userRepo.delete(userId);
  }
}
```

### Resource-Level Authorization

```typescript
// application/auth/ResourceGuard.ts
export interface ResourcePolicy<T> {
  canRead(resource: T, context: AuthContext): boolean;
  canWrite(resource: T, context: AuthContext): boolean;
  canDelete(resource: T, context: AuthContext): boolean;
}

export class OrderPolicy implements ResourcePolicy<Order> {
  canRead(order: Order, context: AuthContext): boolean {
    // Owner or has order:read permission
    return order.customerId === context.userId ||
           context.permissions.has('order:read');
  }

  canWrite(order: Order, context: AuthContext): boolean {
    // Owner and order is draft, or has order:write permission
    const isOwner = order.customerId === context.userId;
    return (isOwner && order.status === 'draft') ||
           context.permissions.has('order:write');
  }

  canDelete(order: Order, context: AuthContext): boolean {
    // Only admins can delete
    return context.permissions.has('admin:access');
  }
}

// Filter collections by authorization
export function filterAuthorized<T>(
  items: T[],
  policy: ResourcePolicy<T>,
  context: AuthContext,
  action: 'read' | 'write' | 'delete' = 'read'
): T[] {
  const checker = {
    read: (item: T) => policy.canRead(item, context),
    write: (item: T) => policy.canWrite(item, context),
    delete: (item: T) => policy.canDelete(item, context),
  };

  return items.filter(checker[action]);
}
```

---

## XSS Prevention

```typescript
// shared/security/xss.ts

// Content Security Policy header
export const CSP_HEADER = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",  // No 'unsafe-inline' or 'unsafe-eval'
    "style-src 'self' 'unsafe-inline'",  // Inline styles often needed
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

// Safe HTML rendering (when you must render user HTML)
export function sanitizeHtml(dirty: string): string {
  // Use a library like DOMPurify
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
  });
}

// Safe URL validation
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https, prevent javascript: and data: URLs
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Safe redirect
export function safeRedirect(url: string, allowedHosts: string[]): string {
  try {
    const parsed = new URL(url);
    if (!allowedHosts.includes(parsed.host)) {
      return '/'; // Redirect to home if not allowed
    }
    return url;
  } catch {
    // Relative URL - safe
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }
    return '/';
  }
}
```

---

## CSRF Protection

```typescript
// infrastructure/security/csrf.ts
export class CsrfProtection {
  private tokenKey = 'csrf-token';

  generateToken(): string {
    const token = crypto.randomUUID();
    // Store in session (server-side) or secure cookie
    return token;
  }

  // Middleware to validate CSRF token
  validateRequest(request: Request, storedToken: string): boolean {
    // Skip safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const requestToken =
      request.headers.get('x-csrf-token') ??
      request.headers.get('x-xsrf-token');

    if (!requestToken || !storedToken) {
      return false;
    }

    // Timing-safe comparison
    return this.timingSafeEqual(requestToken, storedToken);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

// Double-submit cookie pattern for SPAs
export class DoubleSubmitCsrf {
  private cookieName = 'XSRF-TOKEN';
  private headerName = 'X-XSRF-TOKEN';

  // Set cookie (server-side, NOT httpOnly so JS can read it)
  setCookie(response: Response): string {
    const token = crypto.randomUUID();
    response.headers.set(
      'Set-Cookie',
      `${this.cookieName}=${token}; Path=/; SameSite=Strict; Secure`
    );
    return token;
  }

  // Validate (server-side)
  validate(request: Request): boolean {
    const cookieToken = this.getCookieToken(request);
    const headerToken = request.headers.get(this.headerName);

    if (!cookieToken || !headerToken) return false;

    return cookieToken === headerToken;
  }

  private getCookieToken(request: Request): string | null {
    const cookies = request.headers.get('cookie') ?? '';
    const match = cookies.match(new RegExp(`${this.cookieName}=([^;]+)`));
    return match?.[1] ?? null;
  }
}
```

---

## SQL Injection Prevention

```typescript
// infrastructure/persistence/SafeQuery.ts

// NEVER do this:
// const query = `SELECT * FROM users WHERE id = '${userId}'`;

// Always use parameterized queries
export class SafeQueryBuilder {
  private query = '';
  private params: unknown[] = [];
  private paramIndex = 1;

  select(columns: string[]): this {
    // Whitelist column names
    const safeColumns = columns.filter(c => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c));
    this.query = `SELECT ${safeColumns.join(', ')}`;
    return this;
  }

  from(table: string): this {
    // Whitelist table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      throw new Error('Invalid table name');
    }
    this.query += ` FROM ${table}`;
    return this;
  }

  where(column: string, operator: '=' | '>' | '<' | '>=' | '<=' | 'LIKE', value: unknown): this {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      throw new Error('Invalid column name');
    }
    this.query += ` WHERE ${column} ${operator} $${this.paramIndex++}`;
    this.params.push(value);
    return this;
  }

  build(): { query: string; params: unknown[] } {
    return { query: this.query, params: this.params };
  }
}

// Usage with any DB library
const { query, params } = new SafeQueryBuilder()
  .select(['id', 'email', 'name'])
  .from('users')
  .where('id', '=', userId)
  .build();

// pg: client.query(query, params)
// mysql: connection.execute(query, params)
```

---

## Secrets Management

```typescript
// infrastructure/secrets/SecretManager.ts
export interface SecretProvider {
  get(key: string): Promise<string>;
  has(key: string): Promise<boolean>;
}

// Environment variables (development)
export class EnvSecretProvider implements SecretProvider {
  async get(key: string): Promise<string> {
    const value = process.env[key];
    if (!value) throw new Error(`Secret not found: ${key}`);
    return value;
  }

  async has(key: string): Promise<boolean> {
    return key in process.env;
  }
}

// AWS Secrets Manager (production)
export class AwsSecretProvider implements SecretProvider {
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private client: SecretsManagerClient) {}

  async get(key: string): Promise<string> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const response = await this.client.send(
      new GetSecretValueCommand({ SecretId: key })
    );

    const value = response.SecretString!;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return value;
  }

  async has(key: string): Promise<boolean> {
    try {
      await this.get(key);
      return true;
    } catch {
      return false;
    }
  }
}

// Secret usage - never log or expose
export class DatabaseConfig {
  private constructor(
    readonly host: string,
    readonly port: number,
    readonly database: string,
    private readonly password: string
  ) {}

  static async fromSecrets(secrets: SecretProvider): Promise<DatabaseConfig> {
    return new DatabaseConfig(
      await secrets.get('DB_HOST'),
      parseInt(await secrets.get('DB_PORT')),
      await secrets.get('DB_NAME'),
      await secrets.get('DB_PASSWORD')
    );
  }

  getConnectionString(): string {
    // Password is used but never exposed
    return `postgres://user:${this.password}@${this.host}:${this.port}/${this.database}`;
  }

  // Prevent accidental logging
  toJSON(): Record<string, unknown> {
    return {
      host: this.host,
      port: this.port,
      database: this.database,
      password: '[REDACTED]',
    };
  }

  toString(): string {
    return `DatabaseConfig(${this.host}:${this.port}/${this.database})`;
  }
}
```

---

## Secure Headers

```typescript
// infrastructure/http/securityHeaders.ts
export const SecurityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

  // HSTS (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Content Security Policy (customize per app)
  'Content-Security-Policy': "default-src 'self'; script-src 'self'",
};

// Middleware
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  Object.entries(SecurityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
}
```

---

## Audit Logging

```typescript
// infrastructure/audit/AuditLogger.ts
export interface AuditEvent {
  timestamp: Date;
  eventType: string;
  userId: UserId | null;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'read' | 'update' | 'delete';
  outcome: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditStore {
  log(event: AuditEvent): Promise<void>;
  query(filter: AuditFilter): Promise<AuditEvent[]>;
}

export class AuditLogger {
  constructor(
    private store: AuditStore,
    private contextProvider: () => Partial<AuditEvent>
  ) {}

  async log(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
    const context = this.contextProvider();
    const fullEvent: AuditEvent = {
      ...context,
      ...event,
      timestamp: new Date(),
    };

    // Never await in hot path - fire and forget
    this.store.log(fullEvent).catch(err => {
      console.error('Audit log failed:', err);
    });
  }

  // Convenience methods
  async logAccess(resourceType: string, resourceId: string): Promise<void> {
    await this.log({
      eventType: 'resource.access',
      resourceType,
      resourceId,
      action: 'read',
      outcome: 'success',
      userId: null, // Filled by context
    });
  }

  async logAuthEvent(eventType: string, outcome: 'success' | 'failure', metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      eventType,
      resourceType: 'auth',
      resourceId: 'session',
      action: 'create',
      outcome,
      metadata,
      userId: null,
    });
  }
}

// Log sensitive operations
class UserUseCase {
  constructor(
    private repo: UserRepository,
    private audit: AuditLogger
  ) {}

  async deleteUser(userId: UserId): Promise<Result<void, DomainError>> {
    const result = await this.repo.delete(userId);

    await this.audit.log({
      eventType: 'user.deleted',
      resourceType: 'user',
      resourceId: userId,
      action: 'delete',
      outcome: result.isOk() ? 'success' : 'failure',
      userId: null,
      metadata: result.isErr() ? { error: result.error.code } : undefined,
    });

    return result;
  }
}
```

---

## Rate Limiting

```typescript
// infrastructure/security/RateLimiter.ts
export interface RateLimitConfig {
  windowMs: number;      // Time window
  maxRequests: number;   // Max requests per window
  keyGenerator: (req: Request) => string;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }>;
}

export class RateLimiter {
  constructor(
    private config: RateLimitConfig,
    private store: RateLimitStore
  ) {}

  async check(request: Request): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(request);
    const { count, resetAt } = await this.store.increment(key, this.config.windowMs);

    const remaining = Math.max(0, this.config.maxRequests - count);
    const isAllowed = count <= this.config.maxRequests;

    return {
      isAllowed,
      remaining,
      resetAt,
      retryAfterSeconds: isAllowed ? 0 : Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    };
  }
}

export interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

// In-memory store (use Redis in production)
export class InMemoryRateLimitStore implements RateLimitStore {
  private windows = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }> {
    const now = Date.now();
    const existing = this.windows.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      this.windows.set(key, { count: 1, resetAt });
      return { count: 1, resetAt: new Date(resetAt) };
    }

    existing.count++;
    return { count: existing.count, resetAt: new Date(existing.resetAt) };
  }
}

// Multiple rate limit tiers
export const RateLimitConfigs = {
  api: { windowMs: 60000, maxRequests: 100 },      // 100/min
  auth: { windowMs: 300000, maxRequests: 5 },      // 5/5min (strict)
  upload: { windowMs: 3600000, maxRequests: 10 },  // 10/hour
};
```

---

## Security Checklist

| Category | Check |
|----------|-------|
| **Input** | All user input validated and sanitized |
| **Authentication** | Passwords hashed with modern algorithm (scrypt/argon2) |
| **Authentication** | Tokens stored securely (httpOnly cookies) |
| **Authentication** | Session timeout implemented |
| **Authorization** | Permission checks on every protected route |
| **Authorization** | Resource-level access control |
| **XSS** | Content-Security-Policy header set |
| **XSS** | User content escaped before rendering |
| **CSRF** | CSRF tokens on state-changing requests |
| **Injection** | Parameterized queries only |
| **Secrets** | No hardcoded credentials |
| **Secrets** | Secrets never logged |
| **Headers** | Security headers configured |
| **Audit** | Sensitive operations logged |
| **Rate Limit** | Rate limiting on auth endpoints |
