# @fe-libs/fetch-api-client

A lightweight, framework-agnostic HTTP client built on the native **Fetch API** — no Axios, no heavy dependencies.

## Support
If this library helped you, you can buy me a coffee:
☕️ https://buymeacoffee.com/il421

## Navigation

- [Why?](#why)
- [Requirements](#requirements)
- [Installation](#installation)
- [Module Formats](#module-formats)
  - [ESM](#esm)
  - [CommonJS](#commonjs)
- [Quick Start](#quick-start)
  - [Quick Start (CommonJS)](#quick-start-commonjs)
  - [Usage suggestion](#usage-suggestion-not-required)
- [API Reference](#api-reference)
  - [FetchApiClient](#fetchapiclient)
  - [HTTP Methods](#http-methods)
  - [Middleware](#middleware)
  - [Error Handling](#error-handling)
  - [Logger](#logger)
- [Framework Examples](#framework-examples)
  - [React](#react)
  - [Angular](#angular)
  - [Vue](#vue)
- [License](#license)

## Why?

Most HTTP clients either lock you into a specific framework, bundle unnecessary weight,
or lack a clean way to intercept requests and responses. This library gives you:

- 🔗 **Composable middleware pipeline** — chain request and response interceptors
  with separate `onFulfilled` / `onRejected` hooks, just like Axios interceptors
  but on top of native Fetch.

- 🔑 **Built-in auth** — an included `AuthorizationMiddleware` injects Bearer tokens
  from an async provider, with an opt-out header for public endpoints.

- 🏗️ **Multi-API schema** — real-world applications rarely talk to a single API.
  You may have multiple API gateways (e.g. a customer-facing gateway and an
  internal admin gateway) each exposing several microservices behind different
  base paths.

- 🧩 **Per-endpoint middleware overrides** — append extra middlewares for specific
  endpoints without affecting the rest.

- ⚡ **Zero framework coupling** — works with React, Angular, Vue, Node.js 18+,
  Deno, Bun, and any runtime that supports the Fetch API.

- 📦 **Tiny footprint** — ships with both ESM and CommonJS entry points and minimal dependencies.

## Requirements

- **Runtime**: Node.js 18+, Deno, Bun, or any browser/runtime with native [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) support
- **TypeScript**: 4.7+ (works for both ESM and CommonJS consumers; `"moduleResolution": "bundler"`, `"node16"`, or `"nodenext"` recommended)

## Installation

```bash
npm install @fe-libs/fetch-api-client
# or
pnpm add @fe-libs/fetch-api-client
# or
yarn add @fe-libs/fetch-api-client
```

## Module Formats

This package exposes both **ESM** and **CommonJS** entry points via the package root.
Use the package name (`@fe-libs/fetch-api-client`) rather than importing files from `dist` directly.

### ESM

```typescript
import { FetchApiClient } from '@fe-libs/fetch-api-client';
import type { IFetchApiClientEntity } from '@fe-libs/fetch-api-client';
```

### CommonJS

```javascript
const { FetchApiClient } = require('@fe-libs/fetch-api-client');
```

> The package uses named exports. There is no default export.

## Quick Start

Define your API schema and create a client instance:

```typescript
import { FetchApiClient } from '@fe-libs/fetch-api-client';
import type { IFetchApiClientEntity } from '@fe-libs/fetch-api-client';

interface ApiSchema {
  users: IFetchApiClientEntity;
  products: IFetchApiClientEntity;
}

const client = new FetchApiClient<ApiSchema>(
  {
    users: { baseURL: 'https://api.example.com/users' },
    products: { baseURL: 'https://api.example.com/products' },
  },
  undefined,
  {
    getAccessToken: async () => localStorage.getItem('token') ?? undefined,
  }
);

export const api = client.initialize();

// Use it anywhere — inline
const { data: users } = await api.users.get<User[]>('/list');
const { data: user } = await api.users.post<User>('/', { name: 'Alice' });
```

### Quick Start (CommonJS)

```javascript
const { FetchApiClient } = require('@fe-libs/fetch-api-client');

const client = new FetchApiClient(
  {
    users: { baseURL: 'https://api.example.com/users' },
    products: { baseURL: 'https://api.example.com/products' },
  },
  undefined,
  {
    getAccessToken: async () => process.env.ACCESS_TOKEN,
  }
);

const api = client.initialize();

async function main() {
  const { data: users } = await api.users.get('/list');
  console.log(users);
}

main().catch(console.error);
```

### Usage suggestion (not required)

For larger codebases, wrapping each endpoint in a dedicated class keeps call sites
clean and co-locates the resource's methods, DTOs, and path logic.
Inline usage (as shown above) works equally well.

```typescript
// api/users.api.ts
import type { IFetchApiClientEntity } from '@fe-libs/fetch-api-client';

export interface UserDto {
  id: string;
  name: string;
  email: string;
}

export class UsersApi {
  constructor(private readonly api: IFetchApiClientEntity) {}

  getUser = async (id: string): Promise<UserDto> => {
    const { data } = await this.api.get<UserDto>(`/${id}`);
    return data;
  };

  listUsers = async (): Promise<UserDto[]> => {
    const { data } = await this.api.get<UserDto[]>('/');
    return data;
  };

  createUser = async (payload: Omit<UserDto, 'id'>): Promise<UserDto> => {
    const { data } = await this.api.post<UserDto>('/', payload);
    return data;
  };

  updateUser = async (id: string, payload: Partial<Omit<UserDto, 'id'>>): Promise<UserDto> => {
    const { data } = await this.api.patch<UserDto>(`/${id}`, payload);
    return data;
  };

  deleteUser = async (id: string): Promise<void> => {
    await this.api.delete(`/${id}`);
  };
}

// api/index.ts — compose with the initialized client
import { api } from './client';
import { UsersApi } from './users.api';

export const usersApi = new UsersApi(api.users);
```

---

## API Reference

### `FetchApiClient`

The main class. Extends `FetchApiClientBase` and automatically wires
`AuthorizationMiddleware` (request) and `DefaultExceptionFilterMiddleware` (response).

#### Constructor

```typescript
new FetchApiClient<ApiSchema>(
  endpoints: FetchApiEndpointsConfig,
  middlewares?: FetchApiClientHelperMiddlewares,
  options?: FetchApiClientHelperOptions
)
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `endpoints` | yes | Map of named endpoint configs (`baseURL` + optional per-endpoint middleware) |
| `middlewares` | no | Global request/response middleware applied to **all** endpoints |
| `options` | no | Auth token provider, trace ID, custom logger |

#### `endpoints: FetchApiEndpointsConfig`

```typescript
type FetchApiEndpointsConfig = {
  [key: string]: {
    baseURL: string;
    overrideMiddlewares?: FetchApiClientHelperMiddlewares;
  };
};
```

Each key becomes a property on the object returned by `initialize()`.
`overrideMiddlewares` appends to the global middlewares for that endpoint only.

#### `middlewares: FetchApiClientHelperMiddlewares`

```typescript
interface FetchApiClientHelperMiddlewares {
  request?: IMiddleware<FetchApiClientRequest>[];
  respond?: IMiddleware<FetchApiClientResponse<any>>[];
}
```

Global middleware pipeline. `request` middlewares run before every fetch;
`respond` middlewares run on every response (2xx and errors alike).
`AuthorizationMiddleware` and `DefaultExceptionFilterMiddleware` are prepended
automatically — you cannot remove them via this constructor.

#### `options: FetchApiClientHelperOptions`

```typescript
interface FetchApiClientHelperOptions {
  getAccessToken: () => Promise<string | undefined>; // required
  noAuthHeader?: string;
  traceId?: string;
  logger?: ILogger;
}
```

| Option | Description |
|--------|-------------|
| `getAccessToken` | Async function called on every request. Return `undefined` to skip the `Authorization` header. |
| `noAuthHeader` | A sentinel header name. If present on a request, the `Authorization` header is **not** injected and the sentinel header is stripped. Useful for public endpoints. |
| `traceId` | Included in all thrown `FetchApiError` instances for distributed tracing. |
| `logger` | Custom logger implementing `ILogger`. Defaults to the built-in `Logger`. |

#### `initialize(): ApiSchema`

Builds and returns the typed API object. Call once and export the result.

```typescript
const api = new FetchApiClient<ApiSchema>(endpoints, middlewares, options).initialize();
// api.users.get(...)  api.products.post(...)
```

---

### HTTP Methods

Every endpoint entry exposes the following methods, all returning
`Promise<FetchApiClientResponse<T>>`.

```typescript
interface IFetchApiClientEntity {
  get<T>(url: string, config?: WithParams<FetchApiClientEntityConfig>): Promise<FetchApiClientResponse<T>>;
  post<T>(url: string, data?: any, config?: FetchApiClientEntityConfig): Promise<FetchApiClientResponse<T>>;
  put<T>(url: string, data?: any, config?: FetchApiClientEntityConfig): Promise<FetchApiClientResponse<T>>;
  patch<T>(url: string, data?: any, config?: FetchApiClientEntityConfig): Promise<FetchApiClientResponse<T>>;
  delete<T>(url: string, config?: FetchApiClientEntityConfig): Promise<FetchApiClientResponse<T>>;
}

type FetchApiClientEntityConfig = Omit<RequestInit, 'method' | 'body'>;
type WithParams<T> = T & { params?: Record<string, any> };
```

`get` accepts a `params` object that is serialized into the query string.

#### Response shape

```typescript
type FetchApiClientResponse<T> = {
  data: T;
  status: number;
  statusText: string;
  config: FetchApiClientRequest;
};
```

---

### Middleware

#### `IMiddleware<T>`

```typescript
interface IMiddleware<T> {
  onFulfilled?: (data: T) => T | Promise<T>;
  onRejected?: (data: T) => T;
}
```

- `onFulfilled` — called on the happy path (valid request config or 2xx response).
- `onRejected` — called when the previous middleware threw or a response is non-2xx.

#### Built-in: `AuthorizationMiddleware`

Auto-wired as the **first** request middleware by `FetchApiClient`.
Calls `getAccessToken()` on every request and injects `Authorization: Bearer <token>`.

**Opt out for specific requests** using `noAuthHeader`:

```typescript
const client = new FetchApiClient<ApiSchema>(endpoints, undefined, {
  getAccessToken: async () => getToken(),
  noAuthHeader: 'x-no-auth',
});

const api = client.initialize();

// This request will NOT have an Authorization header
api.public.get('/health', { headers: { 'x-no-auth': '1' } });
```

#### Built-in: `DefaultExceptionFilterMiddleware`

Auto-wired as the **first** response middleware by `FetchApiClient`.
Throws a `FetchApiError` for every non-2xx response, carrying `httpStatusCode`, `detail` (raw response body), `url`, and `traceId`.

#### Custom Middleware

Implement `IMiddleware<FetchApiClientRequest>` for request middleware or
`IMiddleware<FetchApiClientResponse<any>>` for response middleware.

```typescript
// middleware/correlation-id.middleware.ts
import type { IMiddleware, FetchApiClientRequest } from '@fe-libs/fetch-api-client';

export class CorrelationIdMiddleware implements IMiddleware<FetchApiClientRequest> {
  onFulfilled = (config: FetchApiClientRequest): FetchApiClientRequest => ({
    ...config,
    headers: {
      ...(config.headers as Record<string, string>),
      'x-correlation-id': crypto.randomUUID(),
    },
  });
}

// middleware/error-log.middleware.ts
import type { IMiddleware, FetchApiClientResponse } from '@fe-libs/fetch-api-client';
import type { ILogger } from '@fe-libs/fetch-api-client';

export class ErrorLogMiddleware implements IMiddleware<FetchApiClientResponse<any>> {
  constructor(private readonly logger: ILogger) {}

  onRejected = (res: FetchApiClientResponse<any>): FetchApiClientResponse<any> => {
    this.logger.error(`HTTP ${res.status} — ${res.config.url}`, new Error(res.statusText));
    return res;
  };
}

const client = new FetchApiClient<ApiSchema>(
  endpoints,
  {
    request: [new CorrelationIdMiddleware()],
    respond: [new ErrorLogMiddleware(logger)],
  },
  options
);
```

#### Per-endpoint Middleware Override

Use `overrideMiddlewares` to append extra middlewares for a single endpoint
without affecting others:

```typescript
const client = new FetchApiClient<ApiSchema>(
  {
    public: { baseURL: 'https://api.example.com/public' },
    admin: {
      baseURL: 'https://api.example.com/admin',
      overrideMiddlewares: {
        request: [adminAuditMiddleware],  // appended after global request middlewares
      },
    },
  },
  { request: [correlationMiddleware] },
  options
);
```

---

### Error Handling

`DefaultExceptionFilterMiddleware` throws a `FetchApiError` for every non-2xx response.
Catch it by status code or use `FetchApiError.isFetchApError` to narrow the type:

```typescript
import { FetchApiError } from '@fe-libs/fetch-api-client';

try {
  const { data } = await api.users.get<User>('/123');
} catch (err) {
  if (FetchApiError.isFetchApError(err)) {
    console.error(err.httpStatusCode, err.detail, err.url, err.traceId);
  } else {
    throw err;
  }
}
```

#### `FetchApiError` properties

```typescript
class FetchApiError extends Error {
  httpStatusCode?: number | string;
  detail?: unknown;    // raw response body
  url?: string;        // request URL
  traceId?: string;    // from FetchApiClientHelperOptions.traceId

  static isFetchApError(error: unknown): error is FetchApiError;
  static getErrorDetails<Details>(details: Details): string | undefined;
}
```

#### Custom semantic error classes

`FetchApiError` is exported so you can build a typed error hierarchy for your domain.
Extend it for each HTTP status your app cares about:

```typescript
// errors/api-errors.ts
import { FetchApiError } from '@fe-libs/fetch-api-client';

export class NotFoundError<D = unknown> extends FetchApiError<D> {
  constructor(detail?: D, url?: string, traceId?: string) {
    super(404, 'Not Found', detail, url, traceId);
    this.name = 'NotFoundError';
  }
}

export class AuthorisationError<D = unknown> extends FetchApiError<D> {
  constructor(status: 401 | 403, detail?: D, url?: string, traceId?: string) {
    super(status, 'Unauthorised', detail, url, traceId);
    this.name = 'AuthorisationError';
  }
}

export class ValidationError<D = unknown> extends FetchApiError<D> {
  constructor(detail?: D, url?: string, traceId?: string) {
    super(400, 'Bad Request', detail, url, traceId);
    this.name = 'ValidationError';
  }
}

export class ServerError<D = unknown> extends FetchApiError<D> {
  constructor(status: number, detail?: D, url?: string, traceId?: string) {
    super(status, 'Internal Server Error', detail, url, traceId);
    this.name = 'ServerError';
  }
}
```

#### Custom `ExceptionFilterMiddleware`

Replace (or extend) the built-in middleware by implementing `IMiddleware<FetchApiClientResponse<any>>`:

```typescript
// middleware/exception-filter.middleware.ts
import {
  FetchApiError,
  type IMiddleware,
  type FetchApiClientResponse,
} from '@fe-libs/fetch-api-client';
import {
  NotFoundError,
  AuthorisationError,
  ValidationError,
  ServerError,
} from '../errors/api-errors';

export class ExceptionFilterMiddleware implements IMiddleware<FetchApiClientResponse<any>> {
  constructor(private readonly traceId?: string) {}

  onRejected = (res: FetchApiClientResponse<any>): never => {
    const { status, data, config } = res;
    const url = config.url;

    if (status === 404) throw new NotFoundError(data, url, this.traceId);
    if (status === 400) throw new ValidationError(data, url, this.traceId);
    if (status === 401 || status === 403) throw new AuthorisationError(status, data, url, this.traceId);
    if (status >= 500) throw new ServerError(status, data, url, this.traceId);

    throw new FetchApiError(status, res.statusText, data, url, this.traceId);
  };
}
```

Wire it up instead of (or after) the default one:

```typescript
import { FetchApiClientBase } from '@fe-libs/fetch-api-client';
import { ExceptionFilterMiddleware } from './middleware/exception-filter.middleware';

// Use FetchApiClientBase directly to skip the auto-wired DefaultExceptionFilterMiddleware
const client = new FetchApiClientBase<ApiSchema>(endpoints, {
  respond: [new ExceptionFilterMiddleware(traceId)],
});

export const api = client.initialize();
```

Then catch with precise `instanceof` checks:

```typescript
import { NotFoundError, AuthorisationError, ValidationError } from './errors/api-errors';
import { FetchApiError } from '@fe-libs/fetch-api-client';

try {
  const data = await usersApi.getUser('123');
} catch (err) {
  if (err instanceof NotFoundError) {
    showNotFound();
  } else if (err instanceof AuthorisationError) {
    redirectToLogin();
  } else if (err instanceof ValidationError) {
    showValidationErrors(err.detail);
  } else if (FetchApiError.isFetchApError(err)) {
    showToast(`Error ${err.httpStatusCode}`);
  } else {
    throw err;
  }
}
```

---

### Logger

Pass a custom logger via `options.logger` to integrate with your logging infrastructure:

```typescript
import type { ILogger } from '@fe-libs/fetch-api-client';

const logger: ILogger = {
  info: (msg, ...args) => myLogger.info(msg, ...args),
  warn: (msg, ...args) => myLogger.warn(msg, ...args),
  debug: (msg, ...args) => myLogger.debug(msg, ...args),
  error: (msg, error, ...args) => myLogger.error(msg, error, ...args),
};

const client = new FetchApiClient<ApiSchema>(endpoints, undefined, {
  getAccessToken,
  logger,
});
```

---

## Framework Examples

### React

Use the client in a custom hook with `useState` and `useEffect`.
The example below uses the optional `UsersApi` class — inline calls to `api.users.*` work just as well.

```tsx
// hooks/useUsers.ts
import { useState, useEffect } from 'react';
import { FetchApiError } from '@fe-libs/fetch-api-client';
import { usersApi } from '../api';
import type { UserDto } from '../api/users.api';

export function useUsers() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    usersApi
      .listUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(FetchApiError.isFetchApError(err) ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading, error };
}

// components/UserList.tsx
import { useUsers } from '../hooks/useUsers';

export function UserList() {
  const { users, loading, error } = useUsers();

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

---

### Angular

Wrap the client in an injectable service and consume it in a component.
The example below uses the optional `UsersApi` class — calling `apiClient.users.*` inline inside the service works just as well.

```typescript
// api.client.ts
import { FetchApiClient } from '@fe-libs/fetch-api-client';
import type { IFetchApiClientEntity } from '@fe-libs/fetch-api-client';
import { UsersApi } from './users.api';

interface ApiSchema {
  users: IFetchApiClientEntity;
  products: IFetchApiClientEntity;
}

const apiClient = new FetchApiClient<ApiSchema>(
  {
    users: { baseURL: 'https://api.example.com/users' },
    products: { baseURL: 'https://api.example.com/products' },
  },
  undefined,
  { getAccessToken: async () => sessionStorage.getItem('token') ?? undefined }
).initialize();

export const usersApi = new UsersApi(apiClient.users);

// services/user.service.ts
import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { usersApi } from '../api.client';
import type { UserDto } from '../api/users.api';

@Injectable({ providedIn: 'root' })
export class UserService {
  listUsers() {
    return from(usersApi.listUsers());
  }

  getUser(id: string) {
    return from(usersApi.getUser(id));
  }

  createUser(payload: Omit<UserDto, 'id'>) {
    return from(usersApi.createUser(payload));
  }
}

// components/user-list.component.ts
import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { UserService } from '../services/user.service';
import type { UserDto } from '../api/users.api';
import { Observable, catchError, of } from 'rxjs';
import { FetchApiError } from '@fe-libs/fetch-api-client';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    @if (users$ | async; as users) {
      <ul>
        @for (user of users; track user.id) {
          <li>{{ user.name }}</li>
        }
      </ul>
    }
  `,
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  users$!: Observable<UserDto[]>;

  ngOnInit() {
    this.users$ = this.userService.listUsers().pipe(
      catchError((err) => {
        console.error(FetchApiError.isFetchApError(err) ? `HTTP ${err.httpStatusCode}` : err.message);
        return of([]);
      }),
    );
  }
}
```

---

### Vue

Use the client inside a composable with Vue's Composition API.
The example below uses the optional `UsersApi` class — calling `api.users.*` inline works just as well.

```typescript
// composables/useUsers.ts
import { ref, onMounted } from 'vue';
import { FetchApiError } from '@fe-libs/fetch-api-client';
import { usersApi } from '../api';
import type { UserDto } from '../api/users.api';

export function useUsers() {
  const users = ref<UserDto[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  onMounted(async () => {
    try {
      users.value = await usersApi.listUsers();
    } catch (err) {
      error.value = FetchApiError.isFetchApError(err) ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  });

  return { users, loading, error };
}
```

```vue
<!-- components/UserList.vue -->
<script setup lang="ts">
import { useUsers } from '../composables/useUsers';

const { users, loading, error } = useUsers();
</script>

<template>
  <p v-if="loading">Loading…</p>
  <p v-else-if="error">Error: {{ error }}</p>
  <ul v-else>
    <li v-for="user in users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

#### Alternative: `provide` / `inject`

Use this pattern when you want to share a single `api` instance across a subtree
without prop-drilling or importing a module singleton. Ideal for micro-frontends,
feature shells, or testing (swap the provided instance in specs).
The example below uses the optional `UsersApi` class — injecting raw `api.users` inline works just as well.

```typescript
// plugins/api.plugin.ts
import { type App, type InjectionKey } from 'vue';
import { FetchApiClient } from '@fe-libs/fetch-api-client';
import type { IFetchApiClientEntity } from '@fe-libs/fetch-api-client';
import { UsersApi } from '../api/users.api';

interface ApiSchema {
  users: IFetchApiClientEntity;
  products: IFetchApiClientEntity;
}

export interface AppApi {
  users: UsersApi;
}

export const ApiKey: InjectionKey<AppApi> = Symbol('api');

export const apiPlugin = {
  install(app: App) {
    const raw = new FetchApiClient<ApiSchema>(
      {
        users: { baseURL: 'https://api.example.com/users' },
        products: { baseURL: 'https://api.example.com/products' },
      },
      undefined,
      { getAccessToken: async () => localStorage.getItem('token') ?? undefined }
    ).initialize();

    app.provide(ApiKey, { users: new UsersApi(raw.users) });
  },
};
```

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { apiPlugin } from './plugins/api.plugin';

createApp(App).use(apiPlugin).mount('#app');
```

```typescript
// composables/useUsers.ts
import { ref, onMounted, inject } from 'vue';
import { FetchApiError } from '@fe-libs/fetch-api-client';
import { ApiKey } from '../plugins/api.plugin';
import type { UserDto } from '../api/users.api';

export function useUsers() {
  const api = inject(ApiKey);
  if (!api) throw new Error('useUsers must be used inside a component tree where apiPlugin is installed');

  const users = ref<UserDto[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);

  onMounted(async () => {
    try {
      users.value = await api.users.listUsers();
    } catch (err) {
      error.value = FetchApiError.isFetchApError(err) ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  });

  return { users, loading, error };
}
```

```vue
<!-- components/UserList.vue — unchanged; the composable handles injection -->
<script setup lang="ts">
import { useUsers } from '../composables/useUsers';

const { users, loading, error } = useUsers();
</script>

<template>
  <p v-if="loading">Loading…</p>
  <p v-else-if="error">Error: {{ error }}</p>
  <ul v-else>
    <li v-for="user in users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

**Testing** — swap the real `UsersApi` with a mock by providing a different value:

```typescript
// UserList.spec.ts
import { mount } from '@vue/test-utils';
import { ApiKey } from '../plugins/api.plugin';
import UserList from '../components/UserList.vue';

const mockApi = {
  users: {
    listUsers: vi.fn().mockResolvedValue([{ id: '1', name: 'Alice', email: 'alice@example.com' }]),
  },
};

mount(UserList, {
  global: { provide: { [ApiKey as symbol]: mockApi } },
});
```

---

## License

MIT
