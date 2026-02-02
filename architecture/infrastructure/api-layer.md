# API Layer & Anti-Corruption

> **When to use**: Mapping between API responses and domain models, versioning APIs, creating DTOs, implementing anti-corruption layers.

## Core Concept

The API layer translates between external data formats and internal domain models. It prevents external changes from corrupting the domain.

---

## DTO Pattern

### Request/Response DTOs

```typescript
// api/dto/UserDTO.ts
export interface CreateUserRequestDTO {
  email: string;
  name: string;
  password: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isActive: boolean;
}

export interface UserListResponseDTO {
  users: UserResponseDTO[];
  pagination: PaginationDTO;
}

export interface PaginationDTO {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```

---

## Mapper Pattern

```typescript
// api/mappers/UserMapper.ts
export class UserMapper {
  static toDomain(dto: CreateUserRequestDTO): Result<CreateUserData, ValidationError> {
    const emailResult = Email.create(dto.email);
    if (emailResult.isErr()) return emailResult;

    return ok({
      email: emailResult.value,
      name: dto.name,
      password: dto.password,
    });
  }

  static toDTO(user: User): UserResponseDTO {
    return {
      id: user.id,
      email: user.email.toString(),
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      isActive: user.isActive(),
    };
  }

  static toListDTO(users: User[], pagination: PageInfo): UserListResponseDTO {
    return {
      users: users.map(UserMapper.toDTO),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.totalItems,
        totalPages: Math.ceil(pagination.totalItems / pagination.pageSize),
        hasNext: pagination.page < Math.ceil(pagination.totalItems / pagination.pageSize),
        hasPrevious: pagination.page > 1,
      },
    };
  }
}
```

---

## API Error Format

Consistent error responses across all endpoints:

```typescript
// api/dto/ErrorDTO.ts
export interface ApiErrorDTO {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
  requestId: string;
}

// api/mappers/ErrorMapper.ts
export class ErrorMapper {
  static toDTO(error: DomainError, request: Request): ApiErrorDTO {
    return {
      code: error.code,
      message: error.message,
      details: error instanceof ValidationError ? error.fieldErrors : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    };
  }

  static toHttpStatus(error: DomainError): number {
    return error.httpStatus ?? 500;
  }
}
```

---

## API Client (Frontend)

```typescript
// infrastructure/http/ApiClient.ts
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly defaultHeaders: Record<string, string> = {}
  ) {}

  async get<T>(path: string): Promise<Result<T, ApiError>> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<Result<T, ApiError>> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<Result<T, ApiError>> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<Result<T, ApiError>> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<Result<T, ApiError>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.defaultHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return err(new ApiError(errorData.code, errorData.message, response.status));
      }

      const data = await response.json();
      return ok(data as T);
    } catch (e) {
      return err(new ApiError('NETWORK_ERROR', 'Network request failed', 0));
    }
  }
}
```

---

## API Versioning Strategies

### URL Versioning

```typescript
// Most explicit, easiest to cache
const v1Client = new ApiClient('/api/v1');
const v2Client = new ApiClient('/api/v2');
```

### Header Versioning

```typescript
// Cleaner URLs, harder to test in browser
const client = new ApiClient('/api', {
  'Accept-Version': 'v2',
});
```

### Migration Pattern

```typescript
// api/versioning/UserDTOv1.ts
export interface UserDTOv1 {
  id: string;
  email: string;
  fullName: string;  // v1 used fullName
}

// api/versioning/UserDTOv2.ts
export interface UserDTOv2 {
  id: string;
  email: string;
  firstName: string;  // v2 split name fields
  lastName: string;
}

// Adapter for backwards compatibility
export function adaptV1ToV2(v1: UserDTOv1): UserDTOv2 {
  const [firstName, ...rest] = v1.fullName.split(' ');
  return {
    id: v1.id,
    email: v1.email,
    firstName,
    lastName: rest.join(' '),
  };
}
```

---

## Pagination Patterns

### Offset-Based

```typescript
interface OffsetPagination {
  page: number;
  pageSize: number;
}

// GET /api/users?page=2&pageSize=20
```

### Cursor-Based

```typescript
interface CursorPagination {
  cursor?: string;  // Opaque cursor from previous response
  limit: number;
}

interface CursorPageResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// GET /api/users?cursor=eyJpZCI6MTAwfQ&limit=20
```

| Aspect | Offset | Cursor |
|--------|--------|--------|
| Random access | ✓ Easy | ✗ Sequential only |
| Performance | Degrades on deep pages | Consistent |
| Real-time data | Items can shift | Stable iteration |
| Implementation | Simple | More complex |

---

## Anti-Corruption Layer

Protect domain from external API changes:

```typescript
// infrastructure/external/LegacyUserAdapter.ts
export class LegacyUserAdapter {
  constructor(private readonly legacyClient: LegacyApiClient) {}

  async getUser(id: UserId): Promise<Result<User, DomainError>> {
    // Fetch from legacy API with different format
    const legacyResponse = await this.legacyClient.fetchUser(id);

    if (legacyResponse.isErr()) {
      return err(this.mapLegacyError(legacyResponse.error));
    }

    // Transform legacy format to domain model
    return this.mapToDomain(legacyResponse.value);
  }

  private mapToDomain(legacy: LegacyUserResponse): Result<User, ValidationError> {
    // Legacy API uses different field names and formats
    return User.reconstitute({
      id: createUserId(legacy.user_id),
      email: Email.create(legacy.email_address).value,
      name: `${legacy.first_name} ${legacy.last_name}`,
      createdAt: new Date(legacy.created_timestamp * 1000),
    });
  }

  private mapLegacyError(error: LegacyError): DomainError {
    switch (error.code) {
      case 'USER_NOT_FOUND':
        return new EntityNotFoundError('User', error.user_id);
      default:
        return new ExternalServiceError(error.message);
    }
  }
}
```
