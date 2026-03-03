# @drunkcod/express-async

Modern, high-performance, and type-safe helpers for Express async life. Designed for Node.js 22.10.0+

## Features

- **Closure-Free Execution**: Optimized for high-throughput environments by avoiding per-request arrow function creation.
- **Type-Safe Autocomplete**: Full TypeScript support for request parameters, response types, and class-based controllers.
- **Async/Sync Unification**: Automatically catches both synchronous throws and Promise rejections.
- **Flexible Binders**: Simplifies route definitions for both singleton and per-request class-based controllers.
- **Modern Standards**: Leverages `Promise.try`, `Reflect.apply`, and `Awaited<T>`.

## Requirements

- **Node.js**: `^22.10.0` (for native `Promise.try` support)
- **TypeScript**: `^5.6.0` (for `Promise.try` definitions)

## Installation

```bash
npm install @drunkcod/express-async
```

## Quick Start

### Basic Usage

Use `asyncHandler` to wrap your standard async functions. No more `try/catch` boilerplate.

```typescript
import { asyncHandler } from '@drunkcod/express-async';

app.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await db.users.get(req.params.id);
    res.json(user);
  }),
);
```

### Class-Based Controllers (Singleton)

Use `AsyncBinder` to bind your class methods while maintaining `this` context and full type safety.

```typescript
import { AsyncBinder } from '@drunkcod/express-async';

class UserController {
  async list(req: Request, res: Response) {
    res.json(await db.users.all());
  }
}

const controller = new UserController();
const bind = AsyncBinder.for(controller);

app.get('/users', bind('list'));
```

### Per-Request Controllers (Dependency Injection)

Use `controllerHandler` or `ControllerBinder` to instantiate your controller on every request. Supports both synchronous and asynchronous factories.

```typescript
import { controllerHandler } from '@drunkcod/express-async';

class UserController {
  constructor(
    private req: Request,
    private res: Response,
  ) {}

  async getProfile() {
    return { user: this.req.user };
  }
}

// The factory receives (req, res)
app.get(
  '/profile',
  controllerHandler((req, res) => new UserController(req, res), UserController.prototype.getProfile),
);
```

## Advanced Patterns

### Explicit Error Handling

Avoid arity detection pitfalls by using `asyncErrorHandler` for your custom error middleware.

```typescript
import { asyncErrorHandler } from '@drunkcod/express-async';

app.use(
  asyncErrorHandler(async (err, req, res, next) => {
    await log.error(err);
    res.status(500).send('Internal Server Error');
  }),
);
```

## License

MIT
